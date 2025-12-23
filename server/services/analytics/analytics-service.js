const crypto = require('crypto');

/**
 * Analytics Service - Merkezi analitik servisi
 * Event kaydetme, metrik hesaplama, session yönetimi, funnel ve cohort analizi
 */
class AnalyticsService {
  constructor(poolWrapper) {
    this.pool = poolWrapper;
  }

  /**
   * Event kaydetme
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
        productId,
        categoryId,
        orderId,
        amount,
        searchQuery,
        errorMessage,
        performanceMetrics,
        ipAddress,
        userAgent,
        timestamp
      } = eventData;

      // Validation
      if (!tenantId || !deviceId || !sessionId || !eventType) {
        throw new Error('Missing required fields: tenantId, deviceId, sessionId, eventType');
      }

      // Event type validation
    const validEventTypes = [
      'screen_view', 'product_view', 'add_to_cart', 'remove_from_cart',
      'purchase', 'search', 'click', 'scroll', 'error', 'performance', 'checkout_start', 'custom'
    ];
      if (!validEventTypes.includes(eventType)) {
        throw new Error(`Invalid eventType: ${eventType}`);
      }

      const [result] = await this.pool.execute(
        `INSERT INTO analytics_events (
          tenantId, userId, deviceId, sessionId, eventType, screenName,
          properties, productId, categoryId, orderId, amount, searchQuery,
          errorMessage, performanceMetrics, ipAddress, userAgent, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          userId || null,
          deviceId,
          sessionId,
          eventType,
          screenName || null,
          properties ? JSON.stringify(properties) : null,
          productId || null,
          categoryId || null,
          orderId || null,
          amount || null,
          searchQuery || null,
          errorMessage || null,
          performanceMetrics ? JSON.stringify(performanceMetrics) : null,
          ipAddress || null,
          userAgent || null,
          timestamp || new Date()
        ]
      );

      return {
        success: true,
        eventId: result.insertId
      };
    } catch (error) {
      console.error('❌ Analytics Service: Error tracking event:', error);
      throw error;
    }
  }

  /**
   * Batch event kaydetme
   */
  async trackEvents(events) {
    try {
      const results = [];
      for (const event of events) {
        try {
          const result = await this.trackEvent(event);
          results.push({ success: true, eventId: result.eventId });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }
      return { results };
    } catch (error) {
      console.error('❌ Analytics Service: Error tracking batch events:', error);
      throw error;
    }
  }

  /**
   * Session başlatma
   */
  async startSession(sessionData) {
    try {
      const {
        tenantId,
        userId,
        deviceId,
        sessionId,
        deviceInfo,
        ipAddress,
        userAgent,
        referrer,
        country,
        city
      } = sessionData;

      if (!tenantId || !deviceId || !sessionId) {
        throw new Error('Missing required fields: tenantId, deviceId, sessionId');
      }

      const sessionStart = new Date();

      await this.pool.execute(
        `INSERT INTO analytics_sessions (
          id, tenantId, userId, deviceId, sessionStart, deviceInfo,
          ipAddress, userAgent, referrer, country, city, isActive, lastActivity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?)
        ON DUPLICATE KEY UPDATE
          lastActivity = VALUES(lastActivity),
          isActive = true`,
        [
          sessionId,
          tenantId,
          userId || null,
          deviceId,
          sessionStart,
          deviceInfo ? JSON.stringify(deviceInfo) : null,
          ipAddress || null,
          userAgent || null,
          referrer || null,
          country || null,
          city || null,
          sessionStart
        ]
      );

      return { success: true, sessionId, sessionStart };
    } catch (error) {
      console.error('❌ Analytics Service: Error starting session:', error);
      throw error;
    }
  }

  /**
   * Session bitirme
   */
  async endSession(sessionId, tenantId, conversionData = null) {
    try {
      const sessionEnd = new Date();

      // Session bilgilerini al
      const [sessions] = await this.pool.execute(
        `SELECT sessionStart, userId FROM analytics_sessions 
         WHERE id = ? AND tenantId = ?`,
        [sessionId, tenantId]
      );

      if (sessions.length === 0) {
        throw new Error('Session not found');
      }

      const session = sessions[0];
      const duration = Math.floor((sessionEnd - new Date(session.sessionStart)) / 1000);

      // Event sayısını hesapla
      const [eventCount] = await this.pool.execute(
        `SELECT COUNT(*) as count FROM analytics_events 
         WHERE sessionId = ? AND tenantId = ?`,
        [sessionId, tenantId]
      );

      const eventsCount = eventCount[0]?.count || 0;

      // Page view sayısını hesapla
      const [pageViews] = await this.pool.execute(
        `SELECT COUNT(DISTINCT screenName) as count FROM analytics_events 
         WHERE sessionId = ? AND tenantId = ? AND eventType = 'screen_view'`,
        [sessionId, tenantId]
      );

      const pageViewsCount = pageViews[0]?.count || 0;

      // Conversion bilgileri
      const conversion = conversionData ? 1 : 0; // MySQL BOOLEAN için 1 veya 0
      const conversionValue = conversionData?.value || null;
      const conversionType = conversionData?.type || null;

      await this.pool.execute(
        `UPDATE analytics_sessions SET
          sessionEnd = ?,
          duration = ?,
          pageViews = ?,
          eventsCount = ?,
          conversion = ?,
          conversionValue = ?,
          conversionType = ?,
          isActive = 0,
          lastActivity = ?
         WHERE id = ? AND tenantId = ?`,
        [
          sessionEnd.toISOString().slice(0, 19).replace('T', ' '), // sessionEnd: DATETIME format
          duration,
          pageViewsCount,
          eventsCount,
          conversion,
          conversionValue,
          conversionType,
          sessionEnd.toISOString().slice(0, 19).replace('T', ' '), // lastActivity: DATETIME format
          sessionId,
          tenantId
        ]
      );

      return { success: true, duration, eventsCount, pageViews: pageViewsCount };
    } catch (error) {
      console.error('❌ Analytics Service: Error ending session:', error);
      throw error;
    }
  }

  /**
   * Session heartbeat (canlılık kontrolü)
   * Non-critical operation - hata durumunda sessizce loglar, uygulama çalışmaya devam eder
   */
  async updateSessionActivity(sessionId, tenantId) {
    const maxRetries = 2;
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Veritabanı sorgusunu çalıştır
        await this.pool.execute(
          `UPDATE analytics_sessions SET lastActivity = ? 
           WHERE id = ? AND tenantId = ? AND isActive = true`,
          [new Date(), sessionId, tenantId]
        );
        return { success: true };
      } catch (error) {
        lastError = error;
        
        // ETIMEDOUT veya connection timeout hataları için retry yap
        const isTimeoutError = error.code === 'ETIMEDOUT' || 
                              error.code === 'ECONNREFUSED' || 
                              error.code === 'PROTOCOL_CONNECTION_LOST' ||
                              error.message?.includes('timeout') ||
                              error.message?.includes('ETIMEDOUT') ||
                              error.message?.includes('connect');
        
        if (isTimeoutError && attempt < maxRetries - 1) {
          // Exponential backoff: 200ms, 400ms
          const delay = 200 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Diğer hatalar için veya retry limitine ulaşıldıysa, sessizce logla ve devam et
        // Heartbeat kritik değil, uygulama çalışmaya devam etmeli
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ Analytics Service: Session heartbeat failed (non-critical):', error.message || error.code);
        }
        
        // Hata durumunda bile success döndür (graceful degradation)
        return { success: false, error: error.message || error.code };
      }
    }
    
