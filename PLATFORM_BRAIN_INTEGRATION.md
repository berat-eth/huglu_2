# Platform Brain Integration Guide

## Overview

Platform Brain is a Core Intelligence Layer integrated into the existing backend and admin panel. It enables intelligent decision-making across the platform without breaking existing functionality.

## Architecture

### Components

1. **Event Adapter** (`server/services/platform-brain/event-adapter.js`)
   - Converts existing backend actions into normalized events
   - Non-blocking, doesn't affect original request flow

2. **User State Engine** (`server/services/platform-brain/user-state-engine.js`)
   - Computes user readiness, affinity, and behavioral state
   - Stores computed state in Redis for fast access

3. **Decision Engine** (`server/services/platform-brain/decision-engine.js`)
   - Rule-based engine that evaluates conditions
   - Supports three execution modes: `log_only`, `suggest_only`, `execute`

4. **Action Dispatcher** (`server/services/platform-brain/action-dispatcher.js`)
   - Executes actions suggested by the decision engine
   - Integrates with existing services (notifications, campaigns, homepage)

5. **Platform Brain Service** (`server/services/platform-brain/index.js`)
   - Orchestrates all components
   - Provides unified interface

## Database Schema

### Tables Created

1. **platform_brain_feature_flags**
   - Controls feature enable/disable
   - Stores configuration per feature

2. **platform_brain_rules**
   - Stores rule definitions (conditions + actions)
   - Supports priority and execution modes

3. **platform_brain_decisions**
   - Logs all decisions made by the engine
   - Tracks execution status

## Integration Points

### Backend Endpoints Integrated

1. **Product View** (`GET /api/products/:id`)
   - Tracks product views
   - Updates user state

2. **Cart Add** (`POST /api/cart`)
   - Tracks cart additions
   - Evaluates rules for cart-based actions

3. **Order Create** (`POST /api/orders`)
   - Tracks purchases
   - Triggers post-purchase actions

### API Routes

- `GET /api/platform-brain/status` - Get Platform Brain status
- `GET /api/platform-brain/feature-flags` - List feature flags
- `PUT /api/platform-brain/feature-flags/:key` - Update feature flag
- `GET /api/platform-brain/rules` - List rules
- `POST /api/platform-brain/rules` - Create rule
- `PUT /api/platform-brain/rules/:id` - Update rule
- `DELETE /api/platform-brain/rules/:id` - Delete rule
- `GET /api/platform-brain/decisions` - Get decision logs
- `GET /api/platform-brain/user-state/:userId` - Get user state

## Admin Panel

### Components

- **Dashboard** - Overview of Platform Brain status and stats
- **Feature Flags** - Enable/disable features
- **Rules** - Create and manage rules
- **Decision Logs** - View decision history

### Access

Navigate to Admin Panel → Platform Brain

## Feature Flags

Default feature flags (all disabled initially):

1. `platform_brain_enabled` - Master switch
2. `event_adapter_enabled` - Event tracking
3. `user_state_enabled` - User state computation
4. `decision_engine_enabled` - Rule evaluation
5. `action_dispatcher_enabled` - Action execution

## Rule Definition

### Conditions

```json
[
  {
    "type": "readiness_score",
    "operator": ">=",
    "value": 70
  },
  {
    "type": "event_type",
    "value": "product_view"
  },
  {
    "type": "category_affinity",
    "categoryId": 5,
    "operator": ">",
    "value": 10
  }
]
```

### Actions

```json
[
  {
    "type": "send_notification",
    "params": {
      "title": "Special Offer",
      "message": "Check out our new products!",
      "type": "info"
    }
  },
  {
    "type": "apply_discount",
    "params": {
      "discountCode": "WELCOME10"
    }
  },
  {
    "type": "recommend_products",
    "params": {
      "productIds": [1, 2, 3],
      "reason": "Based on your interests"
    }
  }
]
```

## Execution Modes

1. **log_only** (Default)
   - Rules are evaluated
   - Decisions are logged
   - No actions are executed
   - Safe for testing

2. **suggest_only**
   - Rules are evaluated
   - Decisions are logged
   - Actions are prepared but not executed
   - Useful for validation

3. **execute**
   - Rules are evaluated
   - Decisions are logged
   - Actions are executed
   - Production mode

## Phased Integration Strategy

### Phase 1: Passive Mode (Current)
- ✅ Event tracking enabled
- ✅ User state computation enabled
- ✅ Decision logging enabled
- ❌ Action execution disabled

### Phase 2: Shadow Decisions
- Enable decision engine in `log_only` mode
- Compare decisions with current system behavior
- Analyze decision impact in admin panel

### Phase 3: Active Control
- Gradually enable `suggest_only` mode
- Test actions before execution
- Enable `execute` mode for specific rules/segments

## Rollback Plan

### Immediate Rollback

1. Disable master feature flag:
   ```sql
   UPDATE platform_brain_feature_flags 
   SET isEnabled = 0 
   WHERE featureKey = 'platform_brain_enabled';
   ```

2. Or via Admin Panel:
   - Navigate to Platform Brain → Feature Flags
   - Disable "Platform Brain Enabled"

### Code Rollback

All Platform Brain integrations are non-blocking and wrapped in try-catch blocks. If Platform Brain fails, the original functionality continues unaffected.

### Database Rollback

To remove Platform Brain tables (if needed):
```sql
DROP TABLE IF EXISTS platform_brain_decisions;
DROP TABLE IF EXISTS platform_brain_rules;
DROP TABLE IF EXISTS platform_brain_feature_flags;
```

## Monitoring

### Decision Logs

View all decisions in Admin Panel → Platform Brain → Decision Logs

### User State

Check user state via API:
```
GET /api/platform-brain/user-state/:userId
```

### Redis Keys

User state stored in Redis:
- `platform_brain:user_state:{tenantId}:{userId}`
- `platform_brain:user_state:{tenantId}:{userId}:readiness`
- `platform_brain:user_state:{tenantId}:{userId}:affinity`
- `platform_brain:user_state:{tenantId}:{userId}:price_sensitivity`

## Best Practices

1. **Start with log_only mode** - Always test rules before enabling execution
2. **Use feature flags** - Enable features gradually
3. **Monitor decision logs** - Review decisions regularly
4. **Test with small user segments** - Use user segments for testing
5. **Set appropriate priorities** - Higher priority rules execute first
6. **Keep rules simple** - Complex rules are harder to debug

## Troubleshooting

### Platform Brain not processing events

1. Check feature flags are enabled
2. Verify Redis connection
3. Check server logs for errors
4. Ensure database tables exist

### Rules not matching

1. Check rule conditions match user state
2. Verify user state is computed (check Redis)
3. Review decision logs for evaluation results
4. Check rule priority and active status

### Actions not executing

1. Verify execution mode is `execute`
2. Check action dispatcher is enabled
3. Review decision logs for execution status
4. Check action parameters are correct

## Support

For issues or questions:
1. Check decision logs in admin panel
2. Review server logs
3. Check Redis for user state
4. Verify feature flags configuration



