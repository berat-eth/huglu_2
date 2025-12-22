const { Queue } = require('bullmq');
const Redis = require('ioredis');

/**
 * Event Processor - Event işleme motoru
 * Event validation, enrichment, queuing ve batch processing
 */
class EventProcessor {
  constructor(poolWrapper, redisConfig = null) {
    this.pool = poolWrapper;
    this.redis = redisConfig || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: null
    });

    // BullMQ queue oluştur
    this.eventQueue = new Queue('analytics-events', {
      connection: this.redis
    });
  }

  /**
   * Event validation
   */
  validateEvent(eventData) {
    const required = ['tenantId', 'deviceId', 'sessionId', 'eventType'];
    const missing = required.filter(field => !eventData[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Event type validation
    const validEventTypes = [
      'screen_view', 'product_view', 'add_to_cart', 'remove_from_cart',
      'purchase', 'search', 'click', 'scroll', 'error', 'performance', 'custom'
    ];

    if (!validEventTypes.includes(eventData.eventType)) {
      throw new Error(`Invalid eventType: ${eventData.eventType}`);
    }

    // Sanitize string fields
    if (eventData.searchQuery && eventData.searchQuery.length > 500) {
      eventData.searchQuery = eventData.searchQuery.substring(0, 500);
    }

    if (eventData.screenName && eventData.screenName.length > 255) {
      eventData.screenName = eventData.screenName.substring(0, 255);
    }

    return true;
  }

  /**
   * Event enrichment - IP geolocation, device detection
   */
  async enrichEvent(eventData) {
    try {
      // IP geolocation (eğer IP varsa)
      if (eventData.ipAddress && !eventData.country) {
        try {
          // IP geolocation servisi kullanılabilir
          // Şimdilik basit bir yapı
          eventData.country = null;
          eventData.city = null;
        } catch (error) {
          console.warn('⚠️ Event Processor: IP geolocation failed:', error.message);
        }
      }

      // Device detection (user agent'dan)
      if (eventData.userAgent && !eventData.deviceInfo) {
        eventData.deviceInfo = this.parseUserAgent(eventData.userAgent);
      }

      return eventData;
    } catch (error) {
      console.error('❌ Event Processor: Error enriching event:', error);
      return eventData; // Enrichment başarısız olsa bile event'i döndür
    }
  }

  /**
   * User agent parsing (basit)
   */
  parseUserAgent(userAgent) {
    const info = {
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown',
      isMobile: false
    };

    if (!userAgent) return info;

    // Browser detection
    if (userAgent.includes('Chrome')) info.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) info.browser = 'Firefox';
    else if (userAgent.includes('Safari')) info.browser = 'Safari';
    else if (userAgent.includes('Edge')) info.browser = 'Edge';

    // OS detection
    if (userAgent.includes('Windows')) info.os = 'Windows';
    else if (userAgent.includes('Mac')) info.os = 'macOS';
    else if (userAgent.includes('Linux')) info.os = 'Linux';
    else if (userAgent.includes('Android')) info.os = 'Android';
    else if (userAgent.includes('iOS')) info.os = 'iOS';

    // Mobile detection
    info.isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
    if (info.isMobile) {
      info.device = 'Mobile';
    } else {
      info.device = 'Desktop';
    }

    return info;
  }

  /**
   * Event'i queue'ya ekle
   */
  async queueEvent(eventData, options = {}) {
    try {
      this.validateEvent(eventData);
      const enrichedEvent = await this.enrichEvent(eventData);

      await this.eventQueue.add('process-event', enrichedEvent, {
        attempts: options.attempts || 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: {
          age: 3600 // 1 saat sonra temizle
        }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Event Processor: Error queueing event:', error);
      throw error;
    }
  }

  /**
   * Batch events queue'ya ekle
   */
  async queueEvents(events, options = {}) {
    try {
      const jobs = [];
      for (const event of events) {
        try {
          this.validateEvent(event);
          const enrichedEvent = await this.enrichEvent(event);
          jobs.push({
            name: 'process-event',
            data: enrichedEvent
          });
        } catch (error) {
          console.warn('⚠️ Event Processor: Skipping invalid event:', error.message);
        }
      }

      if (jobs.length > 0) {
        await this.eventQueue.addBulk(jobs.map(job => ({
          name: job.name,
          data: job.data,
          opts: {
            attempts: options.attempts || 3,
            removeOnComplete: {
              age: 3600
            }
          }
        })));
      }

      return { success: true, queued: jobs.length, total: events.length };
    } catch (error) {
      console.error('❌ Event Processor: Error queueing batch events:', error);
      throw error;
    }
  }

  /**
   * Queue durumunu kontrol et
   */
  async getQueueStatus() {
    try {
      const waiting = await this.eventQueue.getWaitingCount();
      const active = await this.eventQueue.getActiveCount();
      const completed = await this.eventQueue.getCompletedCount();
      const failed = await this.eventQueue.getFailedCount();

      return {
        waiting,
        active,
        completed,
        failed,
        total: waiting + active + completed + failed
      };
    } catch (error) {
      console.error('❌ Event Processor: Error getting queue status:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0
      };
    }
  }

  /**
   * Cleanup - Redis bağlantısını kapat
   */
  async close() {
    try {
      await this.eventQueue.close();
      await this.redis.quit();
    } catch (error) {
      console.error('❌ Event Processor: Error closing connections:', error);
    }
  }
}

module.exports = EventProcessor;

