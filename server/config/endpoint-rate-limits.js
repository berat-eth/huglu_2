/**
 * Endpoint Rate Limits Configuration
 * Her endpoint için kategori ve rate limit değerleri
 * Pattern matching ile dinamik route'lar desteklenir
 */

// Kategori bazlı varsayılan rate limit değerleri
const CATEGORY_DEFAULTS = {
  auth: {
    limit: parseInt(process.env.RATE_LIMIT_AUTH || '10', 10),
    windowMs: 15 * 60 * 1000, // 15 dakika
    skipSuccessfulRequests: true // Login için başarılı istekleri sayma
  },
  payment: {
    limit: parseInt(process.env.RATE_LIMIT_PAYMENT || '15', 10),
    windowMs: 60 * 1000 // 1 dakika
  },
  wallet: {
    limit: parseInt(process.env.RATE_LIMIT_WALLET || '20', 10),
    windowMs: 60 * 1000 // 1 dakika
  },
  admin: {
    limit: parseInt(process.env.RATE_LIMIT_ADMIN || '500', 10),
    windowMs: 15 * 60 * 1000 // 15 dakika
  },
  read: {
    limitAuth: parseInt(process.env.RATE_LIMIT_READ_AUTH || '200', 10),
    limitGuest: parseInt(process.env.RATE_LIMIT_READ_GUEST || '100', 10),
    windowMs: 60 * 1000 // 1 dakika
  },
  write: {
    limitAuth: parseInt(process.env.RATE_LIMIT_WRITE_AUTH || '100', 10),
    limitGuest: parseInt(process.env.RATE_LIMIT_WRITE_GUEST || '50', 10),
    windowMs: 60 * 1000 // 1 dakika
  },
  analytics: {
    limit: parseInt(process.env.RATE_LIMIT_ANALYTICS || '300', 10),
    windowMs: 60 * 1000 // 1 dakika
  },
  critical: {
    limit: parseInt(process.env.RATE_LIMIT_CRITICAL || '50', 10),
    windowMs: 60 * 1000 // 1 dakika
  },
  default: {
    limitAuth: parseInt(process.env.RATE_LIMIT_DEFAULT_AUTH || '100', 10),
    limitGuest: parseInt(process.env.RATE_LIMIT_DEFAULT_GUEST || '50', 10),
    windowMs: 60 * 1000 // 1 dakika
  }
};

/**
 * Endpoint mapping
 * Exact path veya pattern (express route pattern) kullanılabilir
 * Pattern'ler :param formatında olmalı
 */
