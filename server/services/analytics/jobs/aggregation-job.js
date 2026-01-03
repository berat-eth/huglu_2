const cron = require('node-cron');
const AggregationEngine = require('../aggregation-engine');

/**
 * Aggregation Job - Günlük/haftalık/aylık aggregasyon job'ları
 */
class AggregationJob {
  constructor(poolWrapper) {
    this.pool = poolWrapper;
    this.aggregationEngine = new AggregationEngine(poolWrapper);
    this.jobs = [];
  }

  /**
   * Tüm job'ları başlat
   */
  start() {
    // Günlük aggregasyon - Her gece 02:00
    const dailyJob = cron.schedule('0 2 * * *', async () => {
      console.log('🔄 Starting daily aggregation...');
      await this.runDailyAggregation();
    }, {
      scheduled: true,
      timezone: 'Europe/Istanbul'
    });

    // Haftalık aggregasyon - Her Pazar gecesi 03:00
    const weeklyJob = cron.schedule('0 3 * * 0', async () => {
      console.log('🔄 Starting weekly aggregation...');
      await this.runWeeklyAggregation();
    }, {
      scheduled: true,
      timezone: 'Europe/Istanbul'
    });

    // Aylık aggregasyon - Ayın son günü 04:00
    const monthlyJob = cron.schedule('0 4 28-31 * *', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Ayın son günü kontrolü
      if (tomorrow.getDate() === 1) {
        console.log('🔄 Starting monthly aggregation...');
        await this.runMonthlyAggregation();
      }
    }, {
      scheduled: true,
      timezone: 'Europe/Istanbul'
    });

    // Eski veri temizleme - Her gece 05:00
    const cleanupJob = cron.schedule('0 5 * * *', async () => {
      console.log('🔄 Starting data cleanup...');
      await this.cleanupOldData();
    }, {
      scheduled: true,
      timezone: 'Europe/Istanbul'
    });

    this.jobs = [dailyJob, weeklyJob, monthlyJob, cleanupJob];
    console.log('✅ Aggregation jobs started');
  }

  /**
   * Günlük aggregasyon çalıştır
   */
  async runDailyAggregation() {
    try {
      // Aktif tenant'ları al
      const [tenants] = await this.pool.execute(
        'SELECT id FROM tenants WHERE isActive = true'
      );

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      for (const tenant of tenants) {
        try {
          await this.aggregationEngine.aggregateDaily(tenant.id, yesterday);
          console.log(`✅ Daily aggregation completed for tenant ${tenant.id}`);
        } catch (error) {
          console.error(`❌ Error aggregating daily for tenant ${tenant.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Aggregation Job: Error running daily aggregation:', error);
    }
  }

  /**
   * Haftalık aggregasyon çalıştır
   */
  async runWeeklyAggregation() {
    try {
      const [tenants] = await this.pool.execute(
        'SELECT id FROM tenants WHERE isActive = true'
      );

      // Geçen haftanın başlangıcı (Pazar)
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      // En yakın Pazar gününü bul
      const dayOfWeek = lastWeek.getDay();
      const daysToSunday = dayOfWeek === 0 ? 0 : dayOfWeek;
      lastWeek.setDate(lastWeek.getDate() - daysToSunday);
      lastWeek.setHours(0, 0, 0, 0);

      for (const tenant of tenants) {
        try {
          await this.aggregationEngine.aggregateWeekly(tenant.id, lastWeek);
          console.log(`✅ Weekly aggregation completed for tenant ${tenant.id}`);
        } catch (error) {
          console.error(`❌ Error aggregating weekly for tenant ${tenant.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Aggregation Job: Error running weekly aggregation:', error);
    }
  }

  /**
   * Aylık aggregasyon çalıştır
   */
  async runMonthlyAggregation() {
    try {
      const [tenants] = await this.pool.execute(
        'SELECT id FROM tenants WHERE isActive = true'
      );

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const year = lastMonth.getFullYear();
      const month = lastMonth.getMonth() + 1;

      for (const tenant of tenants) {
        try {
          await this.aggregationEngine.aggregateMonthly(tenant.id, year, month);
          console.log(`✅ Monthly aggregation completed for tenant ${tenant.id}`);
        } catch (error) {
          console.error(`❌ Error aggregating monthly for tenant ${tenant.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Aggregation Job: Error running monthly aggregation:', error);
    }
  }

  /**
   * Eski veri temizleme (90 günden eski raw events)
   */
  async cleanupOldData() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      // Eski eventleri sil
      const [result] = await this.pool.execute(
        `DELETE FROM analytics_events 
         WHERE timestamp < ?`,
        [cutoffDate]
      );

      console.log(`✅ Cleaned up ${result.affectedRows} old events`);

      // Eski session'ları temizle (90 günden eski ve aktif olmayan)
      const [sessionResult] = await this.pool.execute(
        `DELETE FROM analytics_sessions 
         WHERE isActive = false AND sessionStart < ?`,
        [cutoffDate]
      );

      console.log(`✅ Cleaned up ${sessionResult.affectedRows} old sessions`);
    } catch (error) {
      console.error('❌ Aggregation Job: Error cleaning up old data:', error);
    }
  }

  /**
   * Job'ları durdur
   */
  stop() {
    this.jobs.forEach(job => job.stop());
    console.log('✅ Aggregation jobs stopped');
  }
}

module.exports = AggregationJob;












