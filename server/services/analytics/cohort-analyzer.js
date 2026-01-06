/**
 * Cohort Analyzer - Kullanıcı kohort analizi
 */
class CohortAnalyzer {
  constructor(poolWrapper) {
    this.pool = poolWrapper;
  }

  /**
   * Cohort oluştur
   */
  async createCohort(tenantId, cohortData) {
    try {
      const {
        cohortName,
        cohortType = 'registration',
        cohortDate
      } = cohortData;

      // Cohort analizini çalıştır
      const analysis = await this.analyzeCohort(tenantId, cohortType, cohortDate);

      // Cohort kaydı oluştur
      const [result] = await this.pool.execute(
        `INSERT INTO analytics_cohorts (
          tenantId, cohortName, cohortType, cohortDate, totalUsers,
          retentionData, revenueData
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          totalUsers = VALUES(totalUsers),
          retentionData = VALUES(retentionData),
          revenueData = VALUES(revenueData),
          updatedAt = NOW()`,
        [
          tenantId,
          cohortName,
          cohortType,
          cohortDate,
          analysis.totalUsers,
          JSON.stringify(analysis.retentionData),
          JSON.stringify(analysis.revenueData)
        ]
      );

      return {
        success: true,
        cohortId: result.insertId || result.affectedRows,
        analysis
      };
    } catch (error) {
      console.error('❌ Cohort Analyzer: Error creating cohort:', error);
      throw error;
    }
  }

  /**
   * Cohort analizi
   */
  async analyzeCohort(tenantId, cohortType, cohortDate) {
    try {
      let cohortUsers = [];

      if (cohortType === 'registration') {
        // Kayıt tarihine göre kullanıcılar
        const [users] = await this.pool.execute(
          `SELECT DISTINCT userId FROM users
           WHERE tenantId = ? AND DATE(createdAt) = ? AND userId IS NOT NULL`,
          [tenantId, cohortDate]
        );
        cohortUsers = users.map(u => u.userId);
      } else if (cohortType === 'first_purchase') {
        // İlk satın alma tarihine göre kullanıcılar
        const [users] = await this.pool.execute(
          `SELECT DISTINCT userId FROM analytics_events
           WHERE tenantId = ? AND eventType = 'purchase' AND userId IS NOT NULL
           AND userId IN (
             SELECT userId FROM (
               SELECT userId, MIN(timestamp) as firstPurchase
               FROM analytics_events
               WHERE tenantId = ? AND eventType = 'purchase'
               GROUP BY userId
             ) AS first_purchases
             WHERE DATE(firstPurchase) = ?
           )`,
          [tenantId, tenantId, cohortDate]
        );
        cohortUsers = users.map(u => u.userId);
      }

      const totalUsers = cohortUsers.length;

      // Retention hesaplama (haftalık)
      const retentionData = await this.calculateRetention(tenantId, cohortUsers, cohortDate);

      // Revenue hesaplama
      const revenueData = await this.calculateRevenue(tenantId, cohortUsers, cohortDate);

      return {
        totalUsers,
        retentionData,
        revenueData
      };
    } catch (error) {
      console.error('❌ Cohort Analyzer: Error analyzing cohort:', error);
      throw error;
    }
  }

  /**
   * Retention hesaplama
   */
  async calculateRetention(tenantId, userIds, cohortDate) {
    try {
      const retention = {};
      const cohortStart = new Date(cohortDate);

      // 12 hafta boyunca retention hesapla
      for (let week = 0; week <= 12; week++) {
        const weekStart = new Date(cohortStart);
        weekStart.setDate(weekStart.getDate() + (week * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        if (userIds.length === 0) {
          retention[`week_${week}`] = 0;
          continue;
        }

        const [active] = await this.pool.execute(
          `SELECT COUNT(DISTINCT userId) as count
           FROM analytics_sessions
           WHERE tenantId = ? AND userId IN (${userIds.map(() => '?').join(',')})
           AND sessionStart >= ? AND sessionStart <= ?`,
          [tenantId, ...userIds, weekStart, weekEnd]
        );

        const retentionRate = userIds.length > 0
          ? ((active[0]?.count || 0) / userIds.length * 100).toFixed(2)
          : 0;

        retention[`week_${week}`] = {
          active: active[0]?.count || 0,
          retentionRate: parseFloat(retentionRate)
        };
      }

      return retention;
    } catch (error) {
      console.error('❌ Cohort Analyzer: Error calculating retention:', error);
      return {};
    }
  }

  /**
   * Revenue hesaplama
   */
  async calculateRevenue(tenantId, userIds, cohortDate) {
    try {
      if (userIds.length === 0) {
        return {
          totalRevenue: 0,
          averageRevenue: 0,
          revenueByWeek: {}
        };
      }

      // Toplam gelir
      const [total] = await this.pool.execute(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM analytics_events
         WHERE tenantId = ? AND userId IN (${userIds.map(() => '?').join(',')})
         AND eventType = 'purchase'`,
        [tenantId, ...userIds]
      );

      const totalRevenue = parseFloat(total[0]?.total || 0);
      const averageRevenue = userIds.length > 0 ? totalRevenue / userIds.length : 0;

      // Haftalık gelir
      const revenueByWeek = {};
      const cohortStart = new Date(cohortDate);

      for (let week = 0; week <= 12; week++) {
        const weekStart = new Date(cohortStart);
        weekStart.setDate(weekStart.getDate() + (week * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const [revenue] = await this.pool.execute(
          `SELECT COALESCE(SUM(amount), 0) as total
           FROM analytics_events
           WHERE tenantId = ? AND userId IN (${userIds.map(() => '?').join(',')})
           AND eventType = 'purchase' AND timestamp >= ? AND timestamp <= ?`,
          [tenantId, ...userIds, weekStart, weekEnd]
        );

        revenueByWeek[`week_${week}`] = parseFloat(revenue[0]?.total || 0);
      }

      return {
        totalRevenue,
        averageRevenue,
        revenueByWeek
      };
    } catch (error) {
      console.error('❌ Cohort Analyzer: Error calculating revenue:', error);
      return {
        totalRevenue: 0,
        averageRevenue: 0,
        revenueByWeek: {}
      };
    }
  }

  /**
   * Cohort listesi
   */
  async getCohorts(tenantId, limit = 50) {
    try {
      const [cohorts] = await this.pool.execute(
        `SELECT * FROM analytics_cohorts
         WHERE tenantId = ?
         ORDER BY cohortDate DESC
         LIMIT ?`,
        [tenantId, limit]
      );

      return cohorts.map(cohort => ({
        ...cohort,
        retentionData: JSON.parse(cohort.retentionData || '{}'),
        revenueData: JSON.parse(cohort.revenueData || '{}')
      }));
    } catch (error) {
      console.error('❌ Cohort Analyzer: Error getting cohorts:', error);
      throw error;
    }
  }
}

module.exports = CohortAnalyzer;















