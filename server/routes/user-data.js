const express = require('express');
const router = express.Router();
const UserDataLogger = require('../services/user-data-logger');

const userDataLogger = new UserDataLogger();


// Kullanıcı verilerini kaydet
router.post('/save-user', async (req, res) => {
  try {
    const { userId, name, surname } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId gerekli'
      });
    }

    const result = userDataLogger.saveUser(userId, name, surname);

    if (result) {
      res.json({
        success: true,
        message: 'Kullanıcı kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Kullanıcı kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ Kullanıcı kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı kaydedilemedi'
    });
  }
});

// Kullanıcı verilerini getir
router.get('/users', async (req, res) => {
  try {
    const result = userDataLogger.getUsersData();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Kullanıcı verileri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı verileri getirilemedi'
    });
  }
});

// Aktivite verilerini kaydet
router.post('/save-activity', async (req, res) => {
  try {
    const { userId, activityType, activityData } = req.body;

    if (!userId || !activityType) {
      return res.status(400).json({
        success: false,
        message: 'userId ve activityType gerekli'
      });
    }

    const result = userDataLogger.saveActivity(userId, activityType, activityData);

    if (result) {
      res.json({
        success: true,
        message: 'Aktivite kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Aktivite kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ Aktivite kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aktivite kaydedilemedi'
    });
  }
});

// Aktivite verilerini getir
router.get('/activities', async (req, res) => {
  try {
    const result = userDataLogger.getActivitiesData();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Aktivite verileri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aktivite verileri getirilemedi'
    });
  }
});

// Tüm verileri temizle
router.delete('/clear-all', async (req, res) => {
  try {
    const result = userDataLogger.clearAllData();
    
    if (result) {
      res.json({
        success: true,
        message: 'Tüm veriler temizlendi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Veriler temizlenemedi'
      });
    }
  } catch (error) {
    console.error('❌ Veri temizleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Veriler temizlenemedi'
    });
  }
});


module.exports = router;
