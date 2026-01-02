/**
 * DDoS Detection Service
 * Gerçek zamanlı saldırı tespiti, IP scoring ve anomaly detection
 */

class DDoSDetectionService {
  constructor(poolWrapper) {
    this.poolWrapper = poolWrapper;
    
    // In-memory tracking (hızlı erişim için)
    this.ipRequestCounts = new Map(); // IP -> { count, windowStart, requests: [] }
    this.ipTokenCounts = new Map(); // IP -> { tokens, windowStart }
    this.activeAttacks = new Map(); // attackId -> attack data
    this.ipScores = new Map(); // IP -> { score, lastSeen, violations: [] }
    
    // Window settings
    this.rpmWindow = 60000; // 1 dakika
    this.tpmWindow = 60000; // 1 dakika
    this.analysisWindow = 300000; // 5 dakika
    
    // Thresholds (default, database'den override edilebilir)
    this.thresholds = {
      rpm: 1000,
      tpm: 50000,
      attackCount: 10,
      suspiciousPattern: 5
    };
    
    // Attack type patterns
    this.attackPatterns = {
      'http_flood': {
        pattern: (requests) => {
          // Aynı endpoint'e çok fazla istek
          const endpointCounts = {};
          requests.forEach(req => {
            const endpoint = req.endpoint || 'unknown';
            endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
          });
          const maxEndpointCount = Math.max(...Object.values(endpointCounts));
          return maxEndpointCount > 100;
        },
        severity: 'high'
      },
      'slowloris': {
        pattern: (requests) => {
          // Uzun süre açık kalan bağlantılar
          const avgResponseTime = requests.reduce((sum, r) => sum + (r.responseTime || 0), 0) / requests.length;
          return avgResponseTime > 5000 && requests.length > 50;
        },
        severity: 'medium'
      },
      'syn_flood': {
        pattern: (requests) => {
          // Çok fazla yeni bağlantı, az tamamlanmış istek
          const completedRequests = requests.filter(r => r.responseCode && r.responseCode < 500).length;
          return requests.length > 200 && completedRequests < requests.length * 0.3;
        },
        severity: 'critical'
      },
      'application_layer': {
        pattern: (requests) => {
          // Özel endpoint'lere odaklı saldırı
          const sensitiveEndpoints = ['/api/auth', '/api/payment', '/api/admin'];
          const sensitiveCount = requests.filter(r => 
            sensitiveEndpoints.some(ep => (r.endpoint || '').includes(ep))
          ).length;
          return sensitiveCount > 50;
        },
        severity: 'high'
      }
    };
    
    // Cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Her dakika
  }

  /**
   * IP'den request al ve analiz et
   */
  async analyzeRequest(ip, requestData) {
    const now = Date.now();
    const tenantId = requestData.tenantId || 1;
    
    // IP'nin whitelist'te olup olmadığını kontrol et
    const isWhitelisted = await this.isWhitelisted(ip, tenantId);
    if (isWhitelisted) {
      return { allowed: true, reason: 'whitelisted' };
    }
    
    // IP'nin blacklist'te olup olmadığını kontrol et
    const isBlocked = await this.isBlocked(ip, tenantId);
    if (isBlocked) {
      return { blocked: true, reason: 'ip_blocked' };
    }
    
    // Request tracking
    this.trackRequest(ip, requestData, now);
    
    // Anomaly detection
    const anomaly = this.detectAnomaly(ip, now);
    if (anomaly.detected) {
      await this.handleAnomaly(ip, anomaly, tenantId, requestData);
    }
    
    // Attack pattern detection
    const attackPattern = this.detectAttackPattern(ip, now);
    if (attackPattern.detected) {
      await this.handleAttack(ip, attackPattern, tenantId, requestData);
      return { blocked: true, reason: 'attack_detected', attackType: attackPattern.type };
    }
    
    return { allowed: true };
  }

