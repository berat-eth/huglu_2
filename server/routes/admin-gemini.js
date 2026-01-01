const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// poolWrapper'ı almak için
let poolWrapper = null;

// poolWrapper'ı set etmek için middleware
router.use((req, res, next) => {
  if (!poolWrapper) {
    poolWrapper = req.app.locals.poolWrapper || require('../database-schema').poolWrapper;
  }
  next();
});

// Tabloları oluştur (eğer yoksa)
async function ensureTablesExist() {
  if (!poolWrapper) {
    poolWrapper = require('../database-schema').poolWrapper;
  }
  
  if (!poolWrapper) {
    console.error('❌ poolWrapper mevcut değil, tablolar oluşturulamadı');
    return false;
  }

  try {
    // gemini_config tablosunu oluştur
    await poolWrapper.execute(`
      CREATE TABLE IF NOT EXISTS gemini_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        enabled TINYINT(1) DEFAULT 1,
        apiKey VARCHAR(500) DEFAULT '',
        model VARCHAR(100) DEFAULT 'gemini-2.5-flash',
        temperature DECIMAL(3,2) DEFAULT 0.70,
        maxTokens INT DEFAULT 8192,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ gemini_config table ready');

    // gemini_sessions tablosunu oluştur
    await poolWrapper.execute(`
      CREATE TABLE IF NOT EXISTS gemini_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sessionId VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255),
        messages JSON NOT NULL,
        messageCount INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_session_id (sessionId),
        INDEX idx_created (createdAt DESC),
        INDEX idx_updated (updatedAt DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ gemini_sessions table ready');
    
    return true;
  } catch (error) {
    console.error('❌ Tablolar oluşturulurken hata:', error);
    return false;
  }
}

// İlk istekte tabloları oluştur
let tablesInitialized = false;
router.use(async (req, res, next) => {
  if (!tablesInitialized) {
    await ensureTablesExist();
    tablesInitialized = true;
  }
  next();
});

// ==================== GEMINI CONFIG ROUTES ====================

// GET /api/admin/gemini/config - Gemini config'i getir
router.get('/config', async (req, res) => {
    try {
        if (!poolWrapper) {
            return res.status(500).json({
                success: false,
                message: 'Database connection not available'
            });
        }
        
        // Tek bir config kaydı olmalı (id=1 veya ilk kayıt)
        const [configs] = await poolWrapper.execute(`
            SELECT id, enabled, apiKey, model, temperature, maxTokens, createdAt, updatedAt
            FROM gemini_config
            ORDER BY id ASC
            LIMIT 1
        `);

        let config = configs[0];

        // Eğer config yoksa varsayılan oluştur
        if (!config) {
            try {
                const [result] = await poolWrapper.execute(`
                    INSERT INTO gemini_config (enabled, apiKey, model, temperature, maxTokens, createdAt, updatedAt)
                    VALUES (1, '', 'gemini-2.5-flash', 0.70, 8192, NOW(), NOW())
                `);
                
                const [newConfigs] = await poolWrapper.execute(`
                    SELECT id, enabled, apiKey, model, temperature, maxTokens, createdAt, updatedAt
                    FROM gemini_config
                    WHERE id = ?
                `, [result.insertId]);
                
                config = newConfigs[0];
            } catch (createError) {
                console.error('❌ Config oluşturulamadı:', createError);
                // Eğer oluşturulamazsa varsayılan değerleri döndür
                return res.json({
                    success: true,
                    config: {
                        enabled: true,
                        apiKey: '',
                        apiKeyMasked: true,
                        model: 'gemini-2.5-flash',
                        temperature: 0.70,
                        maxTokens: 8192
                    }
                });
            }
        }

        // API key'i güvenlik için maskelenmiş olarak döndür
        const apiKey = config.apiKey || '';
        const configResponse = {
            enabled: config.enabled ? true : false,
            apiKey: apiKey && apiKey.length > 12 
                ? (apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4)) 
                : '',
            apiKeyMasked: apiKey && apiKey.length > 12,
            model: config.model || 'gemini-2.5-flash',
            temperature: parseFloat(config.temperature) || 0.70,
            maxTokens: parseInt(config.maxTokens) || 8192
        };

        res.json({
            success: true,
            config: configResponse
        });
    } catch (error) {
        console.error('❌ Gemini config alınamadı:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Config alınamadı',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// POST /api/admin/gemini/config - Gemini config'i kaydet
router.post('/config', async (req, res) => {
    try {
        if (!poolWrapper) {
            return res.status(500).json({
                success: false,
                message: 'Database connection not available'
            });
        }

        const { enabled, apiKey, model, temperature, maxTokens } = req.body;

        console.log('💾 Config kaydediliyor:', {
            hasApiKey: !!apiKey,
            apiKeyLength: apiKey ? apiKey.length : 0,
            enabled,
            model,
            temperature,
            maxTokens
        });

        // Mevcut config'i bul
        const [configs] = await poolWrapper.execute(`
            SELECT id, enabled, apiKey, model, temperature, maxTokens
            FROM gemini_config
            ORDER BY id ASC
            LIMIT 1
        `);

        console.log('💾 Mevcut config kayıt sayısı:', configs.length);

        let config = configs[0];

        if (config) {
            // Mevcut config'i güncelle
            const updateFields = [];
            const updateValues = [];
            
            if (enabled !== undefined) {
                updateFields.push('enabled = ?');
                updateValues.push(enabled ? 1 : 0);
            }
            if (apiKey !== undefined) {
                updateFields.push('apiKey = ?');
                updateValues.push(apiKey);
            }
            if (model !== undefined) {
                updateFields.push('model = ?');
                updateValues.push(model);
            }
            if (temperature !== undefined) {
                updateFields.push('temperature = ?');
                updateValues.push(temperature);
            }
            if (maxTokens !== undefined) {
                updateFields.push('maxTokens = ?');
                updateValues.push(maxTokens);
            }
            
            updateFields.push('updatedAt = NOW()');
            updateValues.push(config.id);
            
            if (updateFields.length > 1) {
                console.log('💾 Config güncelleniyor:', {
                    updateFields: updateFields.filter(f => !f.includes('updatedAt')),
                    configId: config.id
                });
                await poolWrapper.execute(`
                    UPDATE gemini_config
                    SET ${updateFields.join(', ')}
                    WHERE id = ?
                `, updateValues);
                console.log('✅ Config güncellendi');
            }
            
            // Güncellenmiş config'i al
            const [updatedConfigs] = await poolWrapper.execute(`
                SELECT id, enabled, apiKey, model, temperature, maxTokens
                FROM gemini_config
                WHERE id = ?
            `, [config.id]);
            
            config = updatedConfigs[0];
            console.log('💾 Güncellenmiş config:', {
                id: config.id,
                hasApiKey: !!config.apiKey,
                apiKeyLength: config.apiKey ? config.apiKey.length : 0
            });
        } else {
            // Yeni config oluştur
            console.log('💾 Yeni config oluşturuluyor');
            const [result] = await poolWrapper.execute(`
                INSERT INTO gemini_config (enabled, apiKey, model, temperature, maxTokens, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                enabled !== undefined ? (enabled ? 1 : 0) : 1,
                apiKey || '',
                model || 'gemini-2.5-flash',
                temperature !== undefined ? temperature : 0.70,
                maxTokens !== undefined ? maxTokens : 8192
            ]);
            
            console.log('✅ Yeni config oluşturuldu, ID:', result.insertId);
            
            const [newConfigs] = await poolWrapper.execute(`
                SELECT id, enabled, apiKey, model, temperature, maxTokens
                FROM gemini_config
                WHERE id = ?
            `, [result.insertId]);
            
            config = newConfigs[0];
            console.log('💾 Oluşturulan config:', {
                id: config.id,
                hasApiKey: !!config.apiKey,
                apiKeyLength: config.apiKey ? config.apiKey.length : 0
            });
        }

        // API key'i maskelenmiş olarak döndür
        const apiKeyValue = config.apiKey || '';
        const configResponse = {
            enabled: config.enabled ? true : false,
            apiKey: apiKeyValue && apiKeyValue.length > 12 
                ? (apiKeyValue.substring(0, 8) + '...' + apiKeyValue.substring(apiKeyValue.length - 4)) 
                : '',
            apiKeyMasked: apiKeyValue && apiKeyValue.length > 12,
            model: config.model || 'gemini-2.5-flash',
            temperature: parseFloat(config.temperature) || 0.70,
            maxTokens: parseInt(config.maxTokens) || 8192
        };

        res.json({
            success: true,
            message: 'Config başarıyla kaydedildi',
            config: configResponse
        });
    } catch (error) {
        console.error('❌ Gemini config kaydedilemedi:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Config kaydedilemedi',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// GET /api/admin/gemini/config/raw - Ham API key'i getir (sadece backend kullanımı için)
router.get('/config/raw', async (req, res) => {
    try {
        console.log('🔑 /config/raw endpoint\'ine istek geldi');
        
        if (!poolWrapper) {
            console.error('❌ poolWrapper mevcut değil');
            return res.status(500).json({
                success: false,
                message: 'Database connection not available'
            });
        }
        
        const [configs] = await poolWrapper.execute(`
            SELECT id, apiKey, enabled, model
            FROM gemini_config
            ORDER BY id ASC
            LIMIT 1
        `);

        console.log('🔑 Config sorgusu sonucu:', configs.length, 'kayıt bulundu');
        if (configs.length > 0) {
            console.log('🔑 Config kaydı:', {
                id: configs[0].id,
                hasApiKey: !!configs[0].apiKey,
                apiKeyLength: configs[0].apiKey ? configs[0].apiKey.length : 0,
                enabled: configs[0].enabled,
                model: configs[0].model
            });
        }

        const config = configs[0];

        if (!config) {
            console.error('❌ Config kaydı bulunamadı');
            return res.status(404).json({
                success: false,
                message: 'Config kaydı bulunamadı. Lütfen önce admin panelden API key kaydedin.'
            });
        }

        if (!config.apiKey || config.apiKey.trim() === '') {
            console.error('❌ API key boş veya NULL');
            return res.status(404).json({
                success: false,
                message: 'API key bulunamadı veya boş. Lütfen admin panelden API key kaydedin.'
            });
        }

        console.log('✅ API key başarıyla alındı, uzunluk:', config.apiKey.length);

        // Sadece API key'i döndür (güvenlik için sadece backend'den erişilebilir olmalı)
        res.json({
            success: true,
            apiKey: config.apiKey
        });
    } catch (error) {
        console.error('❌ Gemini API key alınamadı:', error);
        res.status(500).json({
            success: false,
            message: 'API key alınamadı',
            error: error.message
        });
    }
});

// ==================== GEMINI SESSIONS ROUTES ====================

// GET /api/admin/gemini/sessions - Tüm session'ları getir
router.get('/sessions', async (req, res) => {
    try {
        if (!poolWrapper) {
            return res.status(500).json({
                success: false,
                message: 'Database connection not available'
            });
        }
        
        const { limit = 50, offset = 0 } = req.query;
        
        const [sessions] = await poolWrapper.execute(`
            SELECT id, sessionId, title, messageCount, createdAt, updatedAt
            FROM gemini_sessions
            ORDER BY updatedAt DESC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), parseInt(offset)]);

        const formattedSessions = sessions.map(session => ({
            id: session.id,
            sessionId: session.sessionId,
            title: session.title,
            messageCount: session.messageCount || 0,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
        }));

        res.json({
            success: true,
            sessions: formattedSessions,
            total: formattedSessions.length
        });
    } catch (error) {
        console.error('❌ Gemini sessions yüklenemedi:', error);
        res.status(500).json({
            success: false,
            message: 'Sessions yüklenemedi',
            error: error.message
        });
    }
});

// GET /api/admin/gemini/sessions/:sessionId - Belirli bir session'ı getir
router.get('/sessions/:sessionId', async (req, res) => {
    try {
        if (!poolWrapper) {
            return res.status(500).json({
                success: false,
                message: 'Database connection not available'
            });
        }
        
        const { sessionId } = req.params;

        const [sessions] = await poolWrapper.execute(`
            SELECT id, sessionId, title, messages, messageCount, createdAt, updatedAt
            FROM gemini_sessions
            WHERE sessionId = ?
        `, [sessionId]);

        const session = sessions[0];

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session bulunamadı'
            });
        }

        // JSON alanını parse et
        let messages = [];
        try {
            messages = typeof session.messages === 'string' 
                ? JSON.parse(session.messages) 
                : (session.messages || []);
        } catch (e) {
            messages = [];
        }

        res.json({
            success: true,
            session: {
                id: session.id,
                sessionId: session.sessionId,
                title: session.title,
                messages: messages,
                messageCount: session.messageCount || 0,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt
            }
        });
    } catch (error) {
        console.error('❌ Gemini session yüklenemedi:', error);
        res.status(500).json({
            success: false,
            message: 'Session yüklenemedi',
            error: error.message
        });
    }
});

