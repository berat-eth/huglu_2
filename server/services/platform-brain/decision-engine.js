/**
 * Platform Brain - Decision Engine
 * 
 * Rule-based engine that evaluates conditions and suggests or executes actions.
 * Rules are stored in database and managed via admin panel.
 */

const { poolWrapper } = require('../../database-schema');
const UserStateEngine = require('./user-state-engine');

class DecisionEngine {
  constructor() {
    this.userStateEngine = new UserStateEngine();
    this.enabled = false;
    this.executionMode = 'log_only'; // log_only, suggest_only, execute
  }

  /**
   * Enable/disable the engine
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Set execution mode
   */
  setExecutionMode(mode) {
    if (['log_only', 'suggest_only', 'execute'].includes(mode)) {
      this.executionMode = mode;
    }
  }

  /**
   * Evaluate a rule against user state
   */
  async evaluateRule(rule, context) {
    if (!this.enabled || !rule.isActive) {
      return { matched: false, reason: 'Rule disabled or engine disabled' };
    }

    try {
      const { userId, tenantId, eventType, eventData } = context;

      // Get user state
      const userState = await this.userStateEngine.getUserState(userId, tenantId);
      if (!userState) {
        return { matched: false, reason: 'User state unavailable' };
      }

      // Parse rule conditions
      const conditions = typeof rule.conditions === 'string' 
        ? JSON.parse(rule.conditions) 
        : rule.conditions;

      // Evaluate conditions
      const conditionResults = await this.evaluateConditions(conditions, {
        userState,
        eventType,
        eventData,
        context
      });

      const allMatched = conditionResults.every(c => c.matched);

      if (!allMatched) {
        return {
          matched: false,
          reason: 'Conditions not met',
          conditionResults
        };
      }

      // Parse actions
      const actions = typeof rule.actions === 'string'
        ? JSON.parse(rule.actions)
        : rule.actions;

      return {
        matched: true,
        ruleId: rule.id,
        ruleName: rule.name,
        actions,
        conditionResults,
        userState: {
          readinessScore: userState.readinessScore,
          priceSensitivity: userState.priceSensitivity
        }
      };
    } catch (error) {
      console.error('❌ Platform Brain: Error evaluating rule:', error);
      return { matched: false, reason: `Error: ${error.message}` };
    }
  }

  /**
   * Evaluate individual conditions
   */
  async evaluateConditions(conditions, context) {
    const results = [];

    for (const condition of conditions) {
      let matched = false;
      let value = null;

      switch (condition.type) {
        case 'readiness_score':
          value = context.userState.readinessScore;
          matched = this.compareValue(value, condition.operator, condition.value);
          break;

        case 'price_sensitivity':
          value = context.userState.priceSensitivity;
          matched = this.compareValue(value, condition.operator, condition.value);
          break;

        case 'event_type':
          value = context.eventType;
          matched = value === condition.value;
          break;

        case 'category_affinity':
          const affinity = context.userState.activityAffinity || [];
          const categoryMatch = affinity.find(a => a.categoryId === condition.categoryId);
          value = categoryMatch?.engagementScore || 0;
          matched = this.compareValue(value, condition.operator, condition.value);
          break;

        case 'cart_value':
          // Would need to fetch cart data
          value = 0; // Placeholder
          matched = this.compareValue(value, condition.operator, condition.value);
          break;

        case 'user_segment':
          // Check if user is in segment
          matched = await this.checkUserSegment(context.userId, condition.segmentId, context.tenantId);
          break;

        default:
          matched = false;
      }

      results.push({
        type: condition.type,
        matched,
        value,
        expected: condition.value,
        operator: condition.operator
      });
    }

    return results;
  }

  /**
   * Compare value with operator
   */
  compareValue(actual, operator, expected) {
    switch (operator) {
      case '>':
        return actual > expected;
      case '>=':
        return actual >= expected;
      case '<':
        return actual < expected;
      case '<=':
        return actual <= expected;
      case '==':
      case '=':
        return actual === expected || actual == expected;
      case '!=':
        return actual !== expected && actual != expected;
      default:
        return false;
    }
  }

  /**
   * Check if user is in segment
   */
  async checkUserSegment(userId, segmentId, tenantId) {
    try {
      const [results] = await poolWrapper.execute(`
        SELECT COUNT(*) as count
        FROM customer_segment_assignments
        WHERE userId = ? AND segmentId = ? AND tenantId = ?
      `, [userId, segmentId, tenantId]);

      return results[0]?.count > 0;
    } catch (error) {
      console.error('❌ Platform Brain: Error checking user segment:', error);
      return false;
    }
  }

  /**
   * Evaluate all active rules for a context
   */
  async evaluateRules(context) {
    if (!this.enabled) {
      return { decisions: [], mode: this.executionMode };
    }

    try {
      const { tenantId } = context;

      // Get active rules for tenant
      const [rules] = await poolWrapper.execute(`
        SELECT id, name, description, conditions, actions, priority, isActive
        FROM platform_brain_rules
        WHERE tenantId = ? AND isActive = 1
        ORDER BY priority DESC, createdAt DESC
      `, [tenantId]);

      const decisions = [];

      for (const rule of rules) {
        const evaluation = await this.evaluateRule(rule, context);
        if (evaluation.matched) {
          decisions.push({
            ...evaluation,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Log decisions
      if (decisions.length > 0) {
        await this.logDecisions(context, decisions);
      }

      return {
        decisions,
        mode: this.executionMode,
        evaluatedRules: rules.length
      };
    } catch (error) {
      console.error('❌ Platform Brain: Error evaluating rules:', error);
      return { decisions: [], error: error.message };
    }
  }

  /**
   * Log decisions to database
   */
  async logDecisions(context, decisions) {
    try {
      const { userId, tenantId, eventType, eventData } = context;

      for (const decision of decisions) {
        await poolWrapper.execute(`
          INSERT INTO platform_brain_decisions
          (tenantId, userId, ruleId, ruleName, eventType, eventData, decisionData, executionMode, executed, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          tenantId,
          userId,
          decision.ruleId,
          decision.ruleName,
          eventType,
          JSON.stringify(eventData || {}),
          JSON.stringify(decision),
          this.executionMode,
          this.executionMode === 'execute' ? 1 : 0
        ]);
      }
    } catch (error) {
      console.error('❌ Platform Brain: Error logging decisions:', error);
    }
  }
}

module.exports = DecisionEngine;