const ENDPOINT_MAPPINGS = {
  // Authentication endpoints
  '/api/users/login': { category: 'auth', method: 'POST' },
  '/api/admin/login': { category: 'auth', method: 'POST' },
  '/api/auth/google/verify': { category: 'auth', method: 'POST' },
  '/api/auth/refresh': { category: 'auth', method: 'POST' },
  '/api/auth/logout': { category: 'auth', method: 'POST' },

  // Payment endpoints
  '/api/payments/process': { category: 'payment', method: 'POST' },
  '/api/payments/:paymentId/status': { category: 'payment', method: 'GET' },
  '/api/payments/test-cards': { category: 'payment', method: 'GET' },

  // Wallet endpoints
  '/api/wallet/transfer': { category: 'wallet', method: 'POST' },
  '/api/wallet/gift-card': { category: 'wallet', method: 'POST' },
  '/api/wallet/gift-card/use': { category: 'wallet', method: 'POST' },
  '/api/wallet/transfers': { category: 'wallet', method: 'GET' },
  '/api/wallet/withdraw-request': { category: 'wallet', method: 'POST' },

  // Critical endpoints (order creation, checkout, returns)
  '/api/orders': { category: 'critical', method: 'POST' },
  '/api/returns': { category: 'critical', method: 'POST' },
  '/api/return-requests': { category: 'critical', method: 'POST' },
  '/api/returns/:returnRequestId/cancel': { category: 'critical', method: 'PUT' },
  '/api/return-requests/:id/cancel': { category: 'critical', method: 'PUT' },

  // Analytics endpoints
  '/api/analytics/events': { category: 'analytics', method: 'POST' },
  '/api/analytics/session/start': { category: 'analytics', method: 'POST' },
  '/api/analytics/session/end': { category: 'analytics', method: 'POST' },
  '/api/analytics/session/heartbeat': { category: 'analytics', method: 'POST' },
  '/api/analytics/product/view': { category: 'analytics', method: 'POST' },
  '/api/analytics/cart/add': { category: 'analytics', method: 'POST' },
  '/api/analytics/cart/remove': { category: 'analytics', method: 'POST' },
  '/api/analytics/checkout/start': { category: 'analytics', method: 'POST' },
  '/api/analytics/purchase': { category: 'analytics', method: 'POST' },
  '/api/analytics/search': { category: 'analytics', method: 'POST' },
  '/api/analytics/performance': { category: 'analytics', method: 'POST' },
  '/api/analytics/error': { category: 'analytics', method: 'POST' },

  // Admin analytics endpoints
  '/api/admin/analytics/realtime/overview': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/realtime/users': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/realtime/events': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/ecommerce/overview': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/ecommerce/revenue': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/ecommerce/products': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/ecommerce/funnels': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/users/overview': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/users/cohorts': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/users/retention': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/behavior/sessions': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/behavior/screens': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/behavior/navigation': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/reports': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/reports/generate': { category: 'analytics', method: 'POST' },
  '/api/admin/analytics/reports/:reportId': { category: 'analytics', method: 'GET' },
  '/api/admin/analytics/reports/:reportId/export': { category: 'analytics', method: 'GET' },

  // Admin endpoints (pattern-based)
  '/api/admin/maintenance/toggle': { category: 'admin', method: 'POST' },
  '/api/admin/users/reset-user-ids': { category: 'admin', method: 'POST' },
  '/api/admin/users/:id/ensure-user-id': { category: 'admin', method: 'POST' },
  '/api/admin/users/ensure-missing-user-ids': { category: 'admin', method: 'POST' },
  '/api/admin/return-requests/:id/status': { category: 'admin', method: 'PUT' },
  '/api/admin/stats': { category: 'admin', method: 'GET' },
  '/api/admin/reports': { category: 'admin', method: 'GET' },
  '/api/admin/snort/logs': { category: 'admin', method: 'GET' },
  '/api/admin/ip/block': { category: 'admin', method: 'POST' },
  '/api/admin/ip/unblock': { category: 'admin', method: 'POST' },
  '/api/admin/snort/logs/stream': { category: 'admin', method: 'GET' },
  '/api/admin/snort/logs/stats': { category: 'admin', method: 'GET' },
  '/api/admin/snort/logs/top-attackers': { category: 'admin', method: 'GET' },
  '/api/admin/snort/logs/protocol-stats': { category: 'admin', method: 'GET' },
  '/api/admin/snort/logs/bulk-block': { category: 'admin', method: 'POST' },
  '/api/admin/snort/rules': { category: 'admin', method: 'GET' },
  '/api/admin/snort/rules': { category: 'admin', method: 'POST' },
  '/api/admin/snort/rules/:id': { category: 'admin', method: 'PUT' },
  '/api/admin/snort/rules/:id': { category: 'admin', method: 'DELETE' },
  '/api/admin/snort/whitelist': { category: 'admin', method: 'GET' },
  '/api/admin/snort/whitelist': { category: 'admin', method: 'POST' },
  '/api/admin/snort/whitelist/:ip': { category: 'admin', method: 'DELETE' },
  '/api/admin/snort/logs/export/pdf': { category: 'admin', method: 'POST' },
  '/api/admin/snort/reports': { category: 'admin', method: 'GET' },
  '/api/admin/ip/blocked': { category: 'admin', method: 'GET' },
  '/api/admin/ip/check/:ip': { category: 'admin', method: 'GET' },
  '/api/admin/redis/stats': { category: 'admin', method: 'GET' },
  '/api/admin/charts': { category: 'admin', method: 'GET' },
  '/api/admin/scrapers/google-maps': { category: 'admin', method: 'POST' },
  '/api/admin/security/login-attempts': { category: 'admin', method: 'GET' },
  '/api/admin/security/server-stats': { category: 'admin', method: 'GET' },
  '/api/admin/top-customers': { category: 'admin', method: 'GET' },
  '/api/admin/users/admins': { category: 'admin', method: 'GET' },
  '/api/admin/users': { category: 'admin', method: 'POST' },
  '/api/admin/users/:id': { category: 'admin', method: 'PUT' },
  '/api/admin/users/:id': { category: 'admin', method: 'DELETE' },
  '/api/admin/users/:id/role': { category: 'admin', method: 'PUT' },
  '/api/admin/users/:id/status': { category: 'admin', method: 'PUT' },
  '/api/admin/users/:id/reset-password': { category: 'admin', method: 'POST' },
  '/api/admin/profile': { category: 'admin', method: 'GET' },
  '/api/admin/profile': { category: 'admin', method: 'PUT' },
  '/api/admin/change-password': { category: 'admin', method: 'POST' },
  '/api/admin/backup': { category: 'admin', method: 'GET' },
  '/api/admin/restore': { category: 'admin', method: 'POST' },
  '/api/admin/carts': { category: 'admin', method: 'GET' },
  '/api/admin/gift-cards': { category: 'admin', method: 'GET' },
  '/api/admin/gift-cards': { category: 'admin', method: 'POST' },
  '/api/admin/gift-cards/:id/status': { category: 'admin', method: 'PUT' },
  '/api/admin/payment-transactions': { category: 'admin', method: 'GET' },
  '/api/admin/orders/:orderId/status': { category: 'admin', method: 'PATCH' },
  '/api/admin/orders/:orderId/shipping': { category: 'admin', method: 'PATCH' },
  '/api/admin/return-requests': { category: 'admin', method: 'GET' },
  '/api/admin/user-discount-codes': { category: 'admin', method: 'GET' },
  '/api/admin/user-discount-codes': { category: 'admin', method: 'POST' },
  '/api/admin/wallet-recharge-requests': { category: 'admin', method: 'GET' },
  '/api/admin/wallet-withdraw-requests': { category: 'admin', method: 'GET' },
  '/api/admin/wallet-withdraw-requests/:id/status': { category: 'admin', method: 'POST' },
  '/api/admin/wallet-recharge-requests/:id/status': { category: 'admin', method: 'PATCH' },
  '/api/admin/wallet-recharge-requests/:id/status': { category: 'admin', method: 'POST' },
  '/api/admin/referral-earnings': { category: 'admin', method: 'GET' },
  '/api/admin/discount-wheel-spins': { category: 'admin', method: 'GET' },
  '/api/admin/user-events': { category: 'admin', method: 'GET' },
  '/api/admin/notifications/send': { category: 'admin', method: 'POST' },
  '/api/admin/notifications': { category: 'admin', method: 'GET' },
  '/api/admin/customer-analytics': { category: 'admin', method: 'GET' },
  '/api/admin/recommendations': { category: 'admin', method: 'GET' },
  '/api/admin/user-profiles': { category: 'admin', method: 'GET' },
  '/api/admin/server-stats': { category: 'admin', method: 'GET' },
  '/api/admin/speedtest': { category: 'admin', method: 'GET' },
  '/api/admin/panel-config': { category: 'admin', method: 'GET' },
  '/api/admin/panel-config': { category: 'admin', method: 'POST' },
  '/api/admin/ftp-backup/config': { category: 'admin', method: 'GET' },
  '/api/admin/ftp-backup/config': { category: 'admin', method: 'POST' },
  '/api/admin/ftp-backup/test': { category: 'admin', method: 'POST' },
  '/api/admin/ftp-backup/run': { category: 'admin', method: 'POST' },
  '/api/admin/carts/:userId': { category: 'admin', method: 'GET' },
  '/api/admin/wallets': { category: 'admin', method: 'GET' },
  '/api/admin/wallets/summary': { category: 'admin', method: 'GET' },
  '/api/admin/wallets/adjust': { category: 'admin', method: 'POST' },
  '/api/admin/wallets/add': { category: 'admin', method: 'POST' },
  '/api/admin/wallets/remove': { category: 'admin', method: 'POST' },
  '/api/admin/wallets/transfer': { category: 'admin', method: 'POST' },
  '/api/admin/visitor-ips': { category: 'admin', method: 'GET' },
  '/api/admin/custom-production-requests': { category: 'admin', method: 'GET' },
  '/api/admin/custom-production/messages': { category: 'admin', method: 'GET' },
  '/api/admin/custom-production/requests/:id/messages': { category: 'admin', method: 'GET' },
  '/api/admin/custom-production-requests/:id': { category: 'admin', method: 'GET' },

  // Read endpoints (GET requests)
  '/api/health': { category: 'read', method: 'GET' },
  '/api/maintenance/status': { category: 'read', method: 'GET' },
  '/api/ollama/health': { category: 'read', method: 'GET' },
  '/api/user-addresses': { category: 'read', method: 'GET' },
  '/api/csrf-token': { category: 'read', method: 'GET' },
  '/api/users/search': { category: 'read', method: 'GET' },
  '/api/return-requests': { category: 'read', method: 'GET' },
  '/api/returns/user/:userId': { category: 'read', method: 'GET' },
  '/api/returns/returnable-orders/:userId': { category: 'read', method: 'GET' },
  '/api/orders/returnable': { category: 'read', method: 'GET' },
  '/api/notifications': { category: 'read', method: 'GET' },
  '/api/notifications/unread-count': { category: 'read', method: 'GET' },

  // Write endpoints (POST/PUT/DELETE requests)
  '/api/user-addresses': { category: 'write', method: 'POST' },
  '/api/user-addresses/:id': { category: 'write', method: 'PUT' },
  '/api/user-addresses/:id': { category: 'write', method: 'DELETE' },
  '/api/user-addresses/:id/set-default': { category: 'write', method: 'PUT' },
  '/api/notifications/:id/read': { category: 'write', method: 'PUT' },
  '/api/notifications/read-all': { category: 'write', method: 'PUT' },
  '/api/ollama/generate': { category: 'write', method: 'POST' },
  '/api/ollama/pull': { category: 'write', method: 'POST' }
};

