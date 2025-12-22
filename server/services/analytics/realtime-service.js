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
   * Aktif session'ları al
   */
  async getActiveSessions(tenantId, limit = 100) {
    try {
      const [sessions] = await this.pool.execute(
        `SELECT 
          id, userId, deviceId, sessionStart, lastActivity,
          pageViews, eventsCount, country, city
         FROM analytics_sessions
         WHERE tenantId = ? AND isActive = true AND lastActivity >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
         ORDER BY lastActivity DESC
         LIMIT ?`,
        [tenantId, limit]
      );

      return sessions;
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

