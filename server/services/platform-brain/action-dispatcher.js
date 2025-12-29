/**
 * Platform Brain - Action Dispatcher
 * 
 * Executes actions suggested by the decision engine.
 * Integrates with existing backend services (notifications, campaigns, homepage).
 */

const { poolWrapper } = require('../../database-schema');
const DecisionEngine = require('./decision-engine');

class ActionDispatcher {
  constructor() {
    this.decisionEngine = new DecisionEngine();
    this.enabled = false;
  }

  /**
   * Enable/disable the dispatcher
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Dispatch actions from a decision
   */
  async dispatchActions(decision, context) {
    if (!this.enabled || this.decisionEngine.executionMode !== 'execute') {
      return {
        dispatched: false,
        reason: 'Dispatcher disabled or not in execute mode'
      };
    }

    try {
      const results = [];

      for (const action of decision.actions) {
        const result = await this.executeAction(action, context);
        results.push(result);
      }

      return {
        dispatched: true,
        results,
        decisionId: decision.ruleId
      };
    } catch (error) {
      console.error('❌ Platform Brain: Error dispatching actions:', error);
      return {
        dispatched: false,
        error: error.message
      };
    }
  }

  /**
   * Execute a single action
   */
  async executeAction(action, context) {
    try {
      switch (action.type) {
        case 'send_notification':
          return await this.sendNotification(action, context);

        case 'apply_discount':
          return await this.applyDiscount(action, context);

        case 'show_campaign':
          return await this.showCampaign(action, context);

        case 'recommend_products':
          return await this.recommendProducts(action, context);

        case 'update_homepage':
          return await this.updateHomepage(action, context);

        default:
          return {
            success: false,
            error: `Unknown action type: ${action.type}`
          };
      }
    } catch (error) {
      console.error(`❌ Platform Brain: Error executing action ${action.type}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send notification to user
   */
  async sendNotification(action, context) {
    try {
      const { userId, tenantId } = context;
      const { title, message, type = 'info', data } = action.params || {};

      // Insert into notifications table (assuming it exists)
      // This would integrate with your existing notification system
      await poolWrapper.execute(`
        INSERT INTO notifications
        (tenantId, userId, title, message, type, data, source, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, 'platform_brain', NOW())
      `, [
        tenantId,
        userId,
        title || 'Platform Notification',
        message || '',
        type,
        JSON.stringify(data || {})
      ]);

      return {
        success: true,
        actionType: 'send_notification',
        message: 'Notification queued'
      };
    } catch (error) {
      // If notifications table doesn't exist, log and continue
      console.warn('⚠️ Platform Brain: Notification system not available:', error.message);
      return {
        success: false,
        error: 'Notification system unavailable'
      };
    }
  }

  /**
   * Apply discount/coupon to user
   */
  async applyDiscount(action, context) {
    try {
      const { userId, tenantId } = context;
      const { discountCode, discountPercent, discountAmount } = action.params || {};

      // Create a campaign usage entry or apply coupon
      // This integrates with your existing campaign system
      if (discountCode) {
        await poolWrapper.execute(`
          INSERT INTO campaign_usage
          (tenantId, userId, campaignId, discountCode, usedAt)
          SELECT ?, ?, c.id, ?, NOW()
          FROM campaigns c
          WHERE c.tenantId = ? AND c.discountCode = ? AND c.isActive = 1
          LIMIT 1
        `, [tenantId, userId, discountCode, tenantId, discountCode]);
      }

      return {
        success: true,
        actionType: 'apply_discount',
        discountCode: discountCode || 'auto_applied'
      };
    } catch (error) {
      console.error('❌ Platform Brain: Error applying discount:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Show campaign to user
   */
  async showCampaign(action, context) {
    try {
      const { userId, tenantId } = context;
      const { campaignId } = action.params || {};

      // Mark campaign as shown to user
      await poolWrapper.execute(`
        INSERT INTO campaign_usage
        (tenantId, userId, campaignId, shownAt)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE shownAt = NOW()
      `, [tenantId, userId, campaignId]);

      return {
        success: true,
        actionType: 'show_campaign',
        campaignId
      };
    } catch (error) {
      console.error('❌ Platform Brain: Error showing campaign:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Recommend products (updates user recommendations)
   */
  async recommendProducts(action, context) {
    try {
      const { userId, tenantId } = context;
      const { productIds, categoryIds, reason } = action.params || {};

      // Update recommendations table
      if (productIds && productIds.length > 0) {
        for (const productId of productIds) {
          await poolWrapper.execute(`
            INSERT INTO recommendations
            (tenantId, userId, productId, reason, source, createdAt)
            VALUES (?, ?, ?, ?, 'platform_brain', NOW())
            ON DUPLICATE KEY UPDATE
              reason = VALUES(reason),
              source = 'platform_brain',
              updatedAt = NOW()
          `, [tenantId, userId, productId, reason || 'Platform Brain recommendation']);
        }
      }

      return {
        success: true,
        actionType: 'recommend_products',
        productCount: productIds?.length || 0
      };
    } catch (error) {
      console.error('❌ Platform Brain: Error recommending products:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update homepage content for user
   */
  async updateHomepage(action, context) {
    try {
      const { userId, tenantId } = context;
      const { featuredProducts, banners, sections } = action.params || {};

      // Store personalized homepage config in Redis or database
      // This would integrate with your homepage API
      const homepageConfig = {
        featuredProducts: featuredProducts || [],
        banners: banners || [],
        sections: sections || [],
        personalizedAt: new Date().toISOString()
      };

      // Store in Redis for fast retrieval
      const { setJsonEx, CACHE_TTL } = require('../../redis');
      await setJsonEx(
        `platform_brain:homepage:${tenantId}:${userId}`,
        CACHE_TTL.MEDIUM,
        homepageConfig
      );

      return {
        success: true,
        actionType: 'update_homepage',
        config: homepageConfig
      };
    } catch (error) {
      console.error('❌ Platform Brain: Error updating homepage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ActionDispatcher;