    // Tüm retry'lar başarısız olduysa, sessizce logla ve devam et
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ Analytics Service: Session heartbeat failed after retries (non-critical):', lastError?.message || lastError?.code);
    }
    
    return { success: false, error: lastError?.message || lastError?.code };
  }

  /**
   * Real-time metrik hesaplama
   */
  async getRealtimeMetrics(tenantId, timeRangeMinutes = 60) {
    try {
      const since = new Date(Date.now() - timeRangeMinutes * 60 * 1000);

      // Aktif kullanıcı sayısı
      const [activeUsers] = await this.pool.execute(
        `SELECT COUNT(DISTINCT userId, deviceId) as count 
         FROM analytics_sessions 
         WHERE tenantId = ? AND isActive = true AND lastActivity >= ?`,
        [tenantId, since]
      );

      // Aktif session sayısı
      const [activeSessions] = await this.pool.execute(
        `SELECT COUNT(*) as count 
         FROM analytics_sessions 
         WHERE tenantId = ? AND isActive = true AND lastActivity >= ?`,
        [tenantId, since]
      );

      // Son 1 saatteki event sayısı
      const [events] = await this.pool.execute(
        `SELECT COUNT(*) as count 
         FROM analytics_events 
         WHERE tenantId = ? AND timestamp >= ?`,
        [tenantId, since]
      );

      // Son 1 saatteki gelir
      const [revenue] = await this.pool.execute(
        `SELECT COALESCE(SUM(amount), 0) as total 
         FROM analytics_events 
         WHERE tenantId = ? AND eventType = 'purchase' AND timestamp >= ?`,
        [tenantId, since]
      );

      // Son 1 saatteki conversion sayısı
      const [conversions] = await this.pool.execute(
        `SELECT COUNT(*) as count 
         FROM analytics_events 
         WHERE tenantId = ? AND eventType = 'purchase' AND timestamp >= ?`,
        [tenantId, since]
      );

      return {
        activeUsers: activeUsers[0]?.count || 0,
        activeSessions: activeSessions[0]?.count || 0,
        eventsCount: events[0]?.count || 0,
        revenue: parseFloat(revenue[0]?.total || 0),
        conversions: conversions[0]?.count || 0,
        timeRange: timeRangeMinutes
      };
    } catch (error) {
      console.error('❌ Analytics Service: Error getting realtime metrics:', error);
      throw error;
    }
  }

  /**
   * Funnel analizi
   */
  async analyzeFunnel(tenantId, funnelSteps, dateRange = null) {
    try {
      const whereClause = dateRange
        ? `AND timestamp >= ? AND timestamp <= ?`
        : '';
      const params = dateRange
        ? [tenantId, dateRange.start, dateRange.end]
        : [tenantId];

      const results = [];
      let previousCount = null;

      for (let i = 0; i < funnelSteps.length; i++) {
        const step = funnelSteps[i];
        const [count] = await this.pool.execute(
          `SELECT COUNT(DISTINCT userId, deviceId) as count 
           FROM analytics_events 
           WHERE tenantId = ? AND eventType = ? ${whereClause}`,
          [...params, step.eventType]
        );

        const stepCount = count[0]?.count || 0;
        const conversionRate = previousCount !== null && previousCount > 0
          ? ((stepCount / previousCount) * 100).toFixed(2)
          : 100;

        results.push({
          step: i + 1,
          stepName: step.name,
          eventType: step.eventType,
          count: stepCount,
          conversionRate: parseFloat(conversionRate),
          dropOff: previousCount !== null ? previousCount - stepCount : 0
        });

        previousCount = stepCount;
      }

      return results;
    } catch (error) {
      console.error('❌ Analytics Service: Error analyzing funnel:', error);
      throw error;
    }
  }

  /**
   * Cohort analizi
   */
  async analyzeCohort(tenantId, cohortType = 'registration', cohortDate) {
    try {
      // Bu fonksiyon daha kompleks bir hesaplama gerektirir
      // Şimdilik temel yapıyı oluşturuyoruz
      const [cohorts] = await this.pool.execute(
        `SELECT * FROM analytics_cohorts 
         WHERE tenantId = ? AND cohortType = ? AND cohortDate = ?`,
        [tenantId, cohortType, cohortDate]
      );

      if (cohorts.length > 0) {
        return {
          cohort: cohorts[0],
          retentionData: JSON.parse(cohorts[0].retentionData || '{}'),
          revenueData: JSON.parse(cohorts[0].revenueData || '{}')
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Analytics Service: Error analyzing cohort:', error);
      throw error;
    }
  }

  /**
   * Performance metrikleri
   */
  async getPerformanceMetrics(tenantId, dateRange) {
    try {
      const [metrics] = await this.pool.execute(
        `SELECT 
          AVG(JSON_EXTRACT(performanceMetrics, '$.loadTime')) as avgLoadTime,
          AVG(JSON_EXTRACT(performanceMetrics, '$.responseTime')) as avgResponseTime,
          COUNT(CASE WHEN eventType = 'error' THEN 1 END) as errorCount,
          COUNT(*) as totalEvents
         FROM analytics_events
         WHERE tenantId = ? AND timestamp >= ? AND timestamp <= ?`,
        [tenantId, dateRange.start, dateRange.end]
      );

      return {
        avgLoadTime: parseFloat(metrics[0]?.avgLoadTime || 0),
        avgResponseTime: parseFloat(metrics[0]?.avgResponseTime || 0),
        errorCount: metrics[0]?.errorCount || 0,
        totalEvents: metrics[0]?.totalEvents || 0,
        errorRate: metrics[0]?.totalEvents > 0
          ? ((metrics[0].errorCount / metrics[0].totalEvents) * 100).toFixed(2)
          : 0
      };
    } catch (error) {
      console.error('❌ Analytics Service: Error getting performance metrics:', error);
      throw error;
    }
  }
}

module.exports = AnalyticsService;

