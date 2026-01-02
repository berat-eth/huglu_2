/**
 * Endpoint-specific Rate Limiting Middleware
 * Her endpoint için ayrı rate limit uygular
 */

const { getEndpointRateLimit } = require('../config/endpoint-rate-limits');
const { createEndpointLimiter, getClientIP, getUserIdFromRequest, detectClientType } = require('../utils/rate-limiting');
const { getDDoSDetectionService } = require('../services/ddos-detection-service');

// Rate limiter cache - Aynı endpoint için tekrar oluşturmayı önler
const limiterCache = new Map();

/**
 * Endpoint için rate limiter'ı al veya oluştur
 */
function getLimiterForEndpoint(path, method) {
  const cacheKey = `${path}:${method}`;
  
  if (limiterCache.has(cacheKey)) {
    return limiterCache.get(cacheKey);
  }

  // Endpoint config'i al
  const endpointConfig = getEndpointRateLimit(path, method);
  
  // Rate limiter oluştur
  const limiter = createEndpointLimiter(
    path,
    endpointConfig.category,
    endpointConfig.limit || null,
    endpointConfig.windowMs || null,
    endpointConfig.skipSuccessfulRequests || false
  );

  // Cache'e ekle
  limiterCache.set(cacheKey, limiter);
  
  return limiter;
}

/**
 * Endpoint rate limit middleware
 * Request path ve method'a göre uygun rate limiter'ı uygular
 */
async function endpointRateLimitMiddleware(req, res, next) {
  // Full path'i al (nested routes için req.originalUrl veya req.baseUrl + req.path kullan)
  // Express'te req.path nested route'lar için relative path olabilir
  let fullPath = req.originalUrl || req.url;
  
  // Query string'i kaldır
  if (fullPath.includes('?')) {
    fullPath = fullPath.split('?')[0];
  }

  // Sadece /api ile başlayan path'ler için uygula
  if (!fullPath || !fullPath.startsWith('/api')) {
    return next();
  }

  // Health check ve bazı özel endpoint'ler için skip
  const skipPaths = [
    '/api/health',
    '/api/maintenance/status',
    '/api/admin/ddos/stream' // SSE endpoint'i skip
  ];

  if (skipPaths.includes(fullPath)) {
    return next();
  }

  try {
    const path = fullPath;
    const method = req.method;
    const ip = getClientIP(req);
    const tenantId = req.tenant?.id || 1;

    // DDoS detection service'i al (poolWrapper'ı req.app.locals'tan al)
    let poolWrapper = null;
    if (req.app && req.app.locals && req.app.locals.poolWrapper) {
      poolWrapper = req.app.locals.poolWrapper;
    } else {
      poolWrapper = require('../database-schema').poolWrapper;
    }

    if (poolWrapper) {
      try {
        const ddosDetectionService = getDDoSDetectionService(poolWrapper);
        
        // Request'i analiz et
        const requestData = {
          endpoint: path,
          method: method,
          userAgent: req.headers['user-agent'] || '',
          tenantId: tenantId,
          estimatedTokens: req.headers['content-length'] ? Math.ceil(parseInt(req.headers['content-length']) / 3.5) : 0
        };

        const analysis = await ddosDetectionService.analyzeRequest(ip, requestData);
        
        // Eğer IP engellenmişse veya saldırı tespit edilmişse
        if (analysis.blocked) {
          return res.status(403).json({
            success: false,
            message: 'Access denied',
            reason: analysis.reason || 'IP blocked'
          });
        }
      } catch (ddosError) {
        // DDoS detection hatası rate limiting'i engellemez
        console.error('DDoS detection hatası:', ddosError);
      }
    }

    // Endpoint için rate limiter'ı al
    const limiter = getLimiterForEndpoint(path, method);

    // Rate limiter'ı uygula
    return limiter(req, res, next);
  } catch (error) {
    console.error('❌ Endpoint rate limit middleware error:', error);
    // Hata durumunda devam et (rate limiting olmadan)
    return next();
  }
}

module.exports = endpointRateLimitMiddleware;

