const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/analytics/analytics-service');
const EventProcessor = require('../services/analytics/event-processor');
const { authenticateTenant } = require('../middleware/auth');

/**
 * Analytics Routes Factory
 */
function createAnalyticsRoutes(poolWrapper) {
  const analyticsService = new AnalyticsService(poolWrapper);
  const eventProcessor = new EventProcessor(poolWrapper);

  // Extract user context from request
  function extractUserContext(req) {
    const tenantId = req.tenant?.id || 1;
    const userId = req.user?.id || req.body?.userId || null;
    const deviceId = req.headers['x-device-id'] || req.body?.deviceId || 'unknown';
    const sessionId = req.headers['x-session-id'] || req.body?.sessionId || null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    return {
      tenantId,
      userId,
      deviceId,
      sessionId,
      ipAddress,
      userAgent
    };
  }

  // ==================== MOBILE APP ENDPOINTS ====================

  /**
   * POST /api/analytics/events
   * Event gönderme (batch desteği)
   */
  router.post('/events', async (req, res) => {
    try {
      const context = extractUserContext(req);
      const { events } = req.body;

      if (!events || !Array.isArray(events)) {
        return res.status(400).json({
          success: false,
          message: 'Events array is required'
        });
      }

      // Her event'e context ekle
      const eventsWithContext = events.map(event => ({
        ...context,
        ...event,
        timestamp: event.timestamp || new Date()
      }));

      // Queue'ya ekle (async)
      await eventProcessor.queueEvents(eventsWithContext);

      res.json({
        success: true,
        message: 'Events queued successfully'
      });
    } catch (error) {
      console.error('❌ Analytics Route: Error tracking events:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking events',
        error: error.message
      });
    }
  });

  /**
   * POST /api/analytics/session/start
   * Session başlatma
   */
  router.post('/session/start', async (req, res) => {
    try {
      const context = extractUserContext(req);
      const { deviceInfo, referrer, country, city } = req.body;

      if (!context.sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      const result = await analyticsService.startSession({
        ...context,
        deviceInfo,
        referrer,
        country,
        city
      });

      res.json({
        success: true,
        sessionId: result.sessionId,
        sessionStart: result.sessionStart
      });
    } catch (error) {
      console.error('❌ Analytics Route: Error starting session:', error);
      res.status(500).json({
        success: false,
        message: 'Error starting session',
        error: error.message
      });
    }
  });

  /**
   * POST /api/analytics/session/end
   * Session bitirme
   */
  router.post('/session/end', async (req, res) => {
    try {
      const context = extractUserContext(req);
      const { conversion } = req.body;

      if (!context.sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      const result = await analyticsService.endSession(
        context.sessionId,
        context.tenantId,
        conversion
      );

      res.json({
        success: true,
        duration: result.duration,
        eventsCount: result.eventsCount,
        pageViews: result.pageViews
      });
    } catch (error) {
      console.error('❌ Analytics Route: Error ending session:', error);
      res.status(500).json({
        success: false,
        message: 'Error ending session',
        error: error.message
      });
    }
  });

  /**
   * POST /api/analytics/session/heartbeat
   * Session canlılık kontrolü
   */
  router.post('/session/heartbeat', async (req, res) => {
    try {
      const context = extractUserContext(req);

      if (!context.sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      // Heartbeat non-critical operation - hata durumunda bile success döndür
      const result = await analyticsService.updateSessionActivity(
        context.sessionId,
        context.tenantId
      );

      // Her durumda success döndür (graceful degradation)
      // Heartbeat başarısız olsa bile uygulama çalışmaya devam etmeli
      res.json({ success: true });
    } catch (error) {
      // Hata durumunda bile success döndür (heartbeat kritik değil)
      // Sadece development'ta logla
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ Analytics Route: Session heartbeat error (non-critical):', error.message);
      }
      
      // Her durumda success döndür
      res.json({ success: true });
    }
  });

  /**
   * POST /api/analytics/product/view
   * Ürün görüntüleme
   */
  router.post('/product/view', async (req, res) => {
    try {
      const context = extractUserContext(req);
      const { productId, categoryId, screenName } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }

      await eventProcessor.queueEvent({
        ...context,
        eventType: 'product_view',
        productId,
        categoryId,
        screenName,
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Analytics Route: Error tracking product view:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking product view',
        error: error.message
      });
    }
  });

  /**
   * POST /api/analytics/cart/add
   * Sepete ekleme
   */
  router.post('/cart/add', async (req, res) => {
    try {
      const context = extractUserContext(req);
      const { productId, quantity, price, amount } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }

      await eventProcessor.queueEvent({
        ...context,
        eventType: 'add_to_cart',
        productId,
        amount: amount || (price * quantity),
        properties: {
          quantity,
          price
        },
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Analytics Route: Error tracking cart add:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking cart add',
        error: error.message
      });
    }
  });

  /**
   * POST /api/analytics/cart/remove
   * Sepetten çıkarma
   */
  router.post('/cart/remove', async (req, res) => {
    try {
      const context = extractUserContext(req);
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }

      await eventProcessor.queueEvent({
        ...context,
        eventType: 'remove_from_cart',
        productId,
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Analytics Route: Error tracking cart remove:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking cart remove',
        error: error.message
      });
    }
  });

  /**
   * POST /api/analytics/checkout/start
   * Checkout başlangıcı
   */
  router.post('/checkout/start', async (req, res) => {
    try {
      const context = extractUserContext(req);
      const { amount, items } = req.body;

      await eventProcessor.queueEvent({
        ...context,
        eventType: 'checkout_start',
        amount,
        properties: {
          items
        },
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Analytics Route: Error tracking checkout start:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking checkout start',
        error: error.message
      });
    }
  });

  /**
   * POST /api/analytics/purchase
   * Satın alma
   */
  router.post('/purchase', async (req, res) => {
    try {
      const context = extractUserContext(req);
      const { orderId, amount, items } = req.body;

      if (!orderId || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Order ID and amount are required'
        });
      }

      await eventProcessor.queueEvent({
        ...context,
        eventType: 'purchase',
        orderId,
        amount,
        properties: {
          items
        },
        timestamp: new Date()
      });

      // Session'ı conversion ile bitir
      if (context.sessionId) {
        await analyticsService.endSession(
          context.sessionId,
          context.tenantId,
          {
            type: 'purchase',
            value: parseFloat(amount) || 0
          }
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Analytics Route: Error tracking purchase:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking purchase',
        error: error.message
      });
    }
  });

  /**
   * POST /api/analytics/screen/view
   * Ekran görüntüleme
   */
  router.post('/screen/view', async (req, res) => {
    try {
      const context = extractUserContext(req);
      const { screenName, properties } = req.body;

      if (!screenName) {
        return res.status(400).json({
          success: false,
          message: 'Screen name is required'
        });
      }

      await eventProcessor.queueEvent({
        ...context,
        eventType: 'screen_view',
        screenName,
        properties,
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Analytics Route: Error tracking screen view:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking screen view',
        error: error.message
      });
    }
  });

  /**
   * POST /api/analytics/search
   * Arama eventi
   */
  router.post('/search', async (req, res) => {
    try {
      const context = extractUserContext(req);
      const { searchQuery, resultsCount } = req.body;

      if (!searchQuery) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      await eventProcessor.queueEvent({
        ...context,
        eventType: 'search',
        searchQuery,
        properties: {
          resultsCount
        },
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Analytics Route: Error tracking search:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking search',
        error: error.message
      });
    }
  });

  /**
   * POST /api/analytics/click
   * Tıklama eventi
   */
  router.post('/click', async (req, res) => {
    try {
      const context = extractUserContext(req);
      const { element, screenName, properties } = req.body;

      await eventProcessor.queueEvent({
        ...context,
        eventType: 'click',
        screenName,
        properties: {
          element,
          ...properties
        },
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Analytics Route: Error tracking click:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking click',
        error: error.message
      });
    }
  });

  /**
   * POST /api/analytics/scroll
   * Scroll eventi
   */
  router.post('/scroll', async (req, res) => {
    try {
      const context = extractUserContext(req);
      const { scrollDepth, screenName } = req.body;

      await eventProcessor.queueEvent({
        ...context,
        eventType: 'scroll',
        screenName,
        properties: {
          scrollDepth
        },
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Analytics Route: Error tracking scroll:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking scroll',
        error: error.message
      });
    }
  });

  /**
   * POST /api/analytics/performance
   * Performans metrikleri
   */
  router.post('/performance', async (req, res) => {
    try {
      const context = extractUserContext(req);
      const { loadTime, responseTime, screenName } = req.body;

      await eventProcessor.queueEvent({
        ...context,
        eventType: 'performance',
        screenName,
        performanceMetrics: {
          loadTime,
          responseTime
        },
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Analytics Route: Error tracking performance:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking performance',
        error: error.message
      });
    }
  });

  /**
   * POST /api/analytics/error
   * Hata raporlama
   */
  router.post('/error', async (req, res) => {
    try {
      const context = extractUserContext(req);
      const { errorMessage, errorStack, screenName } = req.body;

      if (!errorMessage) {
        return res.status(400).json({
          success: false,
          message: 'Error message is required'
        });
      }

      await eventProcessor.queueEvent({
        ...context,
        eventType: 'error',
        screenName,
        errorMessage,
        properties: {
          errorStack
        },
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Analytics Route: Error tracking error:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking error',
        error: error.message
      });
    }
  });

  return router;
}

module.exports = createAnalyticsRoutes;