// POST /api/admin/gemini/sessions - Yeni session oluştur veya güncelle
router.post('/sessions', async (req, res) => {
    try {
        if (!poolWrapper) {
            return res.status(500).json({
                success: false,
                message: 'Database connection not available'
            });
        }
        
        const { sessionId, title, messages = [] } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'sessionId gereklidir'
            });
        }

        // Session var mı kontrol et
        const [existingSessions] = await poolWrapper.execute(`
            SELECT id, sessionId, title, messageCount
            FROM gemini_sessions
            WHERE sessionId = ?
        `, [sessionId]);

        const existingSession = existingSessions[0];
        const sessionTitle = title || `Sohbet ${new Date().toLocaleDateString('tr-TR')}`;
        const messagesJson = JSON.stringify(messages);

        let session;

        if (existingSession) {
            // Mevcut session'ı güncelle
            await poolWrapper.execute(`
                UPDATE gemini_sessions
                SET title = ?, messages = ?, messageCount = ?, updatedAt = NOW()
                WHERE sessionId = ?
            `, [sessionTitle, messagesJson, messages.length, sessionId]);
            
            session = {
                id: existingSession.id,
                sessionId: existingSession.sessionId,
                title: sessionTitle,
                messageCount: messages.length
            };
        } else {
            // Yeni session oluştur
            const [result] = await poolWrapper.execute(`
                INSERT INTO gemini_sessions (sessionId, title, messages, messageCount, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, NOW(), NOW())
            `, [sessionId, sessionTitle, messagesJson, messages.length]);
            
            const [newSessions] = await poolWrapper.execute(`
                SELECT id, sessionId, title, messageCount
                FROM gemini_sessions
                WHERE id = ?
            `, [result.insertId]);
            
            session = newSessions[0];
        }

        res.json({
            success: true,
            session: {
                id: session.id,
                sessionId: session.sessionId,
                title: session.title,
                messageCount: session.messageCount
            },
            message: existingSession ? 'Session güncellendi' : 'Session oluşturuldu'
        });
    } catch (error) {
        console.error('❌ Gemini session kaydedilemedi:', error);
        res.status(500).json({
            success: false,
            message: 'Session kaydedilemedi',
            error: error.message
        });
    }
});

