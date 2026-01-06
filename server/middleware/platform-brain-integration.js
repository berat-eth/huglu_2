/**
 * Platform Brain Integration Middleware
 * 
 * Non-blocking middleware that processes events through Platform Brain
 * without affecting the original request/response flow.
 */

const { getPlatformBrain } = require('../services/platform-brain');

/**
 * Process event through Platform Brain (non-blocking)
 */
async function processPlatformBrainEvent(eventData) {
  try {
    const platformBrain = getPlatformBrain();
    
    // Process asynchronously - don't block the request
    setImmediate(async () => {
      try {
        await platformBrain.processEvent(eventData);
      } catch (error) {
        // Silently fail - Platform Brain should never break existing functionality
        console.warn('⚠️ Platform Brain: Event processing failed (non-critical):', error.message);
      }
    });
  } catch (error) {
    // Silently fail - Platform Brain should never break existing functionality
    console.warn('⚠️ Platform Brain: Event processing setup failed (non-critical):', error.message);
  }
}

/**
 * Extract user context from request
 */
function extractUserContext(req) {
  const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || 1;
  const userId = req.user?.id || req.body?.userId || req.query?.userId || null;
  const deviceId = req.body?.deviceId || req.headers['x-device-id'] || null;
  const sessionId = req.body?.sessionId || req.headers['x-session-id'] || null;

  return {
    tenantId,
    userId: userId ? parseInt(userId) : null,
    deviceId,
    sessionId
  };
}

/**
 * Middleware for product view events
 */
function trackProductView(req, productId, productData) {
  const context = extractUserContext(req);
  
  if (!context.userId && !context.deviceId) {
    return; // Can't track without user or device
  }

  processPlatformBrainEvent({
    ...context,
    eventType: 'product_view',
    eventData: {
      productId,
      productName: productData?.name,
      categoryId: productData?.categoryId,
      price: productData?.price
    }
  });
}

/**
 * Middleware for cart add events
 */
function trackCartAdd(req, productId, quantity, price) {
  const context = extractUserContext(req);
  
  if (!context.userId && !context.deviceId) {
    return;
  }

  processPlatformBrainEvent({
    ...context,
    eventType: 'add_to_cart',
    eventData: {
      productId,
      quantity,
      price,
      totalValue: quantity * price
    }
  });
}

/**
 * Middleware for order creation events
 */
function trackOrderCreate(req, orderId, orderData) {
  const context = extractUserContext(req);
  
  if (!context.userId) {
    return; // Orders require authenticated users
  }

  processPlatformBrainEvent({
    ...context,
    eventType: 'purchase',
    eventData: {
      orderId,
      totalAmount: orderData?.totalAmount,
      itemCount: orderData?.itemCount,
      paymentMethod: orderData?.paymentMethod
    }
  });
}

/**
 * Middleware for search events
 */
function trackSearch(req, query, resultsCount) {
  const context = extractUserContext(req);
  
  if (!context.userId && !context.deviceId) {
    return;
  }

  processPlatformBrainEvent({
    ...context,
    eventType: 'search',
    eventData: {
      query,
      resultsCount
    }
  });
}

module.exports = {
  processPlatformBrainEvent,
  extractUserContext,
  trackProductView,
  trackCartAdd,
  trackOrderCreate,
  trackSearch
};















