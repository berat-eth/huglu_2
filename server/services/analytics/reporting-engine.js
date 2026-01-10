const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

/**
 * Reporting Engine - Rapor üretim motoru
 * Rapor şablonları, PDF/Excel export, scheduled reports
 */
class ReportingEngine {
  constructor(poolWrapper) {
    this.pool = poolWrapper;
    // ✅ DATA_DIR: Ana veri dizini (proje dışında)
    const DATA_DIR = process.env.DATA_DIR || '/root/data';
    const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(DATA_DIR, 'uploads');
    // ✅ /root/data/uploads/reports kullan
    this.reportsDir = path.join(UPLOADS_DIR, 'reports');
    // Fallback: eski yolu da kontrol et
    const fallbackReportsDir = path.join(__dirname, '../../uploads/reports');
    if (!fs.existsSync(this.reportsDir) && fs.existsSync(fallbackReportsDir)) {
      this.reportsDir = fallbackReportsDir;
    }
    this.ensureReportsDirectory();
  }

  ensureReportsDirectory() {
    // ✅ Klasör zaten server.js'de oluşturuldu, sadece kontrol et
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
      console.log('✅ ReportingEngine: Reports directory created:', this.reportsDir);
    }
  }

  /**
   * Rapor oluştur
   */
  async generateReport(tenantId, reportConfig) {
    try {
      const {
        reportName,
        reportType,
        reportTemplate,
        parameters,
        dateRange
      } = reportConfig;

      // Rapor kaydı oluştur
      const [result] = await this.pool.execute(
        `INSERT INTO analytics_reports (
          tenantId, reportName, reportType, reportTemplate, parameters, status
        ) VALUES (?, ?, ?, ?, ?, 'generating')`,
        [
          tenantId,
          reportName,
          reportType,
          reportTemplate || null,
          JSON.stringify(parameters || {}),
        ]
      );

      const reportId = result.insertId;

      try {
        // Rapor verilerini topla
        const reportData = await this.collectReportData(tenantId, reportType, dateRange, parameters);

        // Rapor sonuçlarını kaydet
        await this.pool.execute(
          `UPDATE analytics_reports SET
            results = ?,
            status = 'completed',
            generatedAt = NOW(),
            expiresAt = DATE_ADD(NOW(), INTERVAL 30 DAY)
           WHERE id = ?`,
          [JSON.stringify(reportData), reportId]
        );

        return {
          success: true,
          reportId,
          data: reportData
        };
      } catch (error) {
        // Hata durumunda status'u güncelle
        await this.pool.execute(
          `UPDATE analytics_reports SET status = 'failed' WHERE id = ?`,
          [reportId]
        );
        throw error;
      }
    } catch (error) {
      console.error('❌ Reporting Engine: Error generating report:', error);
      throw error;
    }
  }

  /**
   * Rapor verilerini topla
   */
  async collectReportData(tenantId, reportType, dateRange, parameters = {}) {
    try {
      const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.end || new Date();

      // Genel metrikler
      const [aggregates] = await this.pool.execute(
        `SELECT * FROM analytics_aggregates
         WHERE tenantId = ? AND aggregateDate >= ? AND aggregateDate <= ?
         ORDER BY aggregateDate DESC`,
        [tenantId, startDate, endDate]
      );

      // Revenue trend
      const [revenueTrend] = await this.pool.execute(
        `SELECT 
          DATE(timestamp) as date,
          SUM(amount) as revenue,
          COUNT(*) as orders
         FROM analytics_events
         WHERE tenantId = ? AND eventType = 'purchase' AND timestamp >= ? AND timestamp <= ?
         GROUP BY DATE(timestamp)
         ORDER BY date ASC`,
        [tenantId, startDate, endDate]
      );

      // Top products
      const [topProducts] = await this.pool.execute(
        `SELECT 
          productId,
          COUNT(*) as views,
          SUM(CASE WHEN eventType = 'purchase' THEN 1 ELSE 0 END) as purchases,
          SUM(CASE WHEN eventType = 'purchase' THEN amount ELSE 0 END) as revenue
         FROM analytics_events
         WHERE tenantId = ? AND productId IS NOT NULL AND timestamp >= ? AND timestamp <= ?
         GROUP BY productId
         ORDER BY views DESC
         LIMIT 10`,
        [tenantId, startDate, endDate]
      );

      // User metrics
      const [userMetrics] = await this.pool.execute(
        `SELECT 
          COUNT(DISTINCT userId, deviceId) as totalUsers,
          COUNT(DISTINCT CASE WHEN userId IS NOT NULL THEN userId END) as registeredUsers,
          COUNT(DISTINCT CASE WHEN userId IS NULL THEN deviceId END) as anonymousUsers
         FROM analytics_sessions
         WHERE tenantId = ? AND sessionStart >= ? AND sessionStart <= ?`,
        [tenantId, startDate, endDate]
      );

      return {
        dateRange: {
          start: startDate,
          end: endDate
        },
        aggregates: aggregates,
        revenueTrend: revenueTrend,
        topProducts: topProducts,
        userMetrics: userMetrics[0] || {},
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('❌ Reporting Engine: Error collecting report data:', error);
      throw error;
    }
  }

  /**
   * Raporu PDF olarak export et
   */
  async exportToPDF(reportId, tenantId) {
    try {
      // Rapor bilgilerini al
      const [reports] = await this.pool.execute(
        `SELECT * FROM analytics_reports WHERE id = ? AND tenantId = ?`,
        [reportId, tenantId]
      );

      if (reports.length === 0) {
        throw new Error('Report not found');
      }

      const report = reports[0];
      const reportData = JSON.parse(report.results || '{}');

      // PDF oluştur
      const doc = new PDFDocument();
      const fileName = `report_${reportId}_${Date.now()}.pdf`;
      const filePath = path.join(this.reportsDir, fileName);

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Başlık
      doc.fontSize(20).text(report.reportName, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
      doc.moveDown();

      // Metrikler
      if (reportData.userMetrics) {
        doc.fontSize(16).text('User Metrics');
        doc.fontSize(12);
        doc.text(`Total Users: ${reportData.userMetrics.totalUsers || 0}`);
        doc.text(`Registered Users: ${reportData.userMetrics.registeredUsers || 0}`);
        doc.text(`Anonymous Users: ${reportData.userMetrics.anonymousUsers || 0}`);
        doc.moveDown();
      }

      // Revenue trend
      if (reportData.revenueTrend && reportData.revenueTrend.length > 0) {
        doc.fontSize(16).text('Revenue Trend');
        doc.fontSize(12);
        reportData.revenueTrend.forEach(item => {
          doc.text(`${item.date}: ${item.revenue || 0} TRY (${item.orders || 0} orders)`);
        });
        doc.moveDown();
      }

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', async () => {
          // Dosya yolunu güncelle
          await this.pool.execute(
            `UPDATE analytics_reports SET filePath = ?, fileFormat = 'pdf' WHERE id = ?`,
            [filePath, reportId]
          );
          resolve({ filePath, fileName });
        });
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('❌ Reporting Engine: Error exporting to PDF:', error);
      throw error;
    }
  }

  /**
   * Raporu Excel olarak export et
   */
  async exportToExcel(reportId, tenantId) {
    try {
      // Rapor bilgilerini al
      const [reports] = await this.pool.execute(
        `SELECT * FROM analytics_reports WHERE id = ? AND tenantId = ?`,
        [reportId, tenantId]
      );

      if (reports.length === 0) {
        throw new Error('Report not found');
      }

      const report = reports[0];
      const reportData = JSON.parse(report.results || '{}');

      // Excel workbook oluştur
      const workbook = XLSX.utils.book_new();
      const worksheetData = [];

      // Başlık satırı
      worksheetData.push([report.reportName]);
      worksheetData.push([`Generated: ${new Date(report.generatedAt).toLocaleString()}`]);
      worksheetData.push([]);

      // User Metrics
      if (reportData.userMetrics) {
        worksheetData.push(['User Metrics']);
        worksheetData.push(['Total Users', reportData.userMetrics.totalUsers || 0]);
        worksheetData.push(['Registered Users', reportData.userMetrics.registeredUsers || 0]);
        worksheetData.push(['Anonymous Users', reportData.userMetrics.anonymousUsers || 0]);
        worksheetData.push([]);
      }

      // Revenue Trend
      if (reportData.revenueTrend && reportData.revenueTrend.length > 0) {
        worksheetData.push(['Revenue Trend']);
        worksheetData.push(['Date', 'Revenue', 'Orders']);
        reportData.revenueTrend.forEach(item => {
          worksheetData.push([item.date, item.revenue || 0, item.orders || 0]);
        });
        worksheetData.push([]);
      }

      // Worksheet oluştur
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics Report');

      // Dosyayı kaydet
      const fileName = `report_${reportId}_${Date.now()}.xlsx`;
      const filePath = path.join(this.reportsDir, fileName);
      XLSX.writeFile(workbook, filePath);

      // Dosya yolunu güncelle
      await this.pool.execute(
        `UPDATE analytics_reports SET filePath = ?, fileFormat = 'excel' WHERE id = ?`,
        [filePath, reportId]
      );

      return { filePath, fileName };
    } catch (error) {
      console.error('❌ Reporting Engine: Error exporting to Excel:', error);
      throw error;
    }
  }

  /**
   * Rapor listesi
   */
  async getReports(tenantId, limit = 50, offset = 0) {
    try {
      const [reports] = await this.pool.execute(
        `SELECT * FROM analytics_reports
         WHERE tenantId = ?
         ORDER BY createdAt DESC
         LIMIT ? OFFSET ?`,
        [tenantId, limit, offset]
      );

      return reports.map(report => ({
        ...report,
        parameters: JSON.parse(report.parameters || '{}'),
        results: JSON.parse(report.results || '{}')
      }));
    } catch (error) {
      console.error('❌ Reporting Engine: Error getting reports:', error);
      throw error;
    }
  }
}

module.exports = ReportingEngine;

