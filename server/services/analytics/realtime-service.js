const Redis = require('ioredis');

/**
 * Real-time Service - Gerçek zamanlı analitik servisi
 * WebSocket entegrasyonu, Redis Pub/Sub, canlı kullanıcı ve event takibi
 */
class RealtimeService {
  constructor(poolWrapper, redisConfig = null) {
    this.pool = poolWrapper;
    this.redis = redisConfig || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: null
    });
    this.subscriber = null;
    this.publisher = null;
  }

  /**
   * Redis Pub/Sub bağlantılarını başlat
   */
  async initialize() {
    try {
      this.subscriber = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        maxRetriesPerRequest: null
      });

      this.publisher = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        maxRetriesPerRequest: null
      });

      // Event kanallarını dinle
      await this.subscriber.subscribe('analytics:events', 'analytics:metrics', 'analytics:sessions');
      
      this.subscriber.on('message', (channel, message) => {
        this.handleMessage(channel, message);
      });

      console.log('✅ Real-time Service: Redis Pub/Sub initialized');
    } catch (error) {
      console.error('❌ Real-time Service: Error initializing:', error);
      throw error;
    }
  }

  /**
   * Mesaj işleme
   */
  handleMessage(channel, message) {
    try {
      const data = JSON.parse(message);
      
      // Burada WebSocket bağlantılarına broadcast yapılabilir
      // Şimdilik sadece log
      console.log(`📡 Real-time Service: Message on ${channel}:`, data.type);
    } catch (error) {
      console.error('❌ Real-time Service: Error handling message:', error);
    }
  }

  /**
   * Event broadcast
   */
  async broadcastEvent(tenantId, eventData) {
    try {
      const message = JSON.stringify({
        tenantId,
        type: 'event',
        data: eventData,
        timestamp: new Date()
      });

      await this.publisher.publish('analytics:events', message);
      return { success: true };
    } catch (error) {
      console.error('❌ Real-time Service: Error broadcasting event:', error);
      throw error;
    }
  }

  /**
   * Metric update broadcast
   */
  async broadcastMetrics(tenantId, metrics) {
    try {
      const message = JSON.stringify({
        tenantId,
        type: 'metrics',
        data: metrics,
        timestamp: new Date()
      });

      await this.publisher.publish('analytics:metrics', message);
      return { success: true };
    } catch (error) {
      console.error('❌ Real-time Service: Error broadcasting metrics:', error);
      throw error;
    }
  }

  /**
   * Session update broadcast
   */
  async broadcastSession(tenantId, sessionData) {
    try {
      const message = JSON.stringify({
        tenantId,
        type: 'session',
        data: sessionData,
        timestamp: new Date()
      });

      await this.publisher.publish('analytics:sessions', message);
      return { success: true };
    } catch (error) {
      console.error('❌ Real-time Service: Error broadcasting session:', error);
      throw error;
    }
  }

  /**
   * Canlı kullanıcı sayısını al
   */
  async getLiveUsers(tenantId) {
    try {
      const [users] = await this.pool.execute(
        `SELECT COUNT(DISTINCT userId, deviceId) as count
         FROM analytics_sessions
         WHERE tenantId = ? AND isActive = true AND lastActivity >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
        [tenantId]
      );

      return {
        count: users[0]?.count || 0,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Real-time Service: Error getting live users:', error);
      throw error;
    }
  }

  /**
   * Aktif session'ları al - Kullanıcı bilgileri ve sayfa süreleri ile
   */
  async getActiveSessions(tenantId, limit = 100) {
    try {
      const [sessions] = await this.pool.execute(
        `SELECT 
          s.id, 
          s.userId, 
          s.deviceId, 
          s.sessionStart, 
          s.lastActivity,
          s.pageViews, 
          s.eventsCount, 
          s.country, 
          s.city,
          u.name as userName,
          COALESCE(w.balance, 0) as walletBalance
         FROM analytics_sessions s
         LEFT JOIN users u ON s.userId = u.id AND s.tenantId = u.tenantId
         LEFT JOIN user_wallets w ON s.userId = w.userId AND s.tenantId = w.tenantId
         WHERE s.tenantId = ? AND s.isActive = true AND s.lastActivity >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
         ORDER BY s.lastActivity DESC
         LIMIT ?`,
        [tenantId, limit]
      );

      // Her session için sayfa görüntüleme sürelerini hesapla
      const sessionsWithPageTimes = await Promise.all(
        sessions.map(async (session) => {
          // Bu session için sayfa görüntüleme sürelerini al
          const [pageTimes] = await this.pool.execute(
            `SELECT 
              screenName,
              COUNT(*) as viewCount,
              AVG(CASE 
                WHEN properties IS NOT NULL AND JSON_EXTRACT(properties, '$.timeOnScreen') IS NOT NULL 
                THEN CAST(JSON_EXTRACT(properties, '$.timeOnScreen') AS UNSIGNED) 
                ELSE NULL 
              END) as avgTimeOnScreen,
              SUM(CASE 
                WHEN properties IS NOT NULL AND JSON_EXTRACT(properties, '$.timeOnScreen') IS NOT NULL 
                THEN CAST(JSON_EXTRACT(properties, '$.timeOnScreen') AS UNSIGNED) 
                ELSE 0 
              END) as totalTimeOnScreen
             FROM analytics_events
             WHERE tenantId = ? AND sessionId = ? AND eventType = 'screen_view'
             GROUP BY screenName
             ORDER BY viewCount DESC`,
            [tenantId, session.id]
          );

          return {
            ...session,
            userName: session.userName || null,
            walletBalance: parseFloat(session.walletBalance || 0),
            pages: pageTimes.map(page => ({
              screenName: page.screenName,
              viewCount: page.viewCount,
              avgTimeOnScreen: Math.floor(page.avgTimeOnScreen || 0),
              totalTimeOnScreen: Math.floor(page.totalTimeOnScreen || 0)
            }))
          };
        })
      );

      return sessionsWithPageTimes;
    } catch (error) {
      console.error('❌ Real-time Service: Error getting active sessions:', error);
      throw error;
    }
  }

  /**
   * Son eventleri al
   */
  async getRecentEvents(tenantId, limit = 50) {
    try {
      const [events] = await this.pool.execute(
        `SELECT 
          id, userId, deviceId, eventType, screenName,
          productId, amount, timestamp
         FROM analytics_events
         WHERE tenantId = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
        [tenantId, limit]
      );

      return events;
    } catch (error) {
      console.error('❌ Real-time Service: Error getting recent events:', error);
      throw error;
    }
  }

  /**
   * Cleanup - Redis bağlantılarını kapat
   */
  async close() {
    try {
      if (this.subscriber) {
        await this.subscriber.unsubscribe();
        await this.subscriber.quit();
      }
      if (this.publisher) {
        await this.publisher.quit();
      }
      if (this.redis) {
        await this.redis.quit();
      }
    } catch (error) {
      console.error('❌ Real-time Service: Error closing connections:', error);
    }
  }
}

module.exports = RealtimeService;

