/**
 * Aggregation Engine - Toplu işleme motoru
 * Günlük/haftalık/aylık aggregasyon, metrik hesaplama
 */
class AggregationEngine {
  constructor(poolWrapper) {
    this.pool = poolWrapper;
  }

  /**
   * Günlük aggregasyon
   */
  async aggregateDaily(tenantId, date) {
    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // Mevcut aggregasyonu kontrol et
      const [existing] = await this.pool.execute(
        `SELECT id FROM analytics_aggregates 
         WHERE tenantId = ? AND aggregateDate = ? AND aggregateType = 'daily'`,
        [tenantId, date]
      );

      // Metrikleri hesapla
      const metrics = await this.calculateMetrics(tenantId, startDate, endDate);

      if (existing.length > 0) {
        // Güncelle
        await this.pool.execute(
          `UPDATE analytics_aggregates SET
            totalUsers = ?, activeUsers = ?, totalSessions = ?, totalEvents = ?,
            totalRevenue = ?, avgSessionDuration = ?, bounceRate = ?,
            dau = ?, newUsers = ?, returningUsers = ?, retentionRate = ?,
            productViews = ?, addToCart = ?, checkout = ?, purchase = ?,
            avgPageLoadTime = ?, errorRate = ?, crashRate = ?,
            metadata = ?, updatedAt = NOW()
           WHERE id = ?`,
          [
            metrics.totalUsers,
            metrics.activeUsers,
            metrics.totalSessions,
            metrics.totalEvents,
            metrics.totalRevenue,
            metrics.avgSessionDuration,
            metrics.bounceRate,
            metrics.dau,
            metrics.newUsers,
            metrics.returningUsers,
            metrics.retentionRate,
            metrics.productViews,
            metrics.addToCart,
            metrics.checkout,
            metrics.purchase,
            metrics.avgPageLoadTime,
            metrics.errorRate,
            metrics.crashRate,
            JSON.stringify(metrics.metadata),
            existing[0].id
          ]
        );
      } else {
        // Yeni kayıt oluştur
        await this.pool.execute(
          `INSERT INTO analytics_aggregates (
            tenantId, aggregateDate, aggregateType,
            totalUsers, activeUsers, totalSessions, totalEvents,
            totalRevenue, avgSessionDuration, bounceRate,
            dau, newUsers, returningUsers, retentionRate,
            productViews, addToCart, checkout, purchase,
            avgPageLoadTime, errorRate, crashRate, metadata
          ) VALUES (?, ?, 'daily', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tenantId,
            date,
            metrics.totalUsers,
            metrics.activeUsers,
            metrics.totalSessions,
            metrics.totalEvents,
            metrics.totalRevenue,
            metrics.avgSessionDuration,
            metrics.bounceRate,
            metrics.dau,
            metrics.newUsers,
            metrics.returningUsers,
            metrics.retentionRate,
            metrics.productViews,
            metrics.addToCart,
            metrics.checkout,
            metrics.purchase,
            metrics.avgPageLoadTime,
            metrics.errorRate,
            metrics.crashRate,
            JSON.stringify(metrics.metadata)
          ]
        );
      }

      return { success: true, metrics };
    } catch (error) {
      console.error('❌ Aggregation Engine: Error aggregating daily:', error);
      throw error;
    }
  }

  /**
   * Haftalık aggregasyon
   */
  async aggregateWeekly(tenantId, weekStartDate) {
    try {
      const startDate = new Date(weekStartDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      const weekEndDate = new Date(endDate);

      // Metrikleri hesapla
      const metrics = await this.calculateMetrics(tenantId, startDate, endDate);

      // WAU hesapla (son 7 günün aktif kullanıcıları)
      const [wauData] = await this.pool.execute(
        `SELECT COUNT(DISTINCT userId, deviceId) as count
         FROM analytics_sessions
         WHERE tenantId = ? AND sessionStart >= ? AND sessionStart <= ?`,
        [tenantId, startDate, endDate]
      );

      metrics.wau = wauData[0]?.count || 0;

      // Mevcut aggregasyonu kontrol et
      const [existing] = await this.pool.execute(
        `SELECT id FROM analytics_aggregates 
         WHERE tenantId = ? AND aggregateDate = ? AND aggregateType = 'weekly'`,
        [tenantId, weekStartDate]
      );

      if (existing.length > 0) {
        await this.pool.execute(
          `UPDATE analytics_aggregates SET
            totalUsers = ?, activeUsers = ?, totalSessions = ?, totalEvents = ?,
            totalRevenue = ?, avgSessionDuration = ?, bounceRate = ?,
            wau = ?, newUsers = ?, returningUsers = ?, retentionRate = ?,
            productViews = ?, addToCart = ?, checkout = ?, purchase = ?,
            avgPageLoadTime = ?, errorRate = ?, crashRate = ?,
            metadata = ?, updatedAt = NOW()
           WHERE id = ?`,
          [
            metrics.totalUsers,
            metrics.activeUsers,
            metrics.totalSessions,
            metrics.totalEvents,
            metrics.totalRevenue,
            metrics.avgSessionDuration,
            metrics.bounceRate,
            metrics.wau,
            metrics.newUsers,
            metrics.returningUsers,
            metrics.retentionRate,
            metrics.productViews,
            metrics.addToCart,
            metrics.checkout,
            metrics.purchase,
            metrics.avgPageLoadTime,
            metrics.errorRate,
            metrics.crashRate,
            JSON.stringify(metrics.metadata),
            existing[0].id
          ]
        );
      } else {
        await this.pool.execute(
          `INSERT INTO analytics_aggregates (
            tenantId, aggregateDate, aggregateType,
            totalUsers, activeUsers, totalSessions, totalEvents,
            totalRevenue, avgSessionDuration, bounceRate,
            wau, newUsers, returningUsers, retentionRate,
            productViews, addToCart, checkout, purchase,
            avgPageLoadTime, errorRate, crashRate, metadata
          ) VALUES (?, ?, 'weekly', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tenantId,
            weekStartDate,
            metrics.totalUsers,
            metrics.activeUsers,
            metrics.totalSessions,
            metrics.totalEvents,
            metrics.totalRevenue,
            metrics.avgSessionDuration,
            metrics.bounceRate,
            metrics.wau,
            metrics.newUsers,
            metrics.returningUsers,
            metrics.retentionRate,
            metrics.productViews,
            metrics.addToCart,
            metrics.checkout,
            metrics.purchase,
            metrics.avgPageLoadTime,
            metrics.errorRate,
            metrics.crashRate,
            JSON.stringify(metrics.metadata)
          ]
        );
      }

      return { success: true, metrics };
    } catch (error) {
      console.error('❌ Aggregation Engine: Error aggregating weekly:', error);
      throw error;
    }
  }

  /**
   * Aylık aggregasyon
   */
  async aggregateMonthly(tenantId, year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(year, month, 0);
      endDate.setHours(23, 59, 59, 999);

      const monthStartDate = new Date(startDate);

      // Metrikleri hesapla
      const metrics = await this.calculateMetrics(tenantId, startDate, endDate);

      // MAU hesapla
      const [mauData] = await this.pool.execute(
        `SELECT COUNT(DISTINCT userId, deviceId) as count
         FROM analytics_sessions
         WHERE tenantId = ? AND sessionStart >= ? AND sessionStart <= ?`,
        [tenantId, startDate, endDate]
      );

      metrics.mau = mauData[0]?.count || 0;

      // Mevcut aggregasyonu kontrol et
      const [existing] = await this.pool.execute(
        `SELECT id FROM analytics_aggregates 
         WHERE tenantId = ? AND aggregateDate = ? AND aggregateType = 'monthly'`,
        [tenantId, monthStartDate]
      );

      if (existing.length > 0) {
        await this.pool.execute(
          `UPDATE analytics_aggregates SET
            totalUsers = ?, activeUsers = ?, totalSessions = ?, totalEvents = ?,
            totalRevenue = ?, avgSessionDuration = ?, bounceRate = ?,
            mau = ?, newUsers = ?, returningUsers = ?, retentionRate = ?,
            productViews = ?, addToCart = ?, checkout = ?, purchase = ?,
            avgPageLoadTime = ?, errorRate = ?, crashRate = ?,
            metadata = ?, updatedAt = NOW()
           WHERE id = ?`,
          [
            metrics.totalUsers,
            metrics.activeUsers,
            metrics.totalSessions,
            metrics.totalEvents,
            metrics.totalRevenue,
            metrics.avgSessionDuration,
            metrics.bounceRate,
            metrics.mau,
            metrics.newUsers,
            metrics.returningUsers,
            metrics.retentionRate,
            metrics.productViews,
            metrics.addToCart,
            metrics.checkout,
            metrics.purchase,
            metrics.avgPageLoadTime,
            metrics.errorRate,
            metrics.crashRate,
            JSON.stringify(metrics.metadata),
            existing[0].id
          ]
        );
      } else {
        await this.pool.execute(
          `INSERT INTO analytics_aggregates (
            tenantId, aggregateDate, aggregateType,
            totalUsers, activeUsers, totalSessions, totalEvents,
            totalRevenue, avgSessionDuration, bounceRate,
            mau, newUsers, returningUsers, retentionRate,
            productViews, addToCart, checkout, purchase,
            avgPageLoadTime, errorRate, crashRate, metadata
          ) VALUES (?, ?, 'monthly', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tenantId,
            monthStartDate,
            metrics.totalUsers,
            metrics.activeUsers,
            metrics.totalSessions,
            metrics.totalEvents,
            metrics.totalRevenue,
            metrics.avgSessionDuration,
            metrics.bounceRate,
            metrics.mau,
            metrics.newUsers,
            metrics.returningUsers,
            metrics.retentionRate,
            metrics.productViews,
            metrics.addToCart,
            metrics.checkout,
            metrics.purchase,
            metrics.avgPageLoadTime,
            metrics.errorRate,
            metrics.crashRate,
            JSON.stringify(metrics.metadata)
          ]
        );
      }

      return { success: true, metrics };
    } catch (error) {
      console.error('❌ Aggregation Engine: Error aggregating monthly:', error);
      throw error;
    }
  }

  /**
   * Metrikleri hesapla
   */
  async calculateMetrics(tenantId, startDate, endDate) {
    try {
      // Toplam kullanıcı sayısı
      const [totalUsers] = await this.pool.execute(
        `SELECT COUNT(DISTINCT userId, deviceId) as count
         FROM analytics_sessions
         WHERE tenantId = ? AND sessionStart >= ? AND sessionStart <= ?`,
        [tenantId, startDate, endDate]
      );

      // Aktif kullanıcı sayısı
      const [activeUsers] = await this.pool.execute(
        `SELECT COUNT(DISTINCT userId, deviceId) as count
         FROM analytics_sessions
         WHERE tenantId = ? AND sessionStart >= ? AND sessionStart <= ? AND isActive = true`,
        [tenantId, startDate, endDate]
      );

      // Toplam session sayısı
      const [totalSessions] = await this.pool.execute(
        `SELECT COUNT(*) as count
         FROM analytics_sessions
         WHERE tenantId = ? AND sessionStart >= ? AND sessionStart <= ?`,
        [tenantId, startDate, endDate]
      );

      // Toplam event sayısı
      const [totalEvents] = await this.pool.execute(
        `SELECT COUNT(*) as count
         FROM analytics_events
         WHERE tenantId = ? AND timestamp >= ? AND timestamp <= ?`,
        [tenantId, startDate, endDate]
      );

      // Toplam gelir
      const [revenue] = await this.pool.execute(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM analytics_events
         WHERE tenantId = ? AND eventType = 'purchase' AND timestamp >= ? AND timestamp <= ?`,
        [tenantId, startDate, endDate]
      );

      // Ortalama session süresi
      const [avgDuration] = await this.pool.execute(
        `SELECT AVG(duration) as avg
         FROM analytics_sessions
         WHERE tenantId = ? AND sessionStart >= ? AND sessionStart <= ? AND duration IS NOT NULL`,
        [tenantId, startDate, endDate]
      );

      // Bounce rate (1 sayfa görüntüleme ve çıkış)
      const [bounceSessions] = await this.pool.execute(
        `SELECT COUNT(*) as count
         FROM analytics_sessions
         WHERE tenantId = ? AND sessionStart >= ? AND sessionStart <= ?
         AND pageViews = 1 AND duration < 30`,
        [tenantId, startDate, endDate]
      );

      const bounceRate = totalSessions[0]?.count > 0
        ? ((bounceSessions[0]?.count / totalSessions[0].count) * 100).toFixed(2)
        : 0;

      // DAU (Daily Active Users)
      const [dau] = await this.pool.execute(
        `SELECT COUNT(DISTINCT userId, deviceId) as count
         FROM analytics_sessions
         WHERE tenantId = ? AND DATE(sessionStart) = DATE(?)`,
        [tenantId, startDate]
      );

      // Yeni kullanıcılar
      const [newUsers] = await this.pool.execute(
        `SELECT COUNT(DISTINCT userId, deviceId) as count
         FROM analytics_sessions s
         WHERE s.tenantId = ? AND s.sessionStart >= ? AND s.sessionStart <= ?
         AND NOT EXISTS (
           SELECT 1 FROM analytics_sessions s2
           WHERE s2.tenantId = s.tenantId
           AND (s2.userId = s.userId OR s2.deviceId = s.deviceId)
           AND s2.sessionStart < s.sessionStart
         )`,
        [tenantId, startDate, endDate]
      );

      // Dönen kullanıcılar
      const returningUsers = (totalUsers[0]?.count || 0) - (newUsers[0]?.count || 0);

      // Product views
      const [productViews] = await this.pool.execute(
        `SELECT COUNT(*) as count
         FROM analytics_events
         WHERE tenantId = ? AND eventType = 'product_view' AND timestamp >= ? AND timestamp <= ?`,
        [tenantId, startDate, endDate]
      );

      // Add to cart
      const [addToCart] = await this.pool.execute(
        `SELECT COUNT(*) as count
         FROM analytics_events
         WHERE tenantId = ? AND eventType = 'add_to_cart' AND timestamp >= ? AND timestamp <= ?`,
        [tenantId, startDate, endDate]
      );

      // Checkout
      const [checkout] = await this.pool.execute(
        `SELECT COUNT(*) as count
         FROM analytics_events
         WHERE tenantId = ? AND eventType = 'checkout_start' AND timestamp >= ? AND timestamp <= ?`,
        [tenantId, startDate, endDate]
      );

      // Purchase
      const [purchase] = await this.pool.execute(
        `SELECT COUNT(*) as count
         FROM analytics_events
         WHERE tenantId = ? AND eventType = 'purchase' AND timestamp >= ? AND timestamp <= ?`,
        [tenantId, startDate, endDate]
      );

      // Performance metrics
      const [performance] = await this.pool.execute(
        `SELECT 
          AVG(JSON_EXTRACT(performanceMetrics, '$.loadTime')) as avgLoadTime,
          COUNT(CASE WHEN eventType = 'error' THEN 1 END) as errorCount
         FROM analytics_events
         WHERE tenantId = ? AND timestamp >= ? AND timestamp <= ?
         AND performanceMetrics IS NOT NULL`,
        [tenantId, startDate, endDate]
      );

      const errorRate = totalEvents[0]?.count > 0
        ? ((performance[0]?.errorCount || 0) / totalEvents[0].count * 100).toFixed(2)
        : 0;

      return {
        totalUsers: totalUsers[0]?.count || 0,
        activeUsers: activeUsers[0]?.count || 0,
        totalSessions: totalSessions[0]?.count || 0,
        totalEvents: totalEvents[0]?.count || 0,
        totalRevenue: parseFloat(revenue[0]?.total || 0),
        avgSessionDuration: Math.floor(avgDuration[0]?.avg || 0),
        bounceRate: parseFloat(bounceRate),
        dau: dau[0]?.count || 0,
        newUsers: newUsers[0]?.count || 0,
        returningUsers: returningUsers,
        retentionRate: 0, // Bu daha kompleks bir hesaplama gerektirir
        productViews: productViews[0]?.count || 0,
        addToCart: addToCart[0]?.count || 0,
        checkout: checkout[0]?.count || 0,
        purchase: purchase[0]?.count || 0,
        avgPageLoadTime: Math.floor(performance[0]?.avgLoadTime || 0),
        errorRate: parseFloat(errorRate),
        crashRate: 0, // Crash tracking ayrı bir sistem gerektirir
        metadata: {}
      };
    } catch (error) {
      console.error('❌ Aggregation Engine: Error calculating metrics:', error);
      throw error;
    }
  }
}

module.exports = AggregationEngine;


















