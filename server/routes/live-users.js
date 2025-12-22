const express = require('express');
const router = express.Router();
const { poolWrapper } = require('../orm/sequelize');

// In-memory storage for live users (temporary - will be replaced with database)
let liveUsers = [];

// Helper function to get user info from database
async function getUserInfo(userId) {
  if (!userId) return null;
  try {
    const [rows] = await poolWrapper.execute(
      'SELECT id, name, phone, email FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    return rows.length > 0 ? { name: rows[0].name, phone: rows[0].phone, email: rows[0].email } : null;
  } catch (error) {
    console.error('❌ Error getting user info:', error);
    return null;
  }
}

// Get live users - Analitik verilerle entegre
router.get('/', async (req, res) => {
  try {
    console.log('👥 Live users requested');
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || 1;
    
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Aktif session'ları analitik tablosundan al
    const [activeSessions] = await poolWrapper.execute(`
      SELECT 
        us.sessionId,
        us.userId,
        us.deviceId,
        us.startTime,
        us.endTime,
        us.duration,
        us.eventCount,
        us.metadata,
        u.name as userName,
        u.email as userEmail,
        u.phone as userPhone
      FROM user_sessions_v2 us
      LEFT JOIN users u ON us.userId = u.id AND u.tenantId = us.tenantId
      WHERE us.tenantId = ?
        AND us.startTime > ?
        AND (us.endTime IS NULL OR us.endTime > ?)
      ORDER BY us.startTime DESC
      LIMIT 100
    `, [tenantId, fiveMinutesAgo, fiveMinutesAgo]);

    // Her session için son event'i ve ekran bilgisini al
    const sessionsWithDetails = await Promise.all(activeSessions.map(async (session) => {
      // Son event'i al
      const [lastEvents] = await poolWrapper.execute(`
        SELECT eventType, screenName, properties, timestamp
        FROM user_events
        WHERE sessionId = ? AND tenantId = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `, [session.sessionId, tenantId]);

      const lastEvent = lastEvents.length > 0 ? lastEvents[0] : null;
      
      // Device bilgisini metadata'dan veya deviceId'den çıkar
      let device = 'Desktop';
      let browser = 'Unknown';
      let os = 'Unknown';
      
      if (session.metadata) {
        try {
          const metadata = typeof session.metadata === 'string' 
            ? JSON.parse(session.metadata) 
            : session.metadata;
          
          if (metadata.platform) {
            device = metadata.platform === 'ios' || metadata.platform === 'android' ? 'Mobile' : 'Desktop';
            os = metadata.osVersion || metadata.platform;
          }
          if (metadata.deviceModel) {
            if (metadata.deviceModel.toLowerCase().includes('tablet')) {
              device = 'Tablet';
            }
          }
        } catch (e) {
          // Metadata parse hatası, varsayılan değerleri kullan
        }
      }

      // Session süresini hesapla
      const startTime = new Date(session.startTime);
      const endTime = session.endTime ? new Date(session.endTime) : now;
      const duration = Math.floor((endTime - startTime) / 1000); // saniye cinsinden

      // Son görüntülenen ürünleri al
      const [productViews] = await poolWrapper.execute(`
        SELECT DISTINCT
          JSON_UNQUOTE(JSON_EXTRACT(properties, '$.productId')) as productId,
          JSON_UNQUOTE(JSON_EXTRACT(properties, '$.productName')) as productName,
          JSON_UNQUOTE(JSON_EXTRACT(properties, '$.price')) as price
        FROM user_events
        WHERE sessionId = ? 
          AND tenantId = ?
          AND eventType = 'product_view'
        ORDER BY timestamp DESC
        LIMIT 5
      `, [session.sessionId, tenantId]);

      // Sepet bilgilerini al
      const [cartEvents] = await poolWrapper.execute(`
        SELECT 
          JSON_UNQUOTE(JSON_EXTRACT(properties, '$.productId')) as productId,
          JSON_UNQUOTE(JSON_EXTRACT(properties, '$.quantity')) as quantity,
          JSON_UNQUOTE(JSON_EXTRACT(properties, '$.price')) as price,
          JSON_UNQUOTE(JSON_EXTRACT(properties, '$.totalValue')) as totalValue
        FROM user_events
        WHERE sessionId = ? 
          AND tenantId = ?
          AND eventType = 'add_to_cart'
        ORDER BY timestamp DESC
      `, [session.sessionId, tenantId]);

      const cartItems = cartEvents.length;
      const cartValue = cartEvents.reduce((sum, item) => {
        const value = parseFloat(item.totalValue || item.price || 0);
        return sum + value;
      }, 0);

      // Sayfa görüntüleme sayısını al
      const [pageViews] = await poolWrapper.execute(`
        SELECT COUNT(*) as count
        FROM user_events
        WHERE sessionId = ? 
          AND tenantId = ?
          AND eventType = 'screen_view'
      `, [session.sessionId, tenantId]);

      return {
        id: session.sessionId,
        userId: session.userId,
        sessionId: session.sessionId,
        userName: session.userName || 'Misafir Kullanıcı',
        userEmail: session.userEmail,
        userPhone: session.userPhone,
        device: device,
        browser: browser,
        os: os,
        country: 'Türkiye', // IP geolocation ile geliştirilebilir
        city: 'İstanbul', // IP geolocation ile geliştirilebilir
        page: lastEvent?.screenName || 'Ana Sayfa',
        lastActivity: lastEvent?.timestamp || session.startTime,
        duration: duration,
        pagesViewed: pageViews[0]?.count || 0,
        productsViewed: productViews.map(p => p.productName || `Ürün ${p.productId}`).filter(Boolean),
        cartItems: cartItems,
        cartValue: cartValue,
        eventCount: session.eventCount || 0,
        isActive: !session.endTime || new Date(session.endTime) > fiveMinutesAgo
      };
    }));

    // In-memory'deki kullanıcıları da ekle (backward compatibility)
    let activeUsers = liveUsers.filter(user => {
      const lastActivity = new Date(user.lastActivity);
      return lastActivity > fiveMinutesAgo;
    });

    // Enrich with user info from database
    activeUsers = await Promise.all(activeUsers.map(async (user) => {
      if (user.userId) {
        const userInfo = await getUserInfo(user.userId);
        if (userInfo) {
          return {
            ...user,
            userName: userInfo.name,
            userPhone: userInfo.phone,
            userEmail: userInfo.email
          };
        }
      }
      return user;
    }));

    // Analitik verilerle birleştir (duplicate'leri önle)
    const sessionIds = new Set(sessionsWithDetails.map(s => s.sessionId));
    const uniqueInMemoryUsers = activeUsers.filter(u => !sessionIds.has(u.sessionId));
    
    const allActiveUsers = [...sessionsWithDetails, ...uniqueInMemoryUsers];

    console.log(`📊 Returning ${allActiveUsers.length} active users (${sessionsWithDetails.length} from analytics, ${uniqueInMemoryUsers.length} from memory)`);
    
    res.json({
      success: true,
      data: allActiveUsers
    });
  } catch (error) {
    console.error('❌ Error getting live users:', error);
    res.status(500).json({ success: false, message: 'Error getting live users' });
  }
});

// Add new live user (when user visits)
router.post('/', (req, res) => {
  try {
    const { userId, sessionId, ipAddress, userAgent, page, referrer } = req.body;
    
    // Default location for development (in production, use IP geolocation service)
    const defaultLocation = {
      country: 'Türkiye',
      city: 'İstanbul', 
      region: 'Marmara',
      lat: 41.0082,
      lng: 28.9784
    };
    
    // Parse user agent for device/browser info
    const device = userAgent.includes('Mobile') ? 'Mobile' : 
                   userAgent.includes('Tablet') ? 'Tablet' : 'Desktop';
    const browser = userAgent.includes('Chrome') ? 'Chrome' :
                   userAgent.includes('Firefox') ? 'Firefox' :
                   userAgent.includes('Safari') ? 'Safari' : 'Other';
    const os = userAgent.includes('Windows') ? 'Windows' :
              userAgent.includes('Mac') ? 'macOS' :
              userAgent.includes('Linux') ? 'Linux' : 'Other';
    
    const newUser = {
      id: Date.now().toString(),
      userId,
      sessionId,
      ipAddress,
      country: defaultLocation.country,
      city: defaultLocation.city,
      region: defaultLocation.region,
      latitude: defaultLocation.lat,
      longitude: defaultLocation.lng,
      userAgent,
      device,
      browser,
      os,
      lastActivity: new Date().toISOString(),
      isActive: true,
      page,
      duration: 0,
      referrer
    };
    
    // Remove existing user with same session
    liveUsers = liveUsers.filter(u => u.sessionId !== sessionId);
    liveUsers.push(newUser);
    
    console.log('✅ New live user added:', newUser.city, newUser.country);
    res.json({
      success: true,
      data: newUser
    });
  } catch (error) {
    console.error('❌ Error adding live user:', error);
    res.status(500).json({ success: false, message: 'Error adding live user' });
  }
});

// Update user activity
router.patch('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page, duration } = req.body;
    
    const userIndex = liveUsers.findIndex(u => u.sessionId === sessionId);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    liveUsers[userIndex] = {
      ...liveUsers[userIndex],
      page,
      duration,
      lastActivity: new Date().toISOString(),
      isActive: true
    };
    
    console.log('✅ User activity updated:', sessionId);
    res.json({
      success: true,
      data: liveUsers[userIndex]
    });
  } catch (error) {
    console.error('❌ Error updating user activity:', error);
    res.status(500).json({ success: false, message: 'Error updating user activity' });
  }
});

// Remove inactive users
router.delete('/inactive', (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const beforeCount = liveUsers.length;
    liveUsers = liveUsers.filter(user => {
      const lastActivity = new Date(user.lastActivity);
      return lastActivity > fiveMinutesAgo;
    });
    
    const removedCount = beforeCount - liveUsers.length;
    console.log('🧹 Removed inactive users:', removedCount);
    
    res.json({
      success: true,
      message: `Removed ${removedCount} inactive users`,
      data: { removedCount }
    });
  } catch (error) {
    console.error('❌ Error removing inactive users:', error);
    res.status(500).json({ success: false, message: 'Error removing inactive users' });
  }
});

module.exports = router;
