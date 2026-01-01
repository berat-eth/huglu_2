const express = require('express');
const router = express.Router();
const axios = require('axios');

// poolWrapper'ı almak için
let poolWrapper = null;

// poolWrapper'ı set etmek için middleware
router.use((req, res, next) => {
  if (!poolWrapper) {
    poolWrapper = req.app.locals.poolWrapper || require('../database-schema').poolWrapper;
  }
  next();
});

// ElevenLabs config tablosunu oluştur
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
      CREATE TABLE IF NOT EXISTS elevenlabs_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        enabled TINYINT(1) DEFAULT 1,
        apiKey VARCHAR(500) DEFAULT '',
        defaultVoiceId VARCHAR(100) DEFAULT 'JBFqnCBsd6RMkjVDRZzb',
        defaultModelId VARCHAR(100) DEFAULT 'eleven_multilingual_v2',
        defaultOutputFormat VARCHAR(50) DEFAULT 'mp3_44100_128',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ elevenlabs_config table ready');
    return true;
  } catch (error) {
    console.error('❌ ElevenLabs config tablosu oluşturulamadı:', error);
    return false;
  }
}

// Tabloyu oluştur
ensureTableExists();

// GET /api/elevenlabs/config - Config'i getir
router.get('/config', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const [configs] = await poolWrapper.execute(`
      SELECT id, enabled, apiKey, defaultVoiceId, defaultModelId, defaultOutputFormat, createdAt, updatedAt
      FROM elevenlabs_config
      ORDER BY id ASC
      LIMIT 1
    `);

    let config = configs[0];

    if (!config) {
      // Varsayılan config oluştur
      const [result] = await poolWrapper.execute(`
        INSERT INTO elevenlabs_config (enabled, apiKey, defaultVoiceId, defaultModelId, defaultOutputFormat, createdAt, updatedAt)
        VALUES (1, '', 'JBFqnCBsd6RMkjVDRZzb', 'eleven_multilingual_v2', 'mp3_44100_128', NOW(), NOW())
      `);

      const [newConfigs] = await poolWrapper.execute(`
        SELECT id, enabled, apiKey, defaultVoiceId, defaultModelId, defaultOutputFormat, createdAt, updatedAt
        FROM elevenlabs_config
        WHERE id = ?
      `, [result.insertId]);

      config = newConfigs[0];
    }

    const apiKey = config.apiKey || '';
    const configResponse = {
      enabled: config.enabled ? true : false,
      apiKey: apiKey && apiKey.length > 12 
        ? (apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4)) 
        : '',
      apiKeyMasked: apiKey && apiKey.length > 12,
      defaultVoiceId: config.defaultVoiceId || 'JBFqnCBsd6RMkjVDRZzb',
      defaultModelId: config.defaultModelId || 'eleven_multilingual_v2',
      defaultOutputFormat: config.defaultOutputFormat || 'mp3_44100_128'
    };

    res.json({
      success: true,
      config: configResponse
    });
  } catch (error) {
    console.error('❌ ElevenLabs config alınamadı:', error);
    res.status(500).json({
      success: false,
      message: 'Config alınamadı',
      error: error.message
    });
  }
});

