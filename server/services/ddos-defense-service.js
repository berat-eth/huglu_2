/**
 * DDoS Defense Service
 * Otomatik savunma mekanizmaları ve threshold yönetimi
 */

class DDoSDefenseService {
  constructor(poolWrapper) {
    this.poolWrapper = poolWrapper;
    this.settings = null;
    this.settingsCache = new Map(); // tenantId -> settings
    this.settingsCacheTTL = 60000; // 1 dakika
    this.settingsCacheTime = new Map(); // tenantId -> timestamp
  }

  /**
   * Settings'i yükle (cache'den veya database'den)
   */
  async getSettings(tenantId = 1) {
    const now = Date.now();
    const cached = this.settingsCache.get(tenantId);
    const cacheTime = this.settingsCacheTime.get(tenantId) || 0;
    
    // Cache hala geçerliyse kullan
    if (cached && (now - cacheTime) < this.settingsCacheTTL) {
      return cached;
    }
    
    try {
      const [settings] = await this.poolWrapper.execute(`
        SELECT * FROM ddos_defense_settings WHERE tenantId = ?
      `, [tenantId]);
      
      if (settings.length > 0) {
        const setting = settings[0];
        const parsed = {
          id: setting.id,
          tenantId: setting.tenantId,
          autoDefenseEnabled: setting.autoDefenseEnabled === 1,
          rpmThreshold: setting.rpmThreshold,
          tpmThreshold: setting.tpmThreshold,
          attackCountThreshold: setting.attackCountThreshold,
          blockDuration: setting.blockDuration,
          permanentBlockAfter: setting.permanentBlockAfter,
          alertThresholds: JSON.parse(setting.alertThresholds || '{}'),
          notificationSettings: JSON.parse(setting.notificationSettings || '{}'),
          whitelist: JSON.parse(setting.whitelist || '[]'),
          blacklist: JSON.parse(setting.blacklist || '[]')
        };
        
        // Cache'e kaydet
        this.settingsCache.set(tenantId, parsed);
        this.settingsCacheTime.set(tenantId, now);
        
        return parsed;
      } else {
        // Default settings oluştur
        return await this.createDefaultSettings(tenantId);
      }
    } catch (error) {
      console.error('Settings yükleme hatası:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Default settings oluştur
   */
  async createDefaultSettings(tenantId) {
    const defaultSettings = {
      tenantId,
      autoDefenseEnabled: true,
      rpmThreshold: 1000,
      tpmThreshold: 50000,
      attackCountThreshold: 10,
      blockDuration: 3600,
      permanentBlockAfter: 5,
      alertThresholds: { high: 50, critical: 100 },
      notificationSettings: { email: false, webhook: false },
      whitelist: [],
      blacklist: []
    };
    
    try {
      await this.poolWrapper.execute(`
        INSERT INTO ddos_defense_settings 
        (tenantId, autoDefenseEnabled, rpmThreshold, tpmThreshold, attackCountThreshold, 
         blockDuration, permanentBlockAfter, alertThresholds, notificationSettings, whitelist, blacklist)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        tenantId,
        defaultSettings.autoDefenseEnabled ? 1 : 0,
        defaultSettings.rpmThreshold,
        defaultSettings.tpmThreshold,
        defaultSettings.attackCountThreshold,
        defaultSettings.blockDuration,
        defaultSettings.permanentBlockAfter,
        JSON.stringify(defaultSettings.alertThresholds),
        JSON.stringify(defaultSettings.notificationSettings),
        JSON.stringify(defaultSettings.whitelist),
        JSON.stringify(defaultSettings.blacklist)
      ]);
      
      this.settingsCache.set(tenantId, defaultSettings);
      this.settingsCacheTime.set(tenantId, Date.now());
      
      return defaultSettings;
    } catch (error) {
      console.error('Default settings oluşturma hatası:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Default settings döndür
   */
  getDefaultSettings() {
    return {
      autoDefenseEnabled: true,
      rpmThreshold: 1000,
      tpmThreshold: 50000,
      attackCountThreshold: 10,
      blockDuration: 3600,
      permanentBlockAfter: 5,
      alertThresholds: { high: 50, critical: 100 },
      notificationSettings: { email: false, webhook: false },
      whitelist: [],
      blacklist: []
    };
  }

  /**
   * Settings güncelle
   */
  async updateSettings(tenantId, updates) {
    try {
      const updateFields = [];
      const updateValues = [];
      
      if (updates.autoDefenseEnabled !== undefined) {
        updateFields.push('autoDefenseEnabled = ?');
        updateValues.push(updates.autoDefenseEnabled ? 1 : 0);
      }
      if (updates.rpmThreshold !== undefined) {
        updateFields.push('rpmThreshold = ?');
        updateValues.push(updates.rpmThreshold);
      }
      if (updates.tpmThreshold !== undefined) {
        updateFields.push('tpmThreshold = ?');
        updateValues.push(updates.tpmThreshold);
      }
      if (updates.attackCountThreshold !== undefined) {
        updateFields.push('attackCountThreshold = ?');
        updateValues.push(updates.attackCountThreshold);
      }
      if (updates.blockDuration !== undefined) {
        updateFields.push('blockDuration = ?');
        updateValues.push(updates.blockDuration);
      }
      if (updates.permanentBlockAfter !== undefined) {
        updateFields.push('permanentBlockAfter = ?');
        updateValues.push(updates.permanentBlockAfter);
      }
      if (updates.alertThresholds !== undefined) {
        updateFields.push('alertThresholds = ?');
        updateValues.push(JSON.stringify(updates.alertThresholds));
      }
      if (updates.notificationSettings !== undefined) {
        updateFields.push('notificationSettings = ?');
        updateValues.push(JSON.stringify(updates.notificationSettings));
      }
      if (updates.whitelist !== undefined) {
        updateFields.push('whitelist = ?');
        updateValues.push(JSON.stringify(updates.whitelist));
      }
      if (updates.blacklist !== undefined) {
        updateFields.push('blacklist = ?');
        updateValues.push(JSON.stringify(updates.blacklist));
      }
      
      if (updateFields.length > 0) {
        updateFields.push('updatedAt = NOW()');
        updateValues.push(tenantId);
        
        await this.poolWrapper.execute(`
          UPDATE ddos_defense_settings 
          SET ${updateFields.join(', ')}
          WHERE tenantId = ?
        `, updateValues);
        
        // Cache'i temizle
        this.settingsCache.delete(tenantId);
        this.settingsCacheTime.delete(tenantId);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Settings güncelleme hatası:', error);
      throw error;
    }
  }

  /**
   * IP'yi whitelist'e ekle
   */
  async addToWhitelist(tenantId, ip) {
    const settings = await this.getSettings(tenantId);
    if (!settings.whitelist.includes(ip)) {
      settings.whitelist.push(ip);
      await this.updateSettings(tenantId, { whitelist: settings.whitelist });
      return true;
    }
    return false;
  }

  /**
   * IP'yi whitelist'ten çıkar
   */
  async removeFromWhitelist(tenantId, ip) {
    const settings = await this.getSettings(tenantId);
    const index = settings.whitelist.indexOf(ip);
    if (index > -1) {
      settings.whitelist.splice(index, 1);
      await this.updateSettings(tenantId, { whitelist: settings.whitelist });
      return true;
    }
    return false;
  }

  /**
   * IP'yi blacklist'e ekle
   */
  async addToBlacklist(tenantId, ip) {
    const settings = await this.getSettings(tenantId);
    if (!settings.blacklist.includes(ip)) {
      settings.blacklist.push(ip);
      await this.updateSettings(tenantId, { blacklist: settings.blacklist });
      
      // IP'yi hemen engelle
      await this.blockIP(tenantId, ip, 'Blacklisted', null, true);
      return true;
    }
    return false;
  }

  /**
   * IP'yi blacklist'ten çıkar
   */
  async removeFromBlacklist(tenantId, ip) {
    const settings = await this.getSettings(tenantId);
    const index = settings.blacklist.indexOf(ip);
    if (index > -1) {
      settings.blacklist.splice(index, 1);
      await this.updateSettings(tenantId, { blacklist: settings.blacklist });
      return true;
    }
    return false;
  }

  /**
   * IP engelleme
   */
  async blockIP(tenantId, ip, reason, blockedBy = null, isPermanent = false, blockDuration = null) {
    try {
      const settings = await this.getSettings(tenantId);
      
      // Süre belirtilmemişse settings'ten al
      if (!blockDuration) {
        blockDuration = settings.blockDuration;
      }
      
      const now = new Date();
      const expiresAt = isPermanent ? null : new Date(now.getTime() + blockDuration * 1000);
      
      // Önce mevcut engellemeleri kontrol et
      const [existing] = await this.poolWrapper.execute(`
        SELECT id FROM blocked_ips 
        WHERE tenantId = ? AND ip = ? AND isActive = 1
      `, [tenantId, ip]);
      
      if (existing.length > 0) {
        // Mevcut engellemeyi güncelle
        await this.poolWrapper.execute(`
          UPDATE blocked_ips 
          SET reason = ?, blockedBy = ?, blockedAt = ?, expiresAt = ?, isPermanent = ?, isActive = 1,
              attackCount = attackCount + 1, lastAttackAt = NOW(), updatedAt = NOW()
          WHERE id = ?
        `, [reason, blockedBy, now, expiresAt, isPermanent ? 1 : 0, existing[0].id]);
        
        return { success: true, updated: true, id: existing[0].id };
      } else {
        // Yeni engelleme oluştur
        const [result] = await this.poolWrapper.execute(`
          INSERT INTO blocked_ips 
          (tenantId, ip, reason, blockedBy, blockedAt, expiresAt, isActive, isPermanent, attackCount, lastAttackAt)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?, 1, ?)
        `, [tenantId, ip, reason, blockedBy, now, expiresAt, isPermanent ? 1 : 0, now]);
        
        return { success: true, updated: false, id: result.insertId };
      }
    } catch (error) {
      console.error('IP engelleme hatası:', error);
      throw error;
    }
  }

  /**
   * IP engelleme kaldır
   */
  async unblockIP(tenantId, ip) {
    try {
      const [result] = await this.poolWrapper.execute(`
        UPDATE blocked_ips 
        SET isActive = 0, updatedAt = NOW()
        WHERE tenantId = ? AND ip = ? AND isActive = 1
      `, [tenantId, ip]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('IP engelleme kaldırma hatası:', error);
      throw error;
    }
  }

  /**
   * Toplu IP engelleme
   */
  async bulkBlockIPs(tenantId, ips, reason, blockedBy = null, isPermanent = false) {
    const results = [];
    for (const ip of ips) {
      try {
        const result = await this.blockIP(tenantId, ip, reason, blockedBy, isPermanent);
        results.push({ ip, success: true, ...result });
      } catch (error) {
        results.push({ ip, success: false, error: error.message });
      }
    }
    return results;
  }

  /**
   * Toplu IP engelleme kaldırma
   */
  async bulkUnblockIPs(tenantId, ips) {
    const results = [];
    for (const ip of ips) {
      try {
        const success = await this.unblockIP(tenantId, ip);
        results.push({ ip, success });
      } catch (error) {
        results.push({ ip, success: false, error: error.message });
      }
    }
    return results;
  }

  /**
   * Alert kontrolü ve gönderimi
   */
  async checkAndSendAlerts(tenantId, metrics) {
    try {
      const settings = await this.getSettings(tenantId);
      
      if (!settings.notificationSettings.email && !settings.notificationSettings.webhook) {
        return; // Bildirim kapalı
      }
      
      const alerts = [];
      
      // High threshold kontrolü
      if (metrics.attackCount >= settings.alertThresholds.high) {
        alerts.push({
          type: 'high_attack_count',
          severity: 'high',
          message: `Yüksek saldırı sayısı: ${metrics.attackCount}`,
          threshold: settings.alertThresholds.high
        });
      }
      
      // Critical threshold kontrolü
      if (metrics.attackCount >= settings.alertThresholds.critical) {
        alerts.push({
          type: 'critical_attack_count',
          severity: 'critical',
          message: `Kritik saldırı sayısı: ${metrics.attackCount}`,
          threshold: settings.alertThresholds.critical
        });
      }
      
      // Alert'leri gönder
      for (const alert of alerts) {
        await this.sendAlert(tenantId, alert, settings.notificationSettings);
      }
    } catch (error) {
      console.error('Alert kontrolü hatası:', error);
    }
  }

  /**
   * Alert gönder
   */
  async sendAlert(tenantId, alert, notificationSettings) {
    // Email gönderimi (implement edilebilir)
    if (notificationSettings.email) {
      console.log(`📧 Email alert: ${alert.message}`);
      // Email servisi entegrasyonu buraya eklenebilir
    }
    
    // Webhook gönderimi (implement edilebilir)
    if (notificationSettings.webhook && notificationSettings.webhookUrl) {
      try {
        const axios = require('axios');
        await axios.post(notificationSettings.webhookUrl, {
          tenantId,
          alert,
          timestamp: new Date().toISOString()
        });
        console.log(`🔔 Webhook alert gönderildi: ${alert.message}`);
      } catch (error) {
        console.error('Webhook gönderim hatası:', error);
      }
    }
  }

  /**
   * Rate limit otomatik ayarlama
   */
  async adjustRateLimits(tenantId, currentLoad) {
    try {
      const settings = await this.getSettings(tenantId);
      
      // Yüksek yük altında threshold'ları geçici olarak düşür
      if (currentLoad > 0.8) { // %80'den fazla yük
        return {
          adjusted: true,
          rpmThreshold: Math.floor(settings.rpmThreshold * 0.7),
          tpmThreshold: Math.floor(settings.tpmThreshold * 0.7),
          reason: 'High load detected'
        };
      }
      
      return {
        adjusted: false,
        rpmThreshold: settings.rpmThreshold,
        tpmThreshold: settings.tpmThreshold
      };
    } catch (error) {
      console.error('Rate limit ayarlama hatası:', error);
      return { adjusted: false };
    }
  }

  /**
   * Cache'i temizle
   */
  clearCache(tenantId = null) {
    if (tenantId) {
      this.settingsCache.delete(tenantId);
      this.settingsCacheTime.delete(tenantId);
    } else {
      this.settingsCache.clear();
      this.settingsCacheTime.clear();
    }
  }
}

// Singleton instance
let ddosDefenseInstance = null;

/**
 * DDoS defense servisini al veya oluştur
 */
function getDDoSDefenseService(poolWrapper) {
  if (!ddosDefenseInstance) {
    ddosDefenseInstance = new DDoSDefenseService(poolWrapper);
  }
  return ddosDefenseInstance;
}

module.exports = {
  DDoSDefenseService,
  getDDoSDefenseService
};

