const express = require('express');
const router = express.Router();
const { poolWrapper } = require('../database-schema');
const { authenticateAdmin } = require('../middleware/auth');

/**
 * POST /api/wholesale/apply
 * Toptan satış başvurusu oluştur
 */
router.post('/apply', express.json(), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 1;
    const { companyName, contactPerson, email, phone, businessType } = req.body || {};

    if (!companyName || !contactPerson || !email || !phone || !businessType) {
      return res.status(400).json({
        success: false,
        message: 'Tüm alanlar zorunludur'
      });
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir e-posta adresi girin'
      });
    }

    // Başvuru numarası oluştur
    const applicationId = `WS-${Date.now().toString().slice(-6)}`;

    // Veritabanına kaydet
    const [result] = await poolWrapper.execute(`
      INSERT INTO wholesale_applications 
      (tenantId, applicationId, companyName, contactPerson, email, phone, businessType, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `, [tenantId, applicationId, companyName, contactPerson, email, phone, businessType]);

    res.json({
      success: true,
      data: {
        id: result.insertId,
        applicationId: applicationId
      }
    });
  } catch (error) {
    console.error('❌ Wholesale application error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Başvuru gönderilemedi'
    });
  }
});

/**
 * GET /api/wholesale/status
 * Kullanıcı başvuru durumunu sorgula (email ile)
 */
router.get('/status', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-posta adresi gerekli'
      });
    }

    const tenantId = req.headers['x-tenant-id'] || 1;
    const [applications] = await poolWrapper.execute(`
      SELECT id, applicationId, companyName, contactPerson, email, phone, businessType, status, note, createdAt, updatedAt
      FROM wholesale_applications
      WHERE tenantId = ? AND email = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `, [tenantId, email]);

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Başvuru bulunamadı'
      });
    }

    res.json({
      success: true,
      data: applications[0]
    });
  } catch (error) {
    console.error('❌ Wholesale status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Başvuru durumu sorgulanamadı'
    });
  }
});

/**
 * GET /api/wholesale/applications
 * Admin: Tüm başvuruları listele
 */
router.get('/applications', authenticateAdmin, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 1;
    const { status, search } = req.query;

    let query = `
      SELECT id, applicationId, companyName, contactPerson, email, phone, businessType, status, note, createdAt, updatedAt
      FROM wholesale_applications
      WHERE tenantId = ?
    `;
    const params = [tenantId];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (companyName LIKE ? OR email LIKE ? OR contactPerson LIKE ? OR applicationId LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY createdAt DESC`;

    const [applications] = await poolWrapper.execute(query, params);

    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('❌ Wholesale applications list error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Başvurular listelenemedi'
    });
  }
});

/**
 * PUT /api/wholesale/applications/:id/status
 * Admin: Başvuru durumunu güncelle
 */
router.put('/applications/:id/status', express.json(), authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body || {};
    const tenantId = req.headers['x-tenant-id'] || 1;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Durum gerekli'
      });
    }

    const validStatuses = ['pending', 'reviewing', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz durum'
      });
    }

    let query = `UPDATE wholesale_applications SET status = ?, updatedAt = NOW()`;
    const params = [status, id, tenantId];

    if (note) {
      query += `, note = ?`;
      params.splice(1, 0, note);
    }

    query += ` WHERE id = ? AND tenantId = ?`;

    const [result] = await poolWrapper.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Başvuru bulunamadı'
      });
    }

    res.json({
      success: true
    });
  } catch (error) {
    console.error('❌ Wholesale status update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Durum güncellenemedi'
    });
  }
});

/**
 * DELETE /api/wholesale/applications/:id
 * Admin: Başvuruyu sil
 */
router.delete('/applications/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] || 1;

    const [result] = await poolWrapper.execute(`
      DELETE FROM wholesale_applications
      WHERE id = ? AND tenantId = ?
    `, [id, tenantId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Başvuru bulunamadı'
      });
    }

    res.json({
      success: true
    });
  } catch (error) {
    console.error('❌ Wholesale delete error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Başvuru silinemedi'
    });
  }
});

module.exports = router;