  /**
   * Request'i track et
   */
  trackRequest(ip, requestData, timestamp) {
    // RPM tracking
    if (!this.ipRequestCounts.has(ip)) {
      this.ipRequestCounts.set(ip, {
        count: 0,
        windowStart: timestamp,
        requests: []
      });
    }
    
    const rpmData = this.ipRequestCounts.get(ip);
    if (timestamp - rpmData.windowStart >= this.rpmWindow) {
      rpmData.count = 0;
      rpmData.windowStart = timestamp;
      rpmData.requests = [];
    }
    
    rpmData.count++;
    rpmData.requests.push({
      endpoint: requestData.endpoint,
      method: requestData.method,
      userAgent: requestData.userAgent,
      responseCode: requestData.responseCode,
      responseTime: requestData.responseTime,
      timestamp
    });
    
    // TPM tracking (eğer token bilgisi varsa)
    if (requestData.estimatedTokens) {
      if (!this.ipTokenCounts.has(ip)) {
        this.ipTokenCounts.set(ip, {
          tokens: 0,
          windowStart: timestamp
        });
      }
      
      const tpmData = this.ipTokenCounts.get(ip);
      if (timestamp - tpmData.windowStart >= this.tpmWindow) {
        tpmData.tokens = 0;
        tpmData.windowStart = timestamp;
      }
      
      tpmData.tokens += requestData.estimatedTokens;
    }
    
    // IP score güncelle
    this.updateIPScore(ip, requestData, timestamp);
  }

  /**
   * Anomaly detection
   */
  detectAnomaly(ip, timestamp) {
    const rpmData = this.ipRequestCounts.get(ip);
    if (!rpmData) {
      return { detected: false };
    }
    
    const recentRequests = rpmData.requests.filter(r => 
      timestamp - r.timestamp <= this.analysisWindow
    );
    
    // RPM threshold kontrolü
    if (rpmData.count > this.thresholds.rpm) {
      return {
        detected: true,
        type: 'high_rpm',
        severity: rpmData.count > this.thresholds.rpm * 2 ? 'critical' : 'high',
        value: rpmData.count,
        threshold: this.thresholds.rpm
      };
    }
    
    // TPM threshold kontrolü
    const tpmData = this.ipTokenCounts.get(ip);
    if (tpmData && tpmData.tokens > this.thresholds.tpm) {
      return {
        detected: true,
        type: 'high_tpm',
        severity: tpmData.tokens > this.thresholds.tpm * 2 ? 'critical' : 'high',
        value: tpmData.tokens,
        threshold: this.thresholds.tpm
      };
    }
    
    // Pattern-based anomaly
    const suspiciousPatterns = this.detectSuspiciousPatterns(recentRequests);
    if (suspiciousPatterns.length > 0) {
      return {
        detected: true,
        type: 'suspicious_pattern',
        severity: 'medium',
        patterns: suspiciousPatterns
      };
    }
    
    return { detected: false };
  }

  /**
   * Attack pattern detection
   */
  detectAttackPattern(ip, timestamp) {
    const rpmData = this.ipRequestCounts.get(ip);
    if (!rpmData || rpmData.requests.length < 10) {
      return { detected: false };
    }
    
    const recentRequests = rpmData.requests.filter(r => 
      timestamp - r.timestamp <= this.analysisWindow
    );
    
    // Her attack pattern'i kontrol et
    for (const [attackType, pattern] of Object.entries(this.attackPatterns)) {
      if (pattern.pattern(recentRequests)) {
        return {
          detected: true,
          type: attackType,
          severity: pattern.severity,
          requestCount: recentRequests.length
        };
      }
    }
    
    return { detected: false };
  }

