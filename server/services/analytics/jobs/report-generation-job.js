const cron = require('node-cron');
const ReportingEngine = require('../reporting-engine');

/**
 * Report Generation Job - Scheduled report generation
 */
class ReportGenerationJob {
  constructor(poolWrapper) {
    this.pool = poolWrapper;
    this.reportingEngine = new ReportingEngine(poolWrapper);
    this.jobs = [];
  }

  /**
   * Job'ları başlat
   */
  start() {
    // Günlük raporlar - Her gece 01:00
    const dailyJob = cron.schedule('0 1 * * *', async () => {
      console.log('🔄 Starting daily report generation...');
      await this.generateScheduledReports('daily');
    }, {
      scheduled: true,
      timezone: 'Europe/Istanbul'
    });

    // Haftalık raporlar - Her Pazar gecesi 02:00
    const weeklyJob = cron.schedule('0 2 * * 0', async () => {
      console.log('🔄 Starting weekly report generation...');
      await this.generateScheduledReports('weekly');
    }, {
      scheduled: true,
      timezone: 'Europe/Istanbul'
    });

    // Aylık raporlar - Ayın son günü 03:00
    const monthlyJob = cron.schedule('0 3 28-31 * *', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (tomorrow.getDate() === 1) {
        console.log('🔄 Starting monthly report generation...');
        await this.generateScheduledReports('monthly');
      }
    }, {
      scheduled: true,
      timezone: 'Europe/Istanbul'
    });

    // Rapor cache temizleme - Her gece 04:00
    const cleanupJob = cron.schedule('0 4 * * *', async () => {
      console.log('🔄 Starting report cache cleanup...');
      await this.cleanupExpiredReports();
    }, {
      scheduled: true,
      timezone: 'Europe/Istanbul'
    });

    this.jobs = [dailyJob, weeklyJob, monthlyJob, cleanupJob];
    console.log('✅ Report generation jobs started');
  }

  /**
   * Scheduled raporları oluştur
   */
  async generateScheduledReports(reportType) {
    try {
      // Scheduled report ayarlarını al (şimdilik manuel, daha sonra settings tablosundan alınabilir)
      // Bu örnekte sadece log yapıyoruz
      console.log(`📊 Generating ${reportType} reports...`);
      
      // Burada scheduled report ayarlarını kontrol edip rapor oluşturulabilir
      // Şimdilik placeholder
    } catch (error) {
      console.error('❌ Report Generation Job: Error generating scheduled reports:', error);
    }
  }

  /**
   * Süresi dolmuş raporları temizle
   */
  async cleanupExpiredReports() {
    try {
      const [result] = await this.pool.execute(
        `DELETE FROM analytics_reports 
         WHERE expiresAt IS NOT NULL AND expiresAt < NOW()`,
        []
      );

      console.log(`✅ Cleaned up ${result.affectedRows} expired reports`);
    } catch (error) {
      console.error('❌ Report Generation Job: Error cleaning up expired reports:', error);
    }
  }

  /**
   * Job'ları durdur
   */
  stop() {
    this.jobs.forEach(job => job.stop());
    console.log('✅ Report generation jobs stopped');
  }
}

module.exports = ReportGenerationJob;















