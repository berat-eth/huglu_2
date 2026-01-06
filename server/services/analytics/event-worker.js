const { Worker } = require('bullmq');
const Redis = require('ioredis');
const AnalyticsService = require('./analytics-service');

/**
 * Event Worker - BullMQ worker for processing analytics events
 */
class EventWorker {
  constructor(poolWrapper, redisConfig = null) {
    this.pool = poolWrapper;
    this.redis = redisConfig || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: null
    });

    this.analyticsService = new AnalyticsService(poolWrapper);
    this.worker = null;
  }

  /**
   * Worker'ı başlat
   */
  start() {
    this.worker = new Worker(
      'analytics-events',
      async (job) => {
        try {
          const eventData = job.data;
          
          // Event'i kaydet
          const result = await this.analyticsService.trackEvent(eventData);
          
          return {
            success: true,
            eventId: result.eventId
          };
        } catch (error) {
          console.error('❌ Event Worker: Error processing event:', error);
          throw error; // Retry için error fırlat
        }
      },
      {
        connection: this.redis,
        concurrency: 10, // Aynı anda 10 event işle
        limiter: {
          max: 1000, // Saniyede maksimum 1000 event
          duration: 1000
        }
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`✅ Event processed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Event failed: ${job.id}`, err.message);
    });

    console.log('✅ Event Worker started');
  }

  /**
   * Worker'ı durdur
   */
  async stop() {
    if (this.worker) {
      await this.worker.close();
      await this.redis.quit();
      console.log('✅ Event Worker stopped');
    }
  }
}

module.exports = EventWorker;

