  /**
   * Suspicious patterns detection
   */
  detectSuspiciousPatterns(requests) {
    const patterns = [];
    
    // Aynı user agent'tan çok fazla istek
    const userAgentCounts = {};
    requests.forEach(r => {
      const ua = r.userAgent || 'unknown';
      userAgentCounts[ua] = (userAgentCounts[ua] || 0) + 1;
    });
    const maxUACount = Math.max(...Object.values(userAgentCounts));
    if (maxUACount > 50) {
      patterns.push('repeated_user_agent');
    }
    
    // Çok fazla 4xx/5xx hata
    const errorCount = requests.filter(r => r.responseCode >= 400).length;
    if (errorCount > requests.length * 0.5) {
      patterns.push('high_error_rate');
    }
    
    // Çok hızlı ardışık istekler
    if (requests.length > 1) {
      const timeDiffs = [];
      for (let i = 1; i < requests.length; i++) {
        timeDiffs.push(requests[i].timestamp - requests[i-1].timestamp);
      }
      const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      if (avgTimeDiff < 10) { // 10ms'den az
        patterns.push('rapid_requests');
      }
    }
    
    return patterns;
  }

  /**
   * Anomaly'yi handle et
   */
  async handleAnomaly(ip, anomaly, tenantId, requestData) {
    // IP score'u artır
    this.increaseIPScore(ip, anomaly.severity === 'critical' ? 20 : 10);
    
    // Log kaydet
    await this.logAnomaly(ip, anomaly, tenantId, requestData);
    
    // Eğer critical ise otomatik block kontrolü yap
    if (anomaly.severity === 'critical') {
      const ipScore = this.getIPScore(ip);
      if (ipScore > 100) {
        await this.autoBlockIP(ip, tenantId, `Critical anomaly: ${anomaly.type}`);
      }
    }
  }

