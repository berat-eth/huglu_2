/**
 * Platform Brain - Main Service
 * 
 * Orchestrates all Platform Brain components and provides unified interface.
 */

const EventAdapter = require('./event-adapter');
const UserStateEngine = require('./user-state-engine');
const DecisionEngine = require('./decision-engine');
const ActionDispatcher = require('./action-dispatcher');
const { getJson } = require('../../redis');
const { poolWrapper } = require('../../database-schema');

class PlatformBrain {
  constructor() {
    this.eventAdapter = new EventAdapter();
    this.userStateEngine = new UserStateEngine();
    this.decisionEngine = new DecisionEngine();
    this.actionDispatcher = new ActionDispatcher();
    
    this.enabled = false;
    this.initialized = false;
  }

  /**
   * Initialize Platform Brain (load feature flags from database)
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load feature flags
      await this.loadFeatureFlags();
      this.initialized = true;
      console.log('✅ Platform Brain initialized');
    } catch (error) {
      console.error('❌ Platform Brain initialization error:', error);
    }
  }

  /**
   * Load feature flags from database
   */
  async loadFeatureFlags() {
    try {
      const [flags] = await poolWrapper.execute(`
        SELECT featureKey, isEnabled, config
        FROM platform_brain_feature_flags
        WHERE isActive = 1
      `);

      for (const flag of flags) {
        const config = typeof flag.config === 'string' 
          ? JSON.parse(flag.config) 
          : flag.config || {};

        switch (flag.featureKey) {
          case 'platform_brain_enabled':
            this.enabled = flag.isEnabled === 1;
            break;
          case 'event_adapter_enabled':
            this.eventAdapter.setEnabled(flag.isEnabled === 1);
            break;
          case 'user_state_enabled':
            this.userStateEngine.setEnabled(flag.isEnabled === 1);
            break;
          case 'decision_engine_enabled':
            this.decisionEngine.setEnabled(flag.isEnabled === 1);
            this.decisionEngine.setExecutionMode(config.executionMode || 'log_only');
            break;
          case 'action_dispatcher_enabled':
            this.actionDispatcher.setEnabled(flag.isEnabled === 1);
            break;
        }
      }
    } catch (error) {
      // Feature flags table might not exist yet, that's OK
      console.warn('⚠️ Platform Brain: Feature flags not available:', error.message);
    }
  }

  /**
   * Process an event through the Platform Brain pipeline
   */
  async processEvent(eventData) {
    if (!this.enabled) {
      return { processed: false, reason: 'Platform Brain disabled' };
    }

    try {
      const { tenantId, userId, deviceId, sessionId, eventType, ...rest } = eventData;

      // Step 1: Adapt event
      const adaptedEvent = await this.eventAdapter.adaptGenericEvent({
        tenantId,
        userId,
        deviceId,
        sessionId,
        eventType,
        ...rest
      });

      // Step 2: Update user state (async, non-blocking)
      if (userId) {
        this.userStateEngine.getUserState(userId, tenantId).catch(err => {
          console.warn('⚠️ Platform Brain: Error updating user state:', err.message);
        });
      }

      // Step 3: Evaluate rules
      const evaluation = await this.decisionEngine.evaluateRules({
        tenantId,
        userId,
        deviceId,
        sessionId,
        eventType,
        eventData: adaptedEvent
      });

      // Step 4: Dispatch actions if in execute mode
      if (evaluation.decisions.length > 0 && this.decisionEngine.executionMode === 'execute') {
        for (const decision of evaluation.decisions) {
          await this.actionDispatcher.dispatchActions(decision, {
            tenantId,
            userId,
            deviceId,
            sessionId,
            eventType,
            eventData: adaptedEvent
          });
        }
      }

      return {
        processed: true,
        event: adaptedEvent,
        evaluation,
        actionsDispatched: this.decisionEngine.executionMode === 'execute'
      };
    } catch (error) {
      console.error('❌ Platform Brain: Error processing event:', error);
      return {
        processed: false,
        error: error.message
      };
    }
  }

  /**
   * Get user state (public API)
   */
  async getUserState(userId, tenantId = 1) {
    return await this.userStateEngine.getUserState(userId, tenantId);
  }

  /**
   * Get decision logs
   */
  async getDecisionLogs(filters = {}) {
    try {
      const { tenantId, userId, limit = 100, offset = 0 } = filters;

      let query = `
        SELECT 
          id, tenantId, userId, ruleId, ruleName, eventType,
          decisionData, executionMode, executed, createdAt
        FROM platform_brain_decisions
        WHERE 1=1
      `;
      const params = [];

      if (tenantId) {
        query += ' AND tenantId = ?';
        params.push(tenantId);
      }

      if (userId) {
        query += ' AND userId = ?';
        params.push(userId);
      }

      query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [logs] = await poolWrapper.execute(query, params);

      return logs.map(log => ({
        ...log,
        decisionData: typeof log.decisionData === 'string'
          ? JSON.parse(log.decisionData)
          : log.decisionData
      }));
    } catch (error) {
      console.error('❌ Platform Brain: Error getting decision logs:', error);
      return [];
    }
  }

  /**
   * Refresh feature flags (call after admin updates)
   */
  async refreshFeatureFlags() {
    await this.loadFeatureFlags();
  }
}

// Singleton instance
let platformBrainInstance = null;

function getPlatformBrain() {
  if (!platformBrainInstance) {
    platformBrainInstance = new PlatformBrain();
    // Auto-initialize on first access
    platformBrainInstance.initialize().catch(err => {
      console.error('❌ Platform Brain: Auto-initialization failed:', err);
    });
  }
  return platformBrainInstance;
}

module.exports = {
  PlatformBrain,
  getPlatformBrain
};











