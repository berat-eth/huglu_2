/**
 * Funnel Analyzer - Conversion funnel analizi
 */
class FunnelAnalyzer {
  constructor(poolWrapper) {
    this.pool = poolWrapper;
  }

  /**
   * Funnel oluştur
   */
  async createFunnel(tenantId, funnelData) {
    try {
      const {
        funnelName,
        funnelSteps,
        abTestId = null,
        dateRangeStart = null,
        dateRangeEnd = null
      } = funnelData;

      // Funnel analizini çalıştır
      const analysis = await this.analyzeFunnel(tenantId, funnelSteps, {
        start: dateRangeStart,
        end: dateRangeEnd
      });

      // Funnel kaydı oluştur
      const [result] = await this.pool.execute(
        `INSERT INTO analytics_funnels (
          tenantId, funnelName, funnelSteps, totalUsers, conversions,
          conversionRate, dropOffPoints, abTestId, dateRangeStart, dateRangeEnd
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          funnelName,
          JSON.stringify(funnelSteps),
          analysis[0]?.count || 0,
          analysis[analysis.length - 1]?.count || 0,
          analysis[analysis.length - 1]?.conversionRate || 0,
          JSON.stringify(analysis.map(step => ({
            step: step.stepName,
            dropOff: step.dropOff
          }))),
          abTestId,
          dateRangeStart,
          dateRangeEnd
        ]
      );

      return {
        success: true,
        funnelId: result.insertId,
        analysis
      };
    } catch (error) {
      console.error('❌ Funnel Analyzer: Error creating funnel:', error);
      throw error;
    }
  }

  /**
   * Funnel analizi
   */
  async analyzeFunnel(tenantId, funnelSteps, dateRange = null) {
    try {
      const whereClause = dateRange && dateRange.start && dateRange.end
        ? `AND timestamp >= ? AND timestamp <= ?`
        : '';
      
      const params = dateRange && dateRange.start && dateRange.end
        ? [tenantId, dateRange.start, dateRange.end]
        : [tenantId];

      const results = [];
      let previousCount = null;

      for (let i = 0; i < funnelSteps.length; i++) {
        const step = funnelSteps[i];
        
        const [count] = await this.pool.execute(
          `SELECT COUNT(DISTINCT userId, deviceId) as count 
           FROM analytics_events 
           WHERE tenantId = ? AND eventType = ? ${whereClause}`,
          [...params, step.eventType]
        );

        const stepCount = count[0]?.count || 0;
        const conversionRate = previousCount !== null && previousCount > 0
          ? ((stepCount / previousCount) * 100).toFixed(2)
          : 100;

        results.push({
          step: i + 1,
          stepName: step.name || step.eventType,
          eventType: step.eventType,
          count: stepCount,
          conversionRate: parseFloat(conversionRate),
          dropOff: previousCount !== null ? previousCount - stepCount : 0
        });

        previousCount = stepCount;
      }

      return results;
    } catch (error) {
      console.error('❌ Funnel Analyzer: Error analyzing funnel:', error);
      throw error;
    }
  }

  /**
   * Funnel listesi
   */
  async getFunnels(tenantId, isActive = true) {
    try {
      const [funnels] = await this.pool.execute(
        `SELECT * FROM analytics_funnels
         WHERE tenantId = ? ${isActive !== null ? 'AND isActive = ?' : ''}
         ORDER BY createdAt DESC`,
        isActive !== null ? [tenantId, isActive] : [tenantId]
      );

      return funnels.map(funnel => ({
        ...funnel,
        funnelSteps: JSON.parse(funnel.funnelSteps || '[]'),
        dropOffPoints: JSON.parse(funnel.dropOffPoints || '[]')
      }));
    } catch (error) {
      console.error('❌ Funnel Analyzer: Error getting funnels:', error);
      throw error;
    }
  }

  /**
   * Funnel detayı
   */
  async getFunnel(tenantId, funnelId) {
    try {
      const [funnels] = await this.pool.execute(
        `SELECT * FROM analytics_funnels
         WHERE id = ? AND tenantId = ?`,
        [funnelId, tenantId]
      );

      if (funnels.length === 0) {
        throw new Error('Funnel not found');
      }

      const funnel = funnels[0];
      return {
        ...funnel,
        funnelSteps: JSON.parse(funnel.funnelSteps || '[]'),
        dropOffPoints: JSON.parse(funnel.dropOffPoints || '[]')
      };
    } catch (error) {
      console.error('❌ Funnel Analyzer: Error getting funnel:', error);
      throw error;
    }
  }
}

module.exports = FunnelAnalyzer;









