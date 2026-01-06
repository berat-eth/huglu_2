const express = require('express');
const router = express.Router();

let poolWrapper;

// Middleware - poolWrapper'ı kontrol et
router.use((req, res, next) => {
  if (!poolWrapper) {
    poolWrapper = require('../database-schema').poolWrapper;
  }
  next();
});

// Tabloyu oluştur (eğer yoksa)
async function ensureTableExists() {
  if (!poolWrapper) {
    poolWrapper = require('../database-schema').poolWrapper;
  }
  
  if (!poolWrapper) {
    console.error('❌ poolWrapper mevcut değil, tablo oluşturulamadı');
    return false;
  }

  try {
    await poolWrapper.execute(`
      CREATE TABLE IF NOT EXISTS shipping_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenantId INT NOT NULL DEFAULT 1,
        freeShippingLimit DECIMAL(10,2) DEFAULT 600.00,
        shippingCost DECIMAL(10,2) DEFAULT 30.00,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_tenant (tenantId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ shipping_settings table ready');
    
    // Varsayılan değerleri ekle (eğer yoksa)
    const [existing] = await poolWrapper.execute(`
      SELECT id FROM shipping_settings WHERE tenantId = 1 LIMIT 1
    `);
    
    if (existing.length === 0) {
      await poolWrapper.execute(`
        INSERT INTO shipping_settings (tenantId, freeShippingLimit, shippingCost)
        VALUES (1, 600.00, 30.00)
      `);
      console.log('✅ Varsayılan shipping settings eklendi');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Tablo oluşturulurken hata:', error);
    return false;
  }
}

// İlk istekte tabloyu oluştur
let tableInitialized = false;

// GET /api/admin/settings/shipping - Kargo ayarlarını getir
router.get('/shipping', async (req, res) => {
  try {
    if (!tableInitialized) {
      await ensureTableExists();
      tableInitialized = true;
    }

    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || 1;

    const [settings] = await poolWrapper.execute(`
      SELECT freeShippingLimit, shippingCost
      FROM shipping_settings
      WHERE tenantId = ?
      LIMIT 1
    `, [tenantId]);

    if (settings.length === 0) {
      // Varsayılan değerleri döndür
      return res.json({
        success: true,
        data: {
          freeShippingLimit: 600,
          shippingCost: 30
        }
      });
    }

    res.json({
      success: true,
      data: {
        freeShippingLimit: parseFloat(settings[0].freeShippingLimit),
        shippingCost: parseFloat(settings[0].shippingCost)
      }
    });
  } catch (error) {
    console.error('❌ Kargo ayarları getirilemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Kargo ayarları getirilemedi'
    });
  }
});

// PUT /api/admin/settings/shipping - Kargo ayarlarını güncelle
router.put('/shipping', async (req, res) => {
  try {
    if (!tableInitialized) {
      await ensureTableExists();
      tableInitialized = true;
    }

    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || 1;
    const { freeShippingLimit, shippingCost } = req.body;

    // Validasyon
    if (freeShippingLimit !== undefined && (isNaN(freeShippingLimit) || freeShippingLimit < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir ücretsiz kargo limiti girin'
      });
    }

    if (shippingCost !== undefined && (isNaN(shippingCost) || shippingCost < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir kargo ücreti girin'
      });
    }

    // Mevcut ayarları kontrol et
    const [existing] = await poolWrapper.execute(`
      SELECT id FROM shipping_settings WHERE tenantId = ? LIMIT 1
    `, [tenantId]);

    if (existing.length === 0) {
      // Yeni kayıt oluştur
      await poolWrapper.execute(`
        INSERT INTO shipping_settings (tenantId, freeShippingLimit, shippingCost)
        VALUES (?, ?, ?)
      `, [
        tenantId,
        freeShippingLimit !== undefined ? parseFloat(freeShippingLimit) : 600,
        shippingCost !== undefined ? parseFloat(shippingCost) : 30
      ]);
    } else {
      // Mevcut kaydı güncelle
      const updateFields = [];
      const updateValues = [];

      if (freeShippingLimit !== undefined) {
        updateFields.push('freeShippingLimit = ?');
        updateValues.push(parseFloat(freeShippingLimit));
      }

      if (shippingCost !== undefined) {
        updateFields.push('shippingCost = ?');
        updateValues.push(parseFloat(shippingCost));
      }

      if (updateFields.length > 0) {
        updateValues.push(tenantId);
        await poolWrapper.execute(`
          UPDATE shipping_settings
          SET ${updateFields.join(', ')}, updatedAt = NOW()
          WHERE tenantId = ?
        `, updateValues);
      }
    }

    // Güncellenmiş ayarları döndür
    const [updated] = await poolWrapper.execute(`
      SELECT freeShippingLimit, shippingCost
      FROM shipping_settings
      WHERE tenantId = ?
      LIMIT 1
    `, [tenantId]);

    res.json({
      success: true,
      message: 'Kargo ayarları güncellendi',
      data: {
        freeShippingLimit: parseFloat(updated[0].freeShippingLimit),
        shippingCost: parseFloat(updated[0].shippingCost)
      }
    });
  } catch (error) {
    console.error('❌ Kargo ayarları güncellenemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Kargo ayarları güncellenemedi'
    });
  }
});

// GET /api/settings/shipping - Public endpoint (frontend için)
router.get('/public/shipping', async (req, res) => {
  try {
    if (!tableInitialized) {
      await ensureTableExists();
      tableInitialized = true;
    }

    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || 1;

    const [settings] = await poolWrapper.execute(`
      SELECT freeShippingLimit, shippingCost
      FROM shipping_settings
      WHERE tenantId = ?
      LIMIT 1
    `, [tenantId]);

    if (settings.length === 0) {
      // Varsayılan değerleri döndür
      return res.json({
        success: true,
        data: {
          freeShippingLimit: 600,
          shippingCost: 30
        }
      });
    }

    res.json({
      success: true,
      data: {
        freeShippingLimit: parseFloat(settings[0].freeShippingLimit),
        shippingCost: parseFloat(settings[0].shippingCost)
      }
    });
  } catch (error) {
    console.error('❌ Kargo ayarları getirilemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Kargo ayarları getirilemedi'
    });
  }
});

module.exports = router;

