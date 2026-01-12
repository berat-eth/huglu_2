const { poolWrapper } = require('../database-schema');
const JWTAuth = require('../security/jwt-auth');

// JWT Authentication middleware
// JWT token'dan userId çıkarır ve req.authenticatedUserId olarak set eder
async function authenticateJWT(req, res, next) {
  try {
    // Authorization header'dan token al
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // JWT yoksa, public endpoint'ler için devam et
      // Ama authenticated endpoint'ler için hata döndürülecek
      req.authenticatedUserId = null;
      return next();
    }

    const token = authHeader.substring(7); // "Bearer " kısmını çıkar

    if (!token) {
      req.authenticatedUserId = null;
      return next();
    }

    // JWT token'ı doğrula
    const jwtAuth = new JWTAuth();
    const decoded = await jwtAuth.verifyAccessToken(token);

    // UserId'yi request'e ekle
    if (decoded.userId) {
      req.authenticatedUserId = parseInt(decoded.userId);
      req.user = {
        userId: parseInt(decoded.userId),
        tenantId: decoded.tenantId,
        role: decoded.role
      };
    } else {
      req.authenticatedUserId = null;
    }

    next();
  } catch (error) {
    // Token geçersizse veya expire olmuşsa
    console.warn('⚠️ JWT authentication failed:', error.message);
    req.authenticatedUserId = null;
    // Public endpoint'ler için devam et, authenticated endpoint'ler için hata döndürülecek
    next();
  }
}

// JWT Authentication zorunlu middleware
// JWT token zorunlu, yoksa 401 döndürür
async function requireJWT(req, res, next) {
  try {
    // Önce JWT'yi doğrula
    await authenticateJWT(req, res, () => {});

    if (!req.authenticatedUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid JWT token.'
      });
    }

    next();
  } catch (error) {
    console.error('❌ JWT authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
}

// Admin authentication middleware
async function authenticateAdmin(req, res, next) {
  try {
    // Admin key kontrolü aktif
    const adminKey = req.headers['x-admin-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!adminKey) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin key required. Please provide X-Admin-Key header or Authorization Bearer token.' 
      });
    }
    
    // GÜVENLİK: Admin key environment variable'dan alınmalı, fallback yok
    const validAdminKey = process.env.ADMIN_KEY;
    
    if (!validAdminKey) {
      console.error('❌ CRITICAL: ADMIN_KEY environment variable is not set');
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error' 
      });
    }
    
    if (adminKey !== validAdminKey) {
      console.warn(`⚠️ Invalid admin key attempt from IP: ${req.ip}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid admin key' 
      });
    }
    
    console.log('✅ Admin authenticated:', req.path);
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
}

// GÜVENLİK: Tenant authentication middleware - Query parametresinden tenant ID alma kaldırıldı
async function authenticateTenant(req, res, next) {
  try {
    // GÜVENLİK: Tenant ID sadece header'dan alınır, query parametresinden alınmaz
    const tenantIdHeader = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
    
    // Tenant ID validation
    if (!tenantIdHeader) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tenant ID required in X-Tenant-Id header' 
      });
    }
    
    // Numeric ve pozitif kontrolü
    const tenantId = parseInt(tenantIdHeader);
    if (isNaN(tenantId) || tenantId <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid tenant ID format. Must be a positive number.' 
      });
    }
    
    // Get tenant info
    const [tenants] = await poolWrapper.execute(
      'SELECT * FROM tenants WHERE id = ?',
      [tenantId]
    );
    
    if (tenants.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid tenant' 
      });
    }
    
    req.tenant = tenants[0];
    next();
  } catch (error) {
    console.error('Tenant authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
}

module.exports = {
  authenticateAdmin,
  authenticateTenant,
  authenticateJWT,
  requireJWT
};