  /**
   * Attack'ı handle et
   */
  async handleAttack(ip, attackPattern, tenantId, requestData) {
    const now = new Date();
    
    // Aktif saldırı kaydı oluştur veya güncelle
    const attackKey = `${ip}_${attackPattern.type}`;
    let attack = this.activeAttacks.get(attackKey);
    
    if (!attack) {
      // Yeni saldırı kaydı oluştur
      const [result] = await this.poolWrapper.execute(`
        INSERT INTO ddos_attacks 
        (tenantId, ip, attackType, severity, requestCount, startTime, blocked, autoBlocked, details)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
      `, [
        tenantId,
        ip,
        attackPattern.type,
        attackPattern.severity,
        attackPattern.requestCount,
        now,
        JSON.stringify(attackPattern)
      ]);
      
      attack = {
        id: result.insertId,
        ip,
        type: attackPattern.type,
        severity: attackPattern.severity,
        startTime: now,
        requestCount: attackPattern.requestCount
      };
      
      this.activeAttacks.set(attackKey, attack);
    } else {
      // Mevcut saldırıyı güncelle
      attack.requestCount += attackPattern.requestCount;
      await this.poolWrapper.execute(`
        UPDATE ddos_attacks 
        SET requestCount = ?, updatedAt = NOW()
        WHERE id = ?
      `, [attack.requestCount, attack.id]);
    }
    
    // Attack log kaydet
    await this.poolWrapper.execute(`
      INSERT INTO attack_logs 
      (tenantId, attackId, ip, endpoint, method, userAgent, responseCode, responseTime, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId,
      attack.id,
      ip,
      requestData.endpoint,
      requestData.method,
      requestData.userAgent,
      requestData.responseCode,
      requestData.responseTime,
      now
    ]);
    
    // IP score'u artır
    this.increaseIPScore(ip, attackPattern.severity === 'critical' ? 30 : 15);
    
    // Otomatik block kontrolü
    const ipScore = this.getIPScore(ip);
    if (ipScore > 80 || attackPattern.severity === 'critical') {
      await this.autoBlockIP(ip, tenantId, `Attack detected: ${attackPattern.type}`);
      
      // Saldırıyı blocked olarak işaretle
      await this.poolWrapper.execute(`
        UPDATE ddos_attacks 
        SET blocked = 1, autoBlocked = 1, endTime = NOW()
        WHERE id = ?
      `, [attack.id]);
      
      this.activeAttacks.delete(attackKey);
    }
  }

  /**
   * IP score güncelle
   */
  updateIPScore(ip, requestData, timestamp) {
    if (!this.ipScores.has(ip)) {
      this.ipScores.set(ip, {
        score: 0,
        lastSeen: timestamp,
        violations: []
      });
    }
    
    const scoreData = this.ipScores.get(ip);
    scoreData.lastSeen = timestamp;
    
    // Zamanla score azalt (24 saat sonra yarıya iner)
    const hoursSinceLastSeen = (timestamp - scoreData.lastSeen) / (1000 * 60 * 60);
    if (hoursSinceLastSeen > 24) {
      scoreData.score = Math.max(0, scoreData.score * 0.5);
    }
  }

  /**
   * IP score artır
   */
  increaseIPScore(ip, points) {
    if (!this.ipScores.has(ip)) {
      this.ipScores.set(ip, {
        score: 0,
        lastSeen: Date.now(),
        violations: []
      });
    }
    
    const scoreData = this.ipScores.get(ip);
    scoreData.score += points;
    scoreData.violations.push({
      points,
      timestamp: Date.now()
    });
    
    // Son 100 violation'ı tut
    if (scoreData.violations.length > 100) {
      scoreData.violations = scoreData.violations.slice(-100);
    }
  }

  /**
   * IP score al
   */
  getIPScore(ip) {
    const scoreData = this.ipScores.get(ip);
    return scoreData ? scoreData.score : 0;
  }

  /**
   * IP whitelist kontrolü
   */
  async isWhitelisted(ip, tenantId) {
    try {
      const [settings] = await this.poolWrapper.execute(`
        SELECT whitelist FROM ddos_defense_settings WHERE tenantId = ?
      `, [tenantId]);
      
      if (settings.length > 0 && settings[0].whitelist) {
        const whitelist = JSON.parse(settings[0].whitelist || '[]');
        return whitelist.includes(ip);
      }
      
      return false;
    } catch (error) {
      console.error('Whitelist kontrolü hatası:', error);
      return false;
    }
  }

  /**
   * IP block kontrolü
   */
  async isBlocked(ip, tenantId) {
    try {
      const [blocked] = await this.poolWrapper.execute(`
        SELECT id, expiresAt, isPermanent 
        FROM blocked_ips 
        WHERE tenantId = ? AND ip = ? AND isActive = 1
      `, [tenantId, ip]);
      
      if (blocked.length > 0) {
        const block = blocked[0];
        
        // Kalıcı engelleme
        if (block.isPermanent) {
          return true;
        }
        
        // Süreli engelleme kontrolü
        if (block.expiresAt) {
          const expiresAt = new Date(block.expiresAt);
          if (expiresAt > new Date()) {
            return true;
          } else {
            // Süresi dolmuş, aktifliğini kaldır
            await this.poolWrapper.execute(`
              UPDATE blocked_ips SET isActive = 0 WHERE id = ?
            `, [block.id]);
            return false;
          }
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Block kontrolü hatası:', error);
      return false;
    }
  }

  /**
   * Otomatik IP engelleme
   */
  async autoBlockIP(ip, tenantId, reason) {
    try {
      // Zaten engellenmiş mi kontrol et
      const isAlreadyBlocked = await this.isBlocked(ip, tenantId);
      if (isAlreadyBlocked) {
        return;
      }
      
      // Settings'ten block duration al
      const [settings] = await this.poolWrapper.execute(`
        SELECT blockDuration, permanentBlockAfter FROM ddos_defense_settings WHERE tenantId = ?
      `, [tenantId]);
      
      const blockDuration = settings.length > 0 ? settings[0].blockDuration : 3600; // Default 1 saat
      const permanentAfter = settings.length > 0 ? settings[0].permanentBlockAfter : 5;
      
      // IP'nin kaç kez engellendiğini kontrol et
      const [previousBlocks] = await this.poolWrapper.execute(`
        SELECT COUNT(*) as count FROM blocked_ips WHERE tenantId = ? AND ip = ?
      `, [tenantId, ip]);
      
      const blockCount = previousBlocks[0]?.count || 0;
      const isPermanent = blockCount >= permanentAfter;
      
      const now = new Date();
      const expiresAt = isPermanent ? null : new Date(now.getTime() + blockDuration * 1000);
      
      // IP'yi engelle
      await this.poolWrapper.execute(`
        INSERT INTO blocked_ips 
        (tenantId, ip, reason, blockedBy, blockedAt, expiresAt, isActive, isPermanent, attackCount)
        VALUES (?, ?, ?, NULL, ?, ?, 1, ?, 1)
      `, [tenantId, ip, `Auto-block: ${reason}`, now, expiresAt, isPermanent ? 1 : 0]);
      
      console.log(`🛡️ IP otomatik engellendi: ${ip} (${reason})`);
      
      return true;
    } catch (error) {
      console.error('Otomatik IP engelleme hatası:', error);
      return false;
    }
  }

  /**
   * Anomaly log kaydet
   */
  async logAnomaly(ip, anomaly, tenantId, requestData) {
    try {
      // Metrics'e kaydet (her 5 dakikada bir toplu kayıt)
      // Bu kısım metrics service'de yapılabilir
      console.log(`⚠️ Anomaly tespit edildi: ${ip} - ${anomaly.type} (${anomaly.severity})`);
    } catch (error) {
      console.error('Anomaly log hatası:', error);
    }
  }

  /**
   * Cleanup - eski verileri temizle
   */
  cleanup() {
    const now = Date.now();
    const cleanupWindow = this.analysisWindow * 2; // 10 dakika
    
    // Eski request tracking'leri temizle
    for (const [ip, data] of this.ipRequestCounts.entries()) {
      if (now - data.windowStart > cleanupWindow) {
        this.ipRequestCounts.delete(ip);
      }
    }
    
    // Eski token tracking'leri temizle
    for (const [ip, data] of this.ipTokenCounts.entries()) {
      if (now - data.windowStart > cleanupWindow) {
        this.ipTokenCounts.delete(ip);
      }
    }
    
    // Eski IP score'ları temizle (24 saat)
    const scoreCleanupWindow = 24 * 60 * 60 * 1000;
    for (const [ip, data] of this.ipScores.entries()) {
      if (now - data.lastSeen > scoreCleanupWindow && data.score < 10) {
        this.ipScores.delete(ip);
      }
    }
  }

  /**
   * Thresholds güncelle
   */
  async updateThresholds(tenantId) {
    try {
      const [settings] = await this.poolWrapper.execute(`
        SELECT rpmThreshold, tpmThreshold, attackCountThreshold 
        FROM ddos_defense_settings WHERE tenantId = ?
      `, [tenantId]);
      
      if (settings.length > 0) {
        this.thresholds.rpm = settings[0].rpmThreshold || 1000;
        this.thresholds.tpm = settings[0].tpmThreshold || 50000;
        this.thresholds.attackCount = settings[0].attackCountThreshold || 10;
      }
    } catch (error) {
      console.error('Threshold güncelleme hatası:', error);
    }
  }

  /**
   * İstatistikler al
   */
  getStats() {
    return {
      trackedIPs: this.ipRequestCounts.size,
      activeAttacks: this.activeAttacks.size,
      scoredIPs: this.ipScores.size,
      thresholds: this.thresholds
    };
  }

  /**
   * Servisi durdur
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance
let ddosDetectionInstance = null;

/**
 * DDoS detection servisini al veya oluştur
 */
function getDDoSDetectionService(poolWrapper) {
  if (!ddosDetectionInstance) {
    ddosDetectionInstance = new DDoSDetectionService(poolWrapper);
  }
  return ddosDetectionInstance;
}

module.exports = {
  DDoSDetectionService,
  getDDoSDetectionService
};