// PUT /api/admin/gemini/sessions/:sessionId/messages - Session mesajlarını güncelle
router.put('/sessions/:sessionId/messages', async (req, res) => {
    try {
        if (!poolWrapper) {
            return res.status(500).json({
                success: false,
                message: 'Database connection not available'
            });
        }
        
        const { sessionId } = req.params;
        const { messages = [] } = req.body;

        const [sessions] = await poolWrapper.execute(`
            SELECT id
            FROM gemini_sessions
            WHERE sessionId = ?
        `, [sessionId]);

        const session = sessions[0];

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session bulunamadı'
            });
        }

        const messagesJson = JSON.stringify(messages);
        
        await poolWrapper.execute(`
            UPDATE gemini_sessions
            SET messages = ?, messageCount = ?, updatedAt = NOW()
            WHERE sessionId = ?
        `, [messagesJson, messages.length, sessionId]);

        res.json({
            success: true,
            message: 'Mesajlar başarıyla güncellendi',
            messageCount: messages.length
        });
    } catch (error) {
        console.error('❌ Gemini session mesajları güncellenemedi:', error);
        res.status(500).json({
            success: false,
            message: 'Mesajlar güncellenemedi',
            error: error.message
        });
    }
});

// DELETE /api/admin/gemini/sessions/:sessionId - Session sil
router.delete('/sessions/:sessionId', async (req, res) => {
    try {
        if (!poolWrapper) {
            return res.status(500).json({
                success: false,
                message: 'Database connection not available'
            });
        }
        
        const { sessionId } = req.params;

        const [sessions] = await poolWrapper.execute(`
            SELECT id
            FROM gemini_sessions
            WHERE sessionId = ?
        `, [sessionId]);

        const session = sessions[0];

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session bulunamadı'
            });
        }

        await poolWrapper.execute(`
            DELETE FROM gemini_sessions
            WHERE sessionId = ?
        `, [sessionId]);

        res.json({
            success: true,
            message: 'Session başarıyla silindi'
        });
    } catch (error) {
        console.error('❌ Gemini session silinemedi:', error);
        res.status(500).json({
            success: false,
            message: 'Session silinemedi',
            error: error.message
        });
    }
});

module.exports = router;