/**
 * Pattern-based endpoint matching
 * Express route pattern'lerini gerçek path'lerle eşleştirir
 */
function matchEndpoint(path, method) {
  // Exact match kontrolü
  const exactKey = `${path}:${method}`;
  if (ENDPOINT_MAPPINGS[path] && ENDPOINT_MAPPINGS[path].method === method) {
    return ENDPOINT_MAPPINGS[path];
  }

  // Pattern matching
  for (const [pattern, config] of Object.entries(ENDPOINT_MAPPINGS)) {
    if (config.method !== method) continue;

    // Pattern'i regex'e çevir
    const regexPattern = pattern
      .replace(/:[^/]+/g, '[^/]+') // :param -> [^/]+
      .replace(/\//g, '\\/'); // / -> \/

    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(path)) {
      return config;
    }
  }

  // Method bazlı default kategori
  if (method === 'GET') {
    return { category: 'read', method };
  } else if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return { category: 'write', method };
  }

  // Fallback
  return { category: 'default', method };
}

/**
 * Endpoint için rate limit config'i al
 */
function getEndpointRateLimit(path, method) {
  const endpointConfig = matchEndpoint(path, method);
  const category = endpointConfig.category;
  const categoryConfig = CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.default;

  return {
    category,
    ...categoryConfig,
    ...endpointConfig
  };
}

module.exports = {
  CATEGORY_DEFAULTS,
  ENDPOINT_MAPPINGS,
  matchEndpoint,
  getEndpointRateLimit
};

