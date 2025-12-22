const { poolWrapper } = require('../database-schema');

class EventTracker {
  constructor() {
    this.pool = poolWrapper;
    this.validEventTypes = [
      'screen_view',
      'screen_exit',
      'product_view',
      'add_to_cart',
      'remove_from_cart',
      'purchase',
      'search',
      'filter',
      'click',
      'scroll',
      'error',
      'performance'
    ];
  }

  /**
   * Tek bir event kaydet
   */
  async trackEvent(eventData) {
    try {
      const {
        tenantId,
        userId,
        deviceId,
        sessionId,
        eventType,
        screenName,
        properties,
        timestamp
      } = eventData;

      // Validation
      if (!deviceId || !sessionId || !eventType) {
        throw new Error('deviceId, sessionId ve eventType zorunludur');
      }

      if (!this.validEventTypes.includes(eventType)) {
        console.warn(`⚠️ Geçersiz eventType: ${eventType}`);
      }

      // Tenant ID'yi belirle
      let finalTenantId = tenantId || 1;
      if (userId && !tenantId) {
        try {
          const [users] = await this.pool.execute(
            'SELECT tenantId FROM users WHERE id = ?',
            [userId]
          );
          if (users.length > 0) {
            finalTenantId = users[0].tenantId;
          }
        } catch (e) {
          console.warn('⚠️ Error getting user tenantId:', e.message);
        }
      }

      // Timestamp'i hazırla
      const eventTimestamp = timestamp 
        ? new Date(timestamp).toISOString().slice(0, 23).replace('T', ' ')
        : new Date().toISOString().slice(0, 23).replace('T', ' ');

      // Event'i kaydet
      const [result] = await this.pool.execute(`
        INSERT INTO user_events 
        (tenantId, userId, deviceId, sessionId, eventType, screenName, properties, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        finalTenantId,
        userId || null,
        deviceId,
        sessionId,
        eventType,
        screenName || null,
        JSON.stringify(properties || {}),
        eventTimestamp
      ]);

      return {
        success: true,
        eventId: result.insertId
      };
    } catch (error) {
      console.error('❌ Error tracking event:', error);
      throw error;
    }
  }

  /**
   * Toplu event kaydetme (batch processing)
   */
  async trackBatch(events) {
    try {
      if (!Array.isArray(events) || events.length === 0) {
        throw new Error('Events array gerekli ve boş olamaz');
      }

      const results = [];
      const errors = [];

      // Her event'i sırayla işle (transaction için)
      for (const event of events) {
        try {
          const result = await this.trackEvent(event);
          results.push(result);
        } catch (error) {
          errors.push({
            event,
            error: error.message
          });
        }
      }

      return {
        success: true,
        processed: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('❌ Error tracking batch events:', error);
      throw error;
    }
  }

  /**
   * Session başlat
   */
  async startSession(sessionData) {
    try {
      const {
        tenantId,
        userId,
        deviceId,
        sessionId,
        metadata
      } = sessionData;

      if (!deviceId || !sessionId) {
        throw new Error('deviceId ve sessionId zorunludur');
      }

      // Tenant ID'yi belirle
      let finalTenantId = tenantId || 1;
      if (userId && !tenantId) {
        try {
          const [users] = await this.pool.execute(
            'SELECT tenantId FROM users WHERE id = ?',
            [userId]
          );
          if (users.length > 0) {
            finalTenantId = users[0].tenantId;
          }
        } catch (e) {
          console.warn('⚠️ Error getting user tenantId:', e.message);
        }
      }

      // Session'ı kaydet veya güncelle
      await this.pool.execute(`
        INSERT INTO user_sessions_v2 
        (tenantId, userId, deviceId, sessionId, startTime, metadata)
        VALUES (?, ?, ?, ?, NOW(3), ?)
        ON DUPLICATE KEY UPDATE 
          startTime = NOW(3),
          metadata = VALUES(metadata)
      `, [
        finalTenantId,
        userId || null,
        deviceId,
        sessionId,
        JSON.stringify(metadata || {})
      ]);

      return {
        success: true,
        sessionId
      };
    } catch (error) {
      console.error('❌ Error starting session:', error);
      throw error;
    }
  }

  /**
   * Session bitir
   */
  async endSession(sessionData) {
    try {
      const {
        sessionId,
        duration,
        eventCount,
        metadata
      } = sessionData;

      if (!sessionId) {
        throw new Error('sessionId zorunludur');
      }

      // Session'ı güncelle
      const [result] = await this.pool.execute(`
        UPDATE user_sessions_v2 
        SET endTime = NOW(3),
            duration = ?,
            eventCount = ?,
            metadata = JSON_MERGE_PATCH(COALESCE(metadata, '{}'), ?)
        WHERE sessionId = ?
      `, [
        duration || null,
        eventCount || 0,
        JSON.stringify(metadata || {}),
        sessionId
      ]);

      if (result.affectedRows === 0) {
        throw new Error('Session bulunamadı');
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error ending session:', error);
      throw error;
    }
  }

  /**
   * Session event sayısını güncelle
   */
  async incrementSessionEventCount(sessionId) {
    try {
      await this.pool.execute(`
        UPDATE user_sessions_v2 
        SET eventCount = eventCount + 1
        WHERE sessionId = ?
      `, [sessionId]);
    } catch (error) {
      // Sessizce devam et, kritik değil
      console.warn('⚠️ Error incrementing session event count:', error.message);
    }
  }

  /**
   * Eski event'leri temizle (90 günden eski)
   */
  async cleanupOldEvents(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

      const [result] = await this.pool.execute(`
        DELETE FROM user_events 
        WHERE timestamp < ?
      `, [cutoffDateStr]);

      console.log(`✅ Cleaned up ${result.affectedRows} old events (older than ${daysToKeep} days)`);
      
      return {
        success: true,
        deletedCount: result.affectedRows
      };
    } catch (error) {
      console.error('❌ Error cleaning up old events:', error);
      throw error;
    }
  }

  /**
   * Eski session'ları temizle (90 günden eski)
   */
  async cleanupOldSessions(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

      const [result] = await this.pool.execute(`
        DELETE FROM user_sessions_v2 
        WHERE startTime < ? AND endTime IS NOT NULL
      `, [cutoffDateStr]);

      console.log(`✅ Cleaned up ${result.affectedRows} old sessions (older than ${daysToKeep} days)`);
      
      return {
        success: true,
        deletedCount: result.affectedRows
      };
    } catch (error) {
      console.error('❌ Error cleaning up old sessions:', error);
      throw error;
    }
  }
}

module.exports = EventTracker;



