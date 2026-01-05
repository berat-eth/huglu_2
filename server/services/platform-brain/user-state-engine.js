/**
 * Platform Brain - User State Engine
 * 
 * Computes user readiness, affinity, and behavioral state using existing user behavior.
 * Stores computed state in Redis for fast access.
 */

const { getJson, setJsonEx, CACHE_TTL } = require('../../redis');
const { poolWrapper } = require('../../database-schema');

class UserStateEngine {
  constructor() {
    this.enabled = false;
    this.stateTTL = CACHE_TTL.MEDIUM; // 10 minutes default
  }

  /**
   * Enable/disable the engine
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Get Redis key for user state
   */
  getUserStateKey(userId, tenantId = 1) {
    return `platform_brain:user_state:${tenantId}:${userId}`;
  }

  /**
   * Compute user readiness score (0-100)
   * Based on: recent activity, cart value, purchase history, engagement
   */
  async computeReadinessScore(userId, tenantId = 1) {
    if (!this.enabled) return null;

    try {
      const cacheKey = `${this.getUserStateKey(userId, tenantId)}:readiness`;
      const cached = await getJson(cacheKey);
      if (cached !== null) return cached;

      // Calculate readiness from user behavior
      const [events] = await poolWrapper.execute(`
        SELECT 
          eventType,
          COUNT(*) as count,
          MAX(timestamp) as lastEvent
        FROM user_events
        WHERE userId = ? AND tenantId = ?
          AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY eventType
      `, [userId, tenantId]);

      const [cartData] = await poolWrapper.execute(`
        SELECT COUNT(*) as itemCount, SUM(quantity * price) as totalValue
        FROM cart
        WHERE userId = ? AND tenantId = ?
      `, [userId, tenantId]);

      const [orderData] = await poolWrapper.execute(`
        SELECT COUNT(*) as orderCount, SUM(totalAmount) as totalSpent
        FROM orders
        WHERE userId = ? AND tenantId = ?
          AND createdAt >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      `, [userId, tenantId]);

      // Scoring algorithm
      let score = 0;
      
      // Activity score (0-30 points)
      const eventCount = events.reduce((sum, e) => sum + e.count, 0);
      score += Math.min(30, (eventCount / 50) * 30);

      // Cart engagement (0-25 points)
      if (cartData[0]?.itemCount > 0) {
        score += Math.min(25, (cartData[0].itemCount / 5) * 25);
      }

      // Purchase history (0-30 points)
      if (orderData[0]?.orderCount > 0) {
        score += Math.min(30, (orderData[0].orderCount / 3) * 30);
      }

      // Recency bonus (0-15 points)
      const recentEvents = events.filter(e => {
        const daysSince = (Date.now() - new Date(e.lastEvent).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 7;
      });
      if (recentEvents.length > 0) {
        score += Math.min(15, (recentEvents.length / 5) * 15);
      }

      const readinessScore = Math.round(Math.min(100, Math.max(0, score)));

      // Cache the result
      await setJsonEx(cacheKey, this.stateTTL, readinessScore);

      return readinessScore;
    } catch (error) {
      console.error('❌ Platform Brain: Error computing readiness score:', error);
      return null;
    }
  }

  /**
   * Compute activity affinity (categories, products user engages with)
   */
  async computeActivityAffinity(userId, tenantId = 1) {
    if (!this.enabled) return null;

    try {
      const cacheKey = `${this.getUserStateKey(userId, tenantId)}:affinity`;
      const cached = await getJson(cacheKey);
      if (cached !== null) return cached;

      const [affinityData] = await poolWrapper.execute(`
        SELECT 
          p.categoryId,
          c.name as categoryName,
          COUNT(*) as viewCount,
          SUM(CASE WHEN e.eventType = 'purchase' THEN 1 ELSE 0 END) as purchaseCount
        FROM user_events e
        LEFT JOIN products p ON JSON_EXTRACT(e.properties, '$.productId') = p.id
        LEFT JOIN categories c ON p.categoryId = c.id
        WHERE e.userId = ? 
          AND e.tenantId = ?
          AND e.eventType IN ('product_view', 'purchase')
          AND e.timestamp >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        GROUP BY p.categoryId, c.name
        ORDER BY viewCount DESC, purchaseCount DESC
        LIMIT 10
      `, [userId, tenantId]);

      const affinity = affinityData.map(item => ({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        engagementScore: (item.viewCount * 0.5) + (item.purchaseCount * 2),
        viewCount: item.viewCount,
        purchaseCount: item.purchaseCount
      }));

      await setJsonEx(cacheKey, this.stateTTL, affinity);
      return affinity;
    } catch (error) {
      console.error('❌ Platform Brain: Error computing activity affinity:', error);
      return null;
    }
  }

  /**
   * Compute price sensitivity (0-100, higher = more price sensitive)
   */
  async computePriceSensitivity(userId, tenantId = 1) {
    if (!this.enabled) return null;

    try {
      const cacheKey = `${this.getUserStateKey(userId, tenantId)}:price_sensitivity`;
      const cached = await getJson(cacheKey);
      if (cached !== null) return cached;

      const [priceBehavior] = await poolWrapper.execute(`
        SELECT 
          AVG(JSON_EXTRACT(e.properties, '$.price')) as avgViewedPrice,
          AVG(o.totalAmount) as avgOrderValue,
          COUNT(DISTINCT o.id) as orderCount
        FROM user_events e
        LEFT JOIN orders o ON e.userId = o.userId AND e.tenantId = o.tenantId
        WHERE e.userId = ? AND e.tenantId = ?
          AND e.eventType = 'product_view'
          AND e.timestamp >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      `, [userId, tenantId]);

      // Simple heuristic: if user views low-price items but doesn't purchase, they're price sensitive
      // If they purchase high-value items, they're less price sensitive
      let sensitivity = 50; // Default neutral

      if (priceBehavior[0]?.avgViewedPrice && priceBehavior[0]?.avgOrderValue) {
        const priceRatio = priceBehavior[0].avgViewedPrice / priceBehavior[0].avgOrderValue;
        if (priceRatio > 1.2) {
          sensitivity = 75; // Views expensive but buys cheap = price sensitive
        } else if (priceRatio < 0.8) {
          sensitivity = 25; // Views and buys expensive = less sensitive
        }
      }

      await setJsonEx(cacheKey, this.stateTTL, sensitivity);
      return sensitivity;
    } catch (error) {
      console.error('❌ Platform Brain: Error computing price sensitivity:', error);
      return null;
    }
  }

  /**
   * Get complete user state
   */
  async getUserState(userId, tenantId = 1) {
    if (!this.enabled) return null;

    try {
      const [readiness, affinity, priceSensitivity] = await Promise.all([
        this.computeReadinessScore(userId, tenantId),
        this.computeActivityAffinity(userId, tenantId),
        this.computePriceSensitivity(userId, tenantId)
      ]);

      const state = {
        userId,
        tenantId,
        readinessScore: readiness || 0,
        activityAffinity: affinity || [],
        priceSensitivity: priceSensitivity || 50,
        computedAt: new Date().toISOString()
      };

      // Cache complete state
      await setJsonEx(
        this.getUserStateKey(userId, tenantId),
        this.stateTTL,
        state
      );

      return state;
    } catch (error) {
      console.error('❌ Platform Brain: Error getting user state:', error);
      return null;
    }
  }

  /**
   * Invalidate user state cache
   */
  async invalidateUserState(userId, tenantId = 1) {
    try {
      const { delPattern } = require('../../redis');
      await delPattern(`platform_brain:user_state:${tenantId}:${userId}*`);
    } catch (error) {
      console.error('❌ Platform Brain: Error invalidating user state:', error);
    }
  }
}

module.exports = UserStateEngine;













