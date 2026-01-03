/**
 * Platform Brain API Routes
 * 
 * REST API for managing Platform Brain features, rules, and viewing decisions.
 */

const express = require('express');
const router = express.Router();
const { getPlatformBrain } = require('../services/platform-brain');
const { poolWrapper } = require('../database-schema');

// Get Platform Brain instance
const platformBrain = getPlatformBrain();

/**
 * GET /api/platform-brain/status
 * Get Platform Brain status and configuration
 */
router.get('/status', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 1;

    const [flags] = await poolWrapper.execute(`
      SELECT featureKey, featureName, isEnabled, config
      FROM platform_brain_feature_flags
      WHERE tenantId = ? AND isActive = 1
    `, [tenantId]);

    const [ruleCount] = await poolWrapper.execute(`
      SELECT COUNT(*) as count
      FROM platform_brain_rules
      WHERE tenantId = ? AND isActive = 1
    `, [tenantId]);

    const [decisionCount] = await poolWrapper.execute(`
      SELECT COUNT(*) as count
      FROM platform_brain_decisions
      WHERE tenantId = ?
        AND createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `, [tenantId]);

    res.json({
      success: true,
      data: {
        enabled: flags.find(f => f.featureKey === 'platform_brain_enabled')?.isEnabled === 1,
        featureFlags: flags.map(f => ({
          key: f.featureKey,
          name: f.featureName,
          enabled: f.isEnabled === 1,
          config: typeof f.config === 'string' ? JSON.parse(f.config) : f.config
        })),
        stats: {
          activeRules: ruleCount[0]?.count || 0,
          decisionsLast24h: decisionCount[0]?.count || 0
        }
      }
    });
  } catch (error) {
    console.error('❌ Error getting Platform Brain status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/platform-brain/feature-flags
 * Get all feature flags
 */
router.get('/feature-flags', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 1;

    const [flags] = await poolWrapper.execute(`
      SELECT id, featureKey, featureName, description, isEnabled, config, createdAt, updatedAt
      FROM platform_brain_feature_flags
      WHERE tenantId = ? AND isActive = 1
      ORDER BY featureKey
    `, [tenantId]);

    res.json({
      success: true,
      data: flags.map(f => ({
        ...f,
        isEnabled: f.isEnabled === 1,
        config: typeof f.config === 'string' ? JSON.parse(f.config) : f.config || {}
      }))
    });
  } catch (error) {
    console.error('❌ Error getting feature flags:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/platform-brain/feature-flags/:featureKey
 * Update a feature flag
 */
router.put('/feature-flags/:featureKey', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 1;
    const { featureKey } = req.params;
    const { isEnabled, config } = req.body;

    const updateFields = [];
    const params = [];

    if (isEnabled !== undefined) {
      updateFields.push('isEnabled = ?');
      params.push(isEnabled ? 1 : 0);
    }

    if (config !== undefined) {
      updateFields.push('config = ?');
      params.push(JSON.stringify(config));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(tenantId, featureKey);

    await poolWrapper.execute(`
      UPDATE platform_brain_feature_flags
      SET ${updateFields.join(', ')}, updatedAt = NOW()
      WHERE tenantId = ? AND featureKey = ?
    `, params);

    // Refresh Platform Brain configuration
    await platformBrain.refreshFeatureFlags();

    res.json({
      success: true,
      message: 'Feature flag updated'
    });
  } catch (error) {
    console.error('❌ Error updating feature flag:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/platform-brain/rules
 * Get all rules
 */
router.get('/rules', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 1;

    const [rules] = await poolWrapper.execute(`
      SELECT id, name, description, conditions, actions, priority, isActive, executionMode, createdAt, updatedAt
      FROM platform_brain_rules
      WHERE tenantId = ?
      ORDER BY priority DESC, createdAt DESC
    `, [tenantId]);

    res.json({
      success: true,
      data: rules.map(r => ({
        ...r,
        isActive: r.isActive === 1,
        conditions: typeof r.conditions === 'string' ? JSON.parse(r.conditions) : r.conditions,
        actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : r.actions
      }))
    });
  } catch (error) {
    console.error('❌ Error getting rules:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/platform-brain/rules
 * Create a new rule
 */
router.post('/rules', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 1;
    const { name, description, conditions, actions, priority = 0, isActive = true, executionMode = 'log_only' } = req.body;

    if (!name || !conditions || !actions) {
      return res.status(400).json({
        success: false,
        message: 'Name, conditions, and actions are required'
      });
    }

    const [result] = await poolWrapper.execute(`
      INSERT INTO platform_brain_rules
      (tenantId, name, description, conditions, actions, priority, isActive, executionMode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId,
      name,
      description || null,
      JSON.stringify(conditions),
      JSON.stringify(actions),
      priority,
      isActive ? 1 : 0,
      executionMode
    ]);

    res.json({
      success: true,
      data: {
        id: result.insertId,
        name,
        description,
        conditions,
        actions,
        priority,
        isActive,
        executionMode
      },
      message: 'Rule created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating rule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/platform-brain/rules/:id
 * Update a rule
 */
router.put('/rules/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 1;
    const { id } = req.params;
    const { name, description, conditions, actions, priority, isActive, executionMode } = req.body;

    const updateFields = [];
    const params = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    if (conditions !== undefined) {
      updateFields.push('conditions = ?');
      params.push(JSON.stringify(conditions));
    }
    if (actions !== undefined) {
      updateFields.push('actions = ?');
      params.push(JSON.stringify(actions));
    }
    if (priority !== undefined) {
      updateFields.push('priority = ?');
      params.push(priority);
    }
    if (isActive !== undefined) {
      updateFields.push('isActive = ?');
      params.push(isActive ? 1 : 0);
    }
    if (executionMode !== undefined) {
      updateFields.push('executionMode = ?');
      params.push(executionMode);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(tenantId, id);

    await poolWrapper.execute(`
      UPDATE platform_brain_rules
      SET ${updateFields.join(', ')}, updatedAt = NOW()
      WHERE tenantId = ? AND id = ?
    `, params);

    res.json({
      success: true,
      message: 'Rule updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating rule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/platform-brain/rules/:id
 * Delete a rule (soft delete by setting isActive = 0)
 */
router.delete('/rules/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 1;
    const { id } = req.params;

    await poolWrapper.execute(`
      UPDATE platform_brain_rules
      SET isActive = 0, updatedAt = NOW()
      WHERE tenantId = ? AND id = ?
    `, [tenantId, id]);

    res.json({
      success: true,
      message: 'Rule deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting rule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/platform-brain/decisions
 * Get decision logs
 */
router.get('/decisions', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 1;
    const userId = req.query.userId;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const decisions = await platformBrain.getDecisionLogs({
      tenantId,
      userId,
      limit,
      offset
    });

    res.json({
      success: true,
      data: decisions,
      pagination: {
        limit,
        offset,
        count: decisions.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting decisions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/platform-brain/user-state/:userId
 * Get user state
 */
router.get('/user-state/:userId', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 1;
    const { userId } = req.params;

    const userState = await platformBrain.getUserState(parseInt(userId), tenantId);

    if (!userState) {
      return res.status(404).json({
        success: false,
        message: 'User state not found'
      });
    }

    res.json({
      success: true,
      data: userState
    });
  } catch (error) {
    console.error('❌ Error getting user state:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;












