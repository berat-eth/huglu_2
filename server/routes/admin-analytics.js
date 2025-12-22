const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/analytics/analytics-service');
const AggregationEngine = require('../services/analytics/aggregation-engine');
const ReportingEngine = require('../services/analytics/reporting-engine');
const RealtimeService = require('../services/analytics/realtime-service');
const FunnelAnalyzer = require('../services/analytics/funnel-analyzer');
const CohortAnalyzer = require('../services/analytics/cohort-analyzer');

/**
 * Admin Analytics Routes Factory
 */
function createAdminAnalyticsRoutes(poolWrapper) {
  const analyticsService = new AnalyticsService(poolWrapper);
  const aggregationEngine = new AggregationEngine(poolWrapper);
  const reportingEngine = new ReportingEngine(poolWrapper);
  const realtimeService = new RealtimeService(poolWrapper);
  const funnelAnalyzer = new FunnelAnalyzer(poolWrapper);
  const cohortAnalyzer = new CohortAnalyzer(poolWrapper);

  // Helper: Get tenant ID from request
  function getTenantId(req) {
    return req.tenant?.id || 1;
  }

  // Helper: Parse date range
  function parseDateRange(req) {
    const { startDate, endDate, days } = req.query;
    
    if (days) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - parseInt(days));
      return { start, end };
    }
    
    if (startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }
    
    // Default: last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  }

  // ==================== REAL-TIME ANALYTICS ====================

  /**
   * GET /api/admin/analytics/realtime/overview
   * Gerçek zamanlı genel bakış
   */
  router.get('/realtime/overview', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const timeRange = parseInt(req.query.minutes) || 60;

      const metrics = await analyticsService.getRealtimeMetrics(tenantId, timeRange);
      const liveUsers = await realtimeService.getLiveUsers(tenantId);

      res.json({
        success: true,
        data: {
          ...metrics,
          liveUsers: liveUsers.count
        }
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting realtime overview:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting realtime overview',
        error: error.message
      });
    }
  });

  /**
   * GET /api/admin/analytics/realtime/users
   * Canlı kullanıcılar
   */
  router.get('/realtime/users', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const limit = parseInt(req.query.limit) || 100;

      const users = await realtimeService.getLiveUsers(tenantId);
      const sessions = await realtimeService.getActiveSessions(tenantId, limit);

      res.json({
        success: true,
        data: {
          count: users.count,
          sessions
        }
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting realtime users:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting realtime users',
        error: error.message
      });
    }
  });

  /**
   * GET /api/admin/analytics/realtime/events
   * Canlı eventler
   */
  router.get('/realtime/events', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const limit = parseInt(req.query.limit) || 50;

      const events = await realtimeService.getRecentEvents(tenantId, limit);

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting realtime events:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting realtime events',
        error: error.message
      });
    }
  });

  // ==================== E-COMMERCE ANALYTICS ====================

  /**
   * GET /api/admin/analytics/ecommerce/overview
   * Genel e-ticaret metrikleri
   */
  router.get('/ecommerce/overview', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const dateRange = parseDateRange(req);

      const [aggregates] = await pool.execute(
        `SELECT 
          SUM(totalRevenue) as totalRevenue,
          SUM(purchase) as totalOrders,
          AVG(totalRevenue / NULLIF(purchase, 0)) as avgOrderValue,
          SUM(productViews) as productViews,
          SUM(addToCart) as addToCart,
          (SUM(addToCart) / NULLIF(SUM(productViews), 0) * 100) as cartConversionRate,
          (SUM(purchase) / NULLIF(SUM(addToCart), 0) * 100) as checkoutConversionRate
         FROM analytics_aggregates
         WHERE tenantId = ? AND aggregateDate >= ? AND aggregateDate <= ?`,
        [tenantId, dateRange.start, dateRange.end]
      );

      res.json({
        success: true,
        data: aggregates[0] || {}
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting ecommerce overview:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting ecommerce overview',
        error: error.message
      });
    }
  });

  /**
   * GET /api/admin/analytics/ecommerce/revenue
   * Gelir analizi
   */
  router.get('/ecommerce/revenue', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const dateRange = parseDateRange(req);

      const [revenue] = await pool.execute(
        `SELECT 
          DATE(timestamp) as date,
          SUM(amount) as revenue,
          COUNT(*) as orders,
          AVG(amount) as avgOrderValue
         FROM analytics_events
         WHERE tenantId = ? AND eventType = 'purchase' AND timestamp >= ? AND timestamp <= ?
         GROUP BY DATE(timestamp)
         ORDER BY date ASC`,
        [tenantId, dateRange.start, dateRange.end]
      );

      res.json({
        success: true,
        data: revenue
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting revenue:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting revenue',
        error: error.message
      });
    }
  });

  /**
   * GET /api/admin/analytics/ecommerce/products
   * Ürün performansı
   */
  router.get('/ecommerce/products', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const dateRange = parseDateRange(req);
      const limit = parseInt(req.query.limit) || 20;

      const [products] = await pool.execute(
        `SELECT 
          e.productId,
          p.name as productName,
          COUNT(CASE WHEN e.eventType = 'product_view' THEN 1 END) as views,
          COUNT(CASE WHEN e.eventType = 'add_to_cart' THEN 1 END) as addToCart,
          COUNT(CASE WHEN e.eventType = 'purchase' THEN 1 END) as purchases,
          SUM(CASE WHEN e.eventType = 'purchase' THEN e.amount ELSE 0 END) as revenue,
          (COUNT(CASE WHEN e.eventType = 'purchase' THEN 1 END) / NULLIF(COUNT(CASE WHEN e.eventType = 'product_view' THEN 1 END), 0) * 100) as conversionRate
         FROM analytics_events e
         LEFT JOIN products p ON e.productId = p.id AND p.tenantId = e.tenantId
         WHERE e.tenantId = ? AND e.productId IS NOT NULL AND e.timestamp >= ? AND e.timestamp <= ?
         GROUP BY e.productId, p.name
         ORDER BY revenue DESC
         LIMIT ?`,
        [tenantId, dateRange.start, dateRange.end, limit]
      );

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting products:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting products',
        error: error.message
      });
    }
  });

  /**
   * GET /api/admin/analytics/ecommerce/funnels
   * Conversion funnels
   */
  router.get('/ecommerce/funnels', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const funnels = await funnelAnalyzer.getFunnels(tenantId, true);

      res.json({
        success: true,
        data: funnels
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting funnels:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting funnels',
        error: error.message
      });
    }
  });

  /**
   * POST /api/admin/analytics/ecommerce/funnels
   * Yeni funnel oluştur
   */
  router.post('/ecommerce/funnels', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { funnelName, funnelSteps, dateRangeStart, dateRangeEnd } = req.body;

      if (!funnelName || !funnelSteps || !Array.isArray(funnelSteps)) {
        return res.status(400).json({
          success: false,
          message: 'Funnel name and steps are required'
        });
      }

      const result = await funnelAnalyzer.createFunnel(tenantId, {
        funnelName,
        funnelSteps,
        dateRangeStart,
        dateRangeEnd
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error creating funnel:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating funnel',
        error: error.message
      });
    }
  });

  // ==================== USER ANALYTICS ====================

  /**
   * GET /api/admin/analytics/users/overview
   * Kullanıcı genel bakış
   */
  router.get('/users/overview', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const dateRange = parseDateRange(req);

      const [metrics] = await pool.execute(
        `SELECT 
          COUNT(DISTINCT userId, deviceId) as totalUsers,
          COUNT(DISTINCT CASE WHEN userId IS NOT NULL THEN userId END) as registeredUsers,
          COUNT(DISTINCT CASE WHEN userId IS NULL THEN deviceId END) as anonymousUsers,
          COUNT(*) as totalSessions,
          AVG(duration) as avgSessionDuration
         FROM analytics_sessions
         WHERE tenantId = ? AND sessionStart >= ? AND sessionStart <= ?`,
        [tenantId, dateRange.start, dateRange.end]
      );

      res.json({
        success: true,
        data: metrics[0] || {}
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting users overview:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting users overview',
        error: error.message
      });
    }
  });

  /**
   * GET /api/admin/analytics/users/cohorts
   * Kohort analizi
   */
  router.get('/users/cohorts', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const limit = parseInt(req.query.limit) || 50;

      const cohorts = await cohortAnalyzer.getCohorts(tenantId, limit);

      res.json({
        success: true,
        data: cohorts
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting cohorts:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting cohorts',
        error: error.message
      });
    }
  });

  /**
   * POST /api/admin/analytics/users/cohorts
   * Yeni cohort oluştur
   */
  router.post('/users/cohorts', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { cohortName, cohortType, cohortDate } = req.body;

      if (!cohortName || !cohortDate) {
        return res.status(400).json({
          success: false,
          message: 'Cohort name and date are required'
        });
      }

      const result = await cohortAnalyzer.createCohort(tenantId, {
        cohortName,
        cohortType: cohortType || 'registration',
        cohortDate
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error creating cohort:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating cohort',
        error: error.message
      });
    }
  });

  /**
   * GET /api/admin/analytics/users/retention
   * Retention analizi
   */
  router.get('/users/retention', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { cohortDate, cohortType } = req.query;

      if (!cohortDate) {
        return res.status(400).json({
          success: false,
          message: 'Cohort date is required'
        });
      }

      const cohort = await cohortAnalyzer.analyzeCohort(
        tenantId,
        cohortType || 'registration',
        cohortDate
      );

      res.json({
        success: true,
        data: cohort
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting retention:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting retention',
        error: error.message
      });
    }
  });

  // ==================== BEHAVIOR ANALYTICS ====================

  /**
   * GET /api/admin/analytics/behavior/sessions
   * Session analizi
   */
  router.get('/behavior/sessions', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const dateRange = parseDateRange(req);

      const [sessions] = await pool.execute(
        `SELECT 
          AVG(duration) as avgDuration,
          AVG(pageViews) as avgPageViews,
          AVG(eventsCount) as avgEvents,
          COUNT(*) as totalSessions,
          COUNT(CASE WHEN conversion = true THEN 1 END) as convertedSessions
         FROM analytics_sessions
         WHERE tenantId = ? AND sessionStart >= ? AND sessionStart <= ?`,
        [tenantId, dateRange.start, dateRange.end]
      );

      res.json({
        success: true,
        data: sessions[0] || {}
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting sessions',
        error: error.message
      });
    }
  });

  /**
   * GET /api/admin/analytics/behavior/screens
   * Ekran analizi
   */
  router.get('/behavior/screens', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const dateRange = parseDateRange(req);
      const limit = parseInt(req.query.limit) || 20;

      const [screens] = await pool.execute(
        `SELECT 
          screenName,
          COUNT(*) as views,
          COUNT(DISTINCT userId, deviceId) as uniqueUsers,
          AVG(JSON_EXTRACT(properties, '$.timeOnScreen')) as avgTimeOnScreen
         FROM analytics_events
         WHERE tenantId = ? AND eventType = 'screen_view' AND timestamp >= ? AND timestamp <= ?
         GROUP BY screenName
         ORDER BY views DESC
         LIMIT ?`,
        [tenantId, dateRange.start, dateRange.end, limit]
      );

      res.json({
        success: true,
        data: screens
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting screens:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting screens',
        error: error.message
      });
    }
  });

  /**
   * GET /api/admin/analytics/behavior/navigation
   * Navigasyon analizi
   */
  router.get('/behavior/navigation', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const dateRange = parseDateRange(req);

      const [navigation] = await pool.execute(
        `SELECT 
          e1.screenName as fromScreen,
          e2.screenName as toScreen,
          COUNT(*) as transitions
         FROM analytics_events e1
         INNER JOIN analytics_events e2 ON e1.sessionId = e2.sessionId
         WHERE e1.tenantId = ? 
         AND e1.eventType = 'screen_view' 
         AND e2.eventType = 'screen_view'
         AND e1.timestamp < e2.timestamp
         AND TIMESTAMPDIFF(SECOND, e1.timestamp, e2.timestamp) < 300
         AND e1.timestamp >= ? AND e1.timestamp <= ?
         GROUP BY e1.screenName, e2.screenName
         ORDER BY transitions DESC
         LIMIT 50`,
        [tenantId, dateRange.start, dateRange.end]
      );

      res.json({
        success: true,
        data: navigation
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting navigation:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting navigation',
        error: error.message
      });
    }
  });

  // ==================== REPORTS ====================

  /**
   * GET /api/admin/analytics/reports
   * Rapor listesi
   */
  router.get('/reports', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const reports = await reportingEngine.getReports(tenantId, limit, offset);

      res.json({
        success: true,
        data: reports
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting reports:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting reports',
        error: error.message
      });
    }
  });

  /**
   * POST /api/admin/analytics/reports/generate
   * Rapor oluştur
   */
  router.post('/reports/generate', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { reportName, reportType, reportTemplate, parameters, dateRange } = req.body;

      if (!reportName || !reportType) {
        return res.status(400).json({
          success: false,
          message: 'Report name and type are required'
        });
      }

      const result = await reportingEngine.generateReport(tenantId, {
        reportName,
        reportType,
        reportTemplate,
        parameters,
        dateRange: dateRange ? {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end)
        } : null
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error generating report:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating report',
        error: error.message
      });
    }
  });

  /**
   * GET /api/admin/analytics/reports/:reportId
   * Rapor detayı
   */
  router.get('/reports/:reportId', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const reportId = parseInt(req.params.reportId);

      const [reports] = await pool.execute(
        `SELECT * FROM analytics_reports WHERE id = ? AND tenantId = ?`,
        [reportId, tenantId]
      );

      if (reports.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      const report = reports[0];
      report.parameters = JSON.parse(report.parameters || '{}');
      report.results = JSON.parse(report.results || '{}');

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error getting report:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting report',
        error: error.message
      });
    }
  });

  /**
   * GET /api/admin/analytics/reports/:reportId/export
   * Rapor export
   */
  router.get('/reports/:reportId/export', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const reportId = parseInt(req.params.reportId);
      const format = req.query.format || 'pdf';

      let result;
      if (format === 'pdf') {
        result = await reportingEngine.exportToPDF(reportId, tenantId);
      } else if (format === 'excel' || format === 'xlsx') {
        result = await reportingEngine.exportToExcel(reportId, tenantId);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid format. Use pdf or excel'
        });
      }

      res.json({
        success: true,
        data: {
          filePath: result.filePath,
          fileName: result.fileName
        }
      });
    } catch (error) {
      console.error('❌ Admin Analytics: Error exporting report:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting report',
        error: error.message
      });
    }
  });

  return router;
}

module.exports = createAdminAnalyticsRoutes;