// POST /api/elevenlabs/config - Config'i kaydet
router.post('/config', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { enabled, apiKey, defaultVoiceId, defaultModelId, defaultOutputFormat } = req.body;

    const [configs] = await poolWrapper.execute(`
      SELECT id, enabled, apiKey, defaultVoiceId, defaultModelId, defaultOutputFormat
      FROM elevenlabs_config
      ORDER BY id ASC
      LIMIT 1
    `);

    let config = configs[0];

    if (config) {
      // Mevcut config'i güncelle
      await poolWrapper.execute(`
        UPDATE elevenlabs_config SET
          enabled = ?,
          apiKey = ?,
          defaultVoiceId = ?,
          defaultModelId = ?,
          defaultOutputFormat = ?,
          updatedAt = NOW()
        WHERE id = ?
      `, [
        enabled !== undefined ? (enabled ? 1 : 0) : config.enabled,
        apiKey !== undefined ? apiKey : config.apiKey,
        defaultVoiceId || config.defaultVoiceId,
        defaultModelId || config.defaultModelId,
        defaultOutputFormat || config.defaultOutputFormat,
        config.id
      ]);

      const [updatedConfigs] = await poolWrapper.execute(`
        SELECT id, enabled, apiKey, defaultVoiceId, defaultModelId, defaultOutputFormat
        FROM elevenlabs_config
        WHERE id = ?
      `, [config.id]);

      config = updatedConfigs[0];
    } else {
      // Yeni config oluştur
      const [result] = await poolWrapper.execute(`
        INSERT INTO elevenlabs_config (enabled, apiKey, defaultVoiceId, defaultModelId, defaultOutputFormat, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        enabled !== undefined ? (enabled ? 1 : 0) : 1,
        apiKey || '',
        defaultVoiceId || 'JBFqnCBsd6RMkjVDRZzb',
        defaultModelId || 'eleven_multilingual_v2',
        defaultOutputFormat || 'mp3_44100_128'
      ]);

      const [newConfigs] = await poolWrapper.execute(`
        SELECT id, enabled, apiKey, defaultVoiceId, defaultModelId, defaultOutputFormat
        FROM elevenlabs_config
        WHERE id = ?
      `, [result.insertId]);

      config = newConfigs[0];
    }

    const apiKeyValue = config.apiKey || '';
    const configResponse = {
      enabled: config.enabled ? true : false,
      apiKey: apiKeyValue && apiKeyValue.length > 12 
        ? (apiKeyValue.substring(0, 8) + '...' + apiKeyValue.substring(apiKeyValue.length - 4)) 
        : '',
      apiKeyMasked: apiKeyValue && apiKeyValue.length > 12,
      defaultVoiceId: config.defaultVoiceId || 'JBFqnCBsd6RMkjVDRZzb',
      defaultModelId: config.defaultModelId || 'eleven_multilingual_v2',
      defaultOutputFormat: config.defaultOutputFormat || 'mp3_44100_128'
    };

    res.json({
      success: true,
      config: configResponse
    });
  } catch (error) {
    console.error('❌ ElevenLabs config kaydedilemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Config kaydedilemedi',
      error: error.message
    });
  }
});

// POST /api/elevenlabs/text-to-speech - Text to Speech
router.post('/text-to-speech', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { text, voiceId, modelId, outputFormat } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }

    // Config'i al
    const [configs] = await poolWrapper.execute(`
      SELECT enabled, apiKey, defaultVoiceId, defaultModelId, defaultOutputFormat
      FROM elevenlabs_config
      WHERE enabled = 1
      ORDER BY id ASC
      LIMIT 1
    `);

    if (!configs || configs.length === 0 || !configs[0].apiKey) {
      return res.status(400).json({
        success: false,
        message: 'ElevenLabs API key not configured'
      });
    }

    const config = configs[0];
    const apiKey = config.apiKey;
    const finalVoiceId = voiceId || config.defaultVoiceId || 'JBFqnCBsd6RMkjVDRZzb';
    const finalModelId = modelId || config.defaultModelId || 'eleven_multilingual_v2';
    const finalOutputFormat = outputFormat || config.defaultOutputFormat || 'mp3_44100_128';

    // ElevenLabs API'ye istek gönder
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`,
      {
        text: text,
        model_id: finalModelId,
        output_format: finalOutputFormat
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );

    // Audio data'yı base64'e çevir
    const audioBuffer = Buffer.from(response.data);
    const base64Audio = audioBuffer.toString('base64');
    const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    res.json({
      success: true,
      audio: dataUrl,
      format: finalOutputFormat,
      voiceId: finalVoiceId,
      modelId: finalModelId
    });

  } catch (error) {
    console.error('❌ ElevenLabs text-to-speech hatası:', error);
    
    let errorMessage = 'Text-to-speech failed';
    if (error.response) {
      errorMessage = error.response.data?.detail?.message || error.response.statusText || errorMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(error.response?.status || 500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
});

// GET /api/elevenlabs/voices - Mevcut sesleri listele
router.get('/voices', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const [configs] = await poolWrapper.execute(`
      SELECT enabled, apiKey
      FROM elevenlabs_config
      WHERE enabled = 1
      ORDER BY id ASC
      LIMIT 1
    `);

    if (!configs || configs.length === 0 || !configs[0].apiKey) {
      return res.status(400).json({
        success: false,
        message: 'ElevenLabs API key not configured'
      });
    }

    const apiKey = configs[0].apiKey;

    // ElevenLabs API'den sesleri al
    const response = await axios.get(
      'https://api.elevenlabs.io/v1/voices',
      {
        headers: {
          'xi-api-key': apiKey
        },
        timeout: 10000
      }
    );

    res.json({
      success: true,
      voices: response.data.voices || []
    });

  } catch (error) {
    console.error('❌ ElevenLabs voices hatası:', error);
    
    let errorMessage = 'Voices fetch failed';
    if (error.response) {
      errorMessage = error.response.data?.detail?.message || error.response.statusText || errorMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(error.response?.status || 500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
});

module.exports = router;

