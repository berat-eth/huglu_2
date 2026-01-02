/**
 * DDoS Defense Routes
 * DDoS savunma ve izleme API endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const { getDDoSDetectionService } = require('../services/ddos-detection-service');
const { getDDoSDefenseService } = require('../services/ddos-defense-service');

// poolWrapper'ı almak için
let poolWrapper = null;

// poolWrapper'ı set etmek için middleware
router.use((req, res, next) => {
  if (!poolWrapper) {
    poolWrapper = req.app.locals.poolWrapper || require('../database-schema').poolWrapper;
  }
  next();
});

// SSE clients için event emitter
const EventEmitter = require('events');
const sseEmitter = new EventEmitter();

/**
 * SSE event gönder
 */
function emitSSEEvent(event, data) {
  sseEmitter.emit('ddos-event', { event, data, timestamp: new Date().toISOString() });
}

/**
 * GET /api/admin/ddos/status - Genel durum ve metrikler
 */
router.get('/status', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    
    // Son 24 saatteki saldırı sayısı
    const [attackStats] = await poolWrapper.execute(`
      SELECT 
        COUNT(*) as totalAttacks,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as criticalAttacks,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as highAttacks,
        COUNT(CASE WHEN blocked = 1 THEN 1 END) as blockedAttacks,
        COUNT(CASE WHEN startTime >= DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 1 END) as recentAttacks
      FROM ddos_attacks
      WHERE tenantId = ? AND startTime >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `, [tenantId]);
    
    // Aktif engellenen IP sayısı
    const [blockedStats] = await poolWrapper.execute(`
      SELECT COUNT(*) as activeBlocks
      FROM blocked_ips
      WHERE tenantId = ? AND isActive = 1
        AND (isPermanent = 1 OR expiresAt > NOW())
    `, [tenantId]);
    
    // Son 1 saatteki request sayısı (attack_logs'tan)
    const [requestStats] = await poolWrapper.execute(`
      SELECT 
        COUNT(*) as totalRequests,
        COUNT(CASE WHEN responseCode >= 400 THEN 1 END) as errorRequests,
        AVG(responseTime) as avgResponseTime
      FROM attack_logs
      WHERE tenantId = ? AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `, [tenantId]);
    
    // Detection service stats
    const detectionService = getDDoSDetectionService(poolWrapper);
    const detectionStats = detectionService.getStats();
    
    // Defense service settings
    const defenseService = getDDoSDefenseService(poolWrapper);
    const settings = await defenseService.getSettings(tenantId);
    
    res.json({
      success: true,
      data: {
        attacks: attackStats[0] || {},
        blocked: blockedStats[0] || {},
        requests: requestStats[0] || {},
        detection: detectionStats,
        settings: {
          autoDefenseEnabled: settings.autoDefenseEnabled,
          thresholds: {
            rpm: settings.rpmThreshold,
            tpm: settings.tpmThreshold,
            attackCount: settings.attackCountThreshold
          }
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('DDoS status hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Status alınamadı',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/ddos/attacks - Saldırı listesi
 */
router.get('/attacks', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { 
      page = 1, 
      limit = 50, 
      severity, 
      attackType, 
      blocked,
      startDate,
      endDate
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereConditions = ['tenantId = ?'];
    const whereValues = [tenantId];
    
    if (severity) {
      whereConditions.push('severity = ?');
      whereValues.push(severity);
    }
    
    if (attackType) {
      whereConditions.push('attackType = ?');
      whereValues.push(attackType);
    }
    
    if (blocked !== undefined) {
      whereConditions.push('blocked = ?');
      whereValues.push(blocked === 'true' ? 1 : 0);
    }
    
    if (startDate) {
      whereConditions.push('startTime >= ?');
      whereValues.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('startTime <= ?');
      whereValues.push(endDate);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Toplam sayı
    const [countResult] = await poolWrapper.execute(`
      SELECT COUNT(*) as total
      FROM ddos_attacks
      ${whereClause}
    `, whereValues);
    
    const total = countResult[0]?.total || 0;
    
    // Saldırılar
    const [attacks] = await poolWrapper.execute(`
      SELECT 
        id, ip, attackType, severity, requestCount, 
        startTime, endTime, blocked, autoBlocked, details, createdAt
      FROM ddos_attacks
      ${whereClause}
      ORDER BY startTime DESC
      LIMIT ? OFFSET ?
    `, [...whereValues, parseInt(limit), offset]);
    
    // Details JSON parse et
    const formattedAttacks = attacks.map(attack => ({
      ...attack,
      details: attack.details ? JSON.parse(attack.details) : null,
      blocked: attack.blocked === 1,
      autoBlocked: attack.autoBlocked === 1
    }));
    
    res.json({
      success: true,
      data: {
        attacks: formattedAttacks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('DDoS attacks listesi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Saldırı listesi alınamadı',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/ddos/attacks/:id - Saldırı detayı
 */
router.get('/attacks/:id', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { id } = req.params;
    
    const [attacks] = await poolWrapper.execute(`
      SELECT 
        id, ip, attackType, severity, requestCount, 
        startTime, endTime, blocked, autoBlocked, details, createdAt, updatedAt
      FROM ddos_attacks
      WHERE id = ? AND tenantId = ?
    `, [id, tenantId]);
    
    if (attacks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saldırı bulunamadı'
      });
    }
    
    const attack = attacks[0];
    
    // Saldırı loglarını al
    const [logs] = await poolWrapper.execute(`
      SELECT 
        id, endpoint, method, userAgent, responseCode, 
        responseTime, timestamp
      FROM attack_logs
      WHERE attackId = ? AND tenantId = ?
      ORDER BY timestamp DESC
      LIMIT 100
    `, [id, tenantId]);
    
    res.json({
      success: true,
      data: {
        attack: {
          ...attack,
          details: attack.details ? JSON.parse(attack.details) : null,
          blocked: attack.blocked === 1,
          autoBlocked: attack.autoBlocked === 1
        },
        logs: logs.map(log => ({
          ...log,
          requestHeaders: log.requestHeaders ? JSON.parse(log.requestHeaders) : null
        }))
      }
    });
  } catch (error) {
    console.error('DDoS attack detay hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Saldırı detayı alınamadı',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/ddos/blocked-ips - Engellenen IP listesi
 */
router.get('/blocked-ips', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { page = 1, limit = 50, isActive, isPermanent } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereConditions = ['tenantId = ?'];
    const whereValues = [tenantId];
    
    if (isActive !== undefined) {
      whereConditions.push('isActive = ?');
      whereValues.push(isActive === 'true' ? 1 : 0);
    }
    
    if (isPermanent !== undefined) {
      whereConditions.push('isPermanent = ?');
      whereValues.push(isPermanent === 'true' ? 1 : 0);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Toplam sayı
    const [countResult] = await poolWrapper.execute(`
      SELECT COUNT(*) as total
      FROM blocked_ips
      ${whereClause}
    `, whereValues);
    
    const total = countResult[0]?.total || 0;
    
    // Engellenen IP'ler
    const [blockedIPs] = await poolWrapper.execute(`
      SELECT 
        id, ip, reason, blockedBy, blockedAt, expiresAt, 
        isActive, isPermanent, attackCount, lastAttackAt, createdAt
      FROM blocked_ips
      ${whereClause}
      ORDER BY blockedAt DESC
      LIMIT ? OFFSET ?
    `, [...whereValues, parseInt(limit), offset]);
    
    // IP'lerin saldırı sayılarını al
    const formattedIPs = await Promise.all(blockedIPs.map(async (blocked) => {
      const [attackCount] = await poolWrapper.execute(`
        SELECT COUNT(*) as count
        FROM ddos_attacks
        WHERE tenantId = ? AND ip = ?
      `, [tenantId, blocked.ip]);
      
      return {
        ...blocked,
        isActive: blocked.isActive === 1,
        isPermanent: blocked.isPermanent === 1,
        totalAttacks: attackCount[0]?.count || 0,
        isExpired: blocked.expiresAt && new Date(blocked.expiresAt) < new Date()
      };
    }));
    
    res.json({
      success: true,
      data: {
        blockedIPs: formattedIPs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Blocked IPs listesi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Engellenen IP listesi alınamadı',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/ddos/block-ip - IP engelleme
 */
router.post('/block-ip', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { ip, reason, isPermanent, blockDuration } = req.body;
    const blockedBy = req.user?.id || null;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'IP adresi gereklidir'
      });
    }
    
    // IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz IP adresi'
      });
    }
    
    const defenseService = getDDoSDefenseService(poolWrapper);
    const result = await defenseService.blockIP(
      tenantId,
      ip,
      reason || 'Manual block',
      blockedBy,
      isPermanent || false,
      blockDuration
    );
    
    // SSE event gönder
    emitSSEEvent('ip_blocked', { ip, reason, isPermanent, blockedBy });
    
    res.json({
      success: true,
      data: result,
      message: 'IP başarıyla engellendi'
    });
  } catch (error) {
    console.error('IP engelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'IP engellenemedi',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/ddos/unblock-ip - IP engelleme kaldırma
 */
router.post('/unblock-ip', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'IP adresi gereklidir'
      });
    }
    
    const defenseService = getDDoSDefenseService(poolWrapper);
    const success = await defenseService.unblockIP(tenantId, ip);
    
    if (success) {
      // SSE event gönder
      emitSSEEvent('ip_unblocked', { ip });
      
      res.json({
        success: true,
        message: 'IP engellemesi kaldırıldı'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'IP bulunamadı veya zaten engellenmemiş'
      });
    }
  } catch (error) {
    console.error('IP engelleme kaldırma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'IP engellemesi kaldırılamadı',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/ddos/bulk-block - Toplu IP engelleme
 */
router.post('/bulk-block', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { ips, reason, isPermanent, blockDuration } = req.body;
    const blockedBy = req.user?.id || null;
    
    if (!ips || !Array.isArray(ips) || ips.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IP listesi gereklidir'
      });
    }
    
    if (ips.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maksimum 100 IP engellenebilir'
      });
    }
    
    const defenseService = getDDoSDefenseService(poolWrapper);
    const results = await defenseService.bulkBlockIPs(
      tenantId,
      ips,
      reason || 'Bulk block',
      blockedBy,
      isPermanent || false
    );
    
    // SSE event gönder
    emitSSEEvent('bulk_ip_blocked', { count: ips.length, results });
    
    res.json({
      success: true,
      data: {
        total: ips.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    });
  } catch (error) {
    console.error('Toplu IP engelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Toplu IP engelleme başarısız',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/ddos/metrics - Zaman bazlı metrikler (grafik için)
 */
router.get('/metrics', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { 
      startDate, 
      endDate, 
      interval = 'hour' // hour, day
    } = req.query;
    
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();
    
    let dateFormat, groupBy;
    if (interval === 'day') {
      dateFormat = '%Y-%m-%d';
      groupBy = 'DATE(timestamp)';
    } else {
      dateFormat = '%Y-%m-%d %H:00:00';
      groupBy = 'DATE_FORMAT(timestamp, "%Y-%m-%d %H:00:00")';
    }
    
    // Metrikleri al (attack_logs tablosu varsa)
    let metrics = [];
    try {
      const [metricsResult] = await poolWrapper.execute(`
        SELECT 
          ${groupBy} as timeSlot,
          COUNT(*) as requestCount,
          COUNT(CASE WHEN responseCode >= 400 THEN 1 END) as errorCount,
          AVG(COALESCE(responseTime, 0)) as avgResponseTime,
          COUNT(DISTINCT ip) as uniqueIPs
        FROM attack_logs
        WHERE tenantId = ? AND timestamp >= ? AND timestamp <= ?
        GROUP BY ${groupBy}
        ORDER BY timeSlot ASC
      `, [tenantId, start, end]);
      metrics = metricsResult || [];
    } catch (error) {
      console.warn('attack_logs tablosu sorgusu hatası (tablo yoksa normal):', error.message);
      metrics = [];
    }
    
    // Saldırı sayılarını al (ddos_attacks tablosu varsa)
    let attacks = [];
    try {
      const [attacksResult] = await poolWrapper.execute(`
        SELECT 
          ${groupBy} as timeSlot,
          COUNT(*) as attackCount,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as criticalAttacks,
          COUNT(CASE WHEN blocked = 1 THEN 1 END) as blockedAttacks
        FROM ddos_attacks
        WHERE tenantId = ? AND startTime >= ? AND startTime <= ?
        GROUP BY ${groupBy}
        ORDER BY timeSlot ASC
      `, [tenantId, start, end]);
      attacks = attacksResult || [];
    } catch (error) {
      console.warn('ddos_attacks tablosu sorgusu hatası (tablo yoksa normal):', error.message);
      attacks = [];
    }
    
    // Engellenen IP sayılarını al (blocked_ips tablosu varsa)
    let blocked = [];
    try {
      const [blockedResult] = await poolWrapper.execute(`
        SELECT 
          ${groupBy} as timeSlot,
          COUNT(*) as blockedCount
        FROM blocked_ips
        WHERE tenantId = ? AND blockedAt >= ? AND blockedAt <= ?
        GROUP BY ${groupBy}
        ORDER BY timeSlot ASC
      `, [tenantId, start, end]);
      blocked = blockedResult || [];
    } catch (error) {
      console.warn('blocked_ips tablosu sorgusu hatası (tablo yoksa normal):', error.message);
      blocked = [];
    }
    
    // Time slot'lara göre birleştir
    const metricsMap = new Map();
    
    metrics.forEach(m => {
      metricsMap.set(m.timeSlot, {
        timeSlot: m.timeSlot,
        requestCount: m.requestCount || 0,
        errorCount: m.errorCount || 0,
        avgResponseTime: parseFloat(m.avgResponseTime || 0),
        uniqueIPs: m.uniqueIPs || 0,
        attackCount: 0,
        criticalAttacks: 0,
        blockedAttacks: 0,
        blockedCount: 0
      });
    });
    
    attacks.forEach(a => {
      const existing = metricsMap.get(a.timeSlot) || {
        timeSlot: a.timeSlot,
        requestCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
        uniqueIPs: 0,
        attackCount: 0,
        criticalAttacks: 0,
        blockedAttacks: 0,
        blockedCount: 0
      };
      existing.attackCount = a.attackCount || 0;
      existing.criticalAttacks = a.criticalAttacks || 0;
      existing.blockedAttacks = a.blockedAttacks || 0;
      metricsMap.set(a.timeSlot, existing);
    });
    
    blocked.forEach(b => {
      const existing = metricsMap.get(b.timeSlot) || {
        timeSlot: b.timeSlot,
        requestCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
        uniqueIPs: 0,
        attackCount: 0,
        criticalAttacks: 0,
        blockedAttacks: 0,
        blockedCount: 0
      };
      existing.blockedCount = b.blockedCount || 0;
      metricsMap.set(b.timeSlot, existing);
    });
    
    const formattedMetrics = Array.from(metricsMap.values()).sort((a, b) => {
      try {
        return new Date(a.timeSlot).getTime() - new Date(b.timeSlot).getTime();
      } catch {
        return 0;
      }
    });
    
    // Eğer hiç veri yoksa boş array döndür
    res.json({
      success: true,
      data: {
        metrics: formattedMetrics || [],
        interval,
        startDate: start,
        endDate: end
      }
    });
  } catch (error) {
    console.error('DDoS metrics hatası:', error);
    // Hata durumunda boş metrics döndür
    res.json({
      success: true,
      data: {
        metrics: [],
        interval: req.query.interval || 'hour',
        startDate: req.query.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: req.query.endDate || new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/admin/ddos/stream - SSE endpoint (gerçek zamanlı veri akışı)
 */
router.get('/stream', authenticateAdmin, (req, res) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx buffering'i devre dışı bırak
  
  // İlk bağlantı mesajı
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
  
  // Event listener ekle
  const eventHandler = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('SSE yazma hatası:', error);
    }
  };
  
  sseEmitter.on('ddos-event', eventHandler);
  
  // Client bağlantısı kapandığında temizle
  req.on('close', () => {
    sseEmitter.removeListener('ddos-event', eventHandler);
    res.end();
  });
  
  // Keep-alive ping (her 30 saniyede bir)
  const keepAlive = setInterval(() => {
    try {
      res.write(`: keep-alive\n\n`);
    } catch (error) {
      clearInterval(keepAlive);
      sseEmitter.removeListener('ddos-event', eventHandler);
    }
  }, 30000);
  
  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

/**
 * GET /api/admin/ddos/top-attackers - En aktif saldırganlar
 */
router.get('/top-attackers', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { limit = 10, days = 7 } = req.query;
    
    const [topAttackers] = await poolWrapper.execute(`
      SELECT 
        ip,
        COUNT(*) as attackCount,
        SUM(requestCount) as totalRequests,
        MAX(severity) as maxSeverity,
        MAX(startTime) as lastAttack,
        COUNT(CASE WHEN blocked = 1 THEN 1 END) as blockedCount
      FROM ddos_attacks
      WHERE tenantId = ? AND startTime >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY ip
      ORDER BY attackCount DESC, totalRequests DESC
      LIMIT ?
    `, [tenantId, parseInt(days), parseInt(limit)]);
    
    // IP'lerin engellenme durumunu kontrol et
    const formattedAttackers = await Promise.all(topAttackers.map(async (attacker) => {
      const [blocked] = await poolWrapper.execute(`
        SELECT isActive, isPermanent, expiresAt
        FROM blocked_ips
        WHERE tenantId = ? AND ip = ? AND isActive = 1
      `, [tenantId, attacker.ip]);
      
      return {
        ...attacker,
        isBlocked: blocked.length > 0,
        isPermanent: blocked.length > 0 && blocked[0].isPermanent === 1,
        expiresAt: blocked.length > 0 ? blocked[0].expiresAt : null
      };
    }));
    
    res.json({
      success: true,
      data: {
        attackers: formattedAttackers,
        period: `${days} gün`
      }
    });
  } catch (error) {
    console.error('Top attackers hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Top attackers alınamadı',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/ddos/settings - Savunma ayarları
 */
router.get('/settings', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const defenseService = getDDoSDefenseService(poolWrapper);
    const settings = await defenseService.getSettings(tenantId);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Settings alma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ayarlar alınamadı',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/ddos/settings - Savunma ayarları güncelle
 */
router.post('/settings', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const updates = req.body;
    const defenseService = getDDoSDefenseService(poolWrapper);
    
    await defenseService.updateSettings(tenantId, updates);
    
    // Detection service thresholds'ları güncelle
    const detectionService = getDDoSDetectionService(poolWrapper);
    await detectionService.updateThresholds(tenantId);
    
    // SSE event gönder
    emitSSEEvent('settings_updated', { tenantId, updates });
    
    res.json({
      success: true,
      message: 'Ayarlar başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Settings güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ayarlar güncellenemedi',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/ddos/whitelist/add - IP'yi whitelist'e ekle
 */
router.post('/whitelist/add', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'IP adresi gereklidir'
      });
    }
    
    const defenseService = getDDoSDefenseService(poolWrapper);
    const success = await defenseService.addToWhitelist(tenantId, ip);
    
    if (success) {
      res.json({
        success: true,
        message: 'IP whitelist\'e eklendi'
      });
    } else {
      res.json({
        success: false,
        message: 'IP zaten whitelist\'te'
      });
    }
  } catch (error) {
    console.error('Whitelist ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Whitelist\'e eklenemedi',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/ddos/whitelist/remove - IP'yi whitelist'ten çıkar
 */
router.post('/whitelist/remove', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 1;
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'IP adresi gereklidir'
      });
    }
    
    const defenseService = getDDoSDefenseService(poolWrapper);
    const success = await defenseService.removeFromWhitelist(tenantId, ip);
    
    if (success) {
      res.json({
        success: true,
        message: 'IP whitelist\'ten çıkarıldı'
      });
    } else {
      res.json({
        success: false,
        message: 'IP whitelist\'te bulunamadı'
      });
    }
  } catch (error) {
    console.error('Whitelist çıkarma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Whitelist\'ten çıkarılamadı',
      error: error.message
    });
  }
});

module.exports = router;

