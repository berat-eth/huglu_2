const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const crypto = require('crypto');

// ==================== GEMINI CONFIG ROUTES ====================

// GET /api/admin/gemini/config - Gemini config'i getir
router.get('/config', async (req, res) => {
    try {
        const { GeminiConfig } = require('../orm/models');
        
        // Tek bir config kaydı olmalı (id=1 veya ilk kayıt)
        let config = await GeminiConfig.findOne({
            order: [['id', 'ASC']]
        });

        // Eğer config yoksa varsayılan oluştur
        if (!config) {
            config = await GeminiConfig.create({
                enabled: true,
                apiKey: '',
                model: 'gemini-2.5-flash',
                temperature: 0.70,
                maxTokens: 8192
            });
        }

        // API key'i güvenlik için maskelenmiş olarak döndür
        const configResponse = {
            enabled: config.enabled,
            apiKey: config.apiKey ? (config.apiKey.substring(0, 8) + '...' + config.apiKey.substring(config.apiKey.length - 4)) : '',
            apiKeyMasked: true,
            model: config.model,
            temperature: parseFloat(config.temperature),
            maxTokens: config.maxTokens
        };

        res.json({
            success: true,
            config: configResponse
        });
    } catch (error) {
        console.error('❌ Gemini config alınamadı:', error);
        res.status(500).json({
            success: false,
            message: 'Config alınamadı',
            error: error.message
        });
    }
});

// POST /api/admin/gemini/config - Gemini config'i kaydet
router.post('/config', async (req, res) => {
    try {
        const { GeminiConfig } = require('../orm/models');
        const { enabled, apiKey, model, temperature, maxTokens } = req.body;

        // Mevcut config'i bul veya oluştur
        let config = await GeminiConfig.findOne({
            order: [['id', 'ASC']]
        });

        const configData = {};
        if (enabled !== undefined) configData.enabled = enabled;
        if (apiKey !== undefined) configData.apiKey = apiKey;
        if (model !== undefined) configData.model = model;
        if (temperature !== undefined) configData.temperature = temperature;
        if (maxTokens !== undefined) configData.maxTokens = maxTokens;

        if (config) {
            await config.update(configData);
        } else {
            config = await GeminiConfig.create({
                enabled: enabled !== undefined ? enabled : true,
                apiKey: apiKey || '',
                model: model || 'gemini-2.5-flash',
                temperature: temperature !== undefined ? temperature : 0.70,
                maxTokens: maxTokens !== undefined ? maxTokens : 8192
            });
        }

        // API key'i maskelenmiş olarak döndür
        const configResponse = {
            enabled: config.enabled,
            apiKey: config.apiKey ? (config.apiKey.substring(0, 8) + '...' + config.apiKey.substring(config.apiKey.length - 4)) : '',
            apiKeyMasked: true,
            model: config.model,
            temperature: parseFloat(config.temperature),
            maxTokens: config.maxTokens
        };

        res.json({
            success: true,
            message: 'Config başarıyla kaydedildi',
            config: configResponse
        });
    } catch (error) {
        console.error('❌ Gemini config kaydedilemedi:', error);
        res.status(500).json({
            success: false,
            message: 'Config kaydedilemedi',
            error: error.message
        });
    }
});

// GET /api/admin/gemini/config/raw - Ham API key'i getir (sadece backend kullanımı için)
router.get('/config/raw', async (req, res) => {
    try {
        const { GeminiConfig } = require('../orm/models');
        
        const config = await GeminiConfig.findOne({
            order: [['id', 'ASC']]
        });

        if (!config || !config.apiKey) {
            return res.status(404).json({
                success: false,
                message: 'API key bulunamadı'
            });
        }

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
        const { GeminiSession } = require('../orm/models');
        const { limit = 50, offset = 0 } = req.query;
        
        const sessions = await GeminiSession.findAll({
            order: [['updatedAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

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
        const { GeminiSession } = require('../orm/models');
        const { sessionId } = req.params;

        const session = await GeminiSession.findOne({
            where: { sessionId }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session bulunamadı'
            });
        }

        res.json({
            success: true,
            session: {
                id: session.id,
                sessionId: session.sessionId,
                title: session.title,
                messages: session.messages || [],
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
        const { GeminiSession } = require('../orm/models');
        const { sessionId, title, messages = [] } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'sessionId gereklidir'
            });
        }

        // Session var mı kontrol et
        let session = await GeminiSession.findOne({
            where: { sessionId }
        });

        const sessionData = {
            sessionId,
            title: title || `Sohbet ${new Date().toLocaleDateString('tr-TR')}`,
            messages: messages,
            messageCount: messages.length
        };

        if (session) {
            // Mevcut session'ı güncelle
            await session.update(sessionData);
        } else {
            // Yeni session oluştur
            session = await GeminiSession.create(sessionData);
        }

        res.json({
            success: true,
            session: {
                id: session.id,
                sessionId: session.sessionId,
                title: session.title,
                messageCount: session.messageCount
            },
            message: session ? 'Session güncellendi' : 'Session oluşturuldu'
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
        const { GeminiSession } = require('../orm/models');
        const { sessionId } = req.params;
        const { messages = [] } = req.body;

        const session = await GeminiSession.findOne({
            where: { sessionId }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session bulunamadı'
            });
        }

        await session.update({
            messages: messages,
            messageCount: messages.length,
            updatedAt: new Date()
        });

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
        const { GeminiSession } = require('../orm/models');
        const { sessionId } = req.params;

        const session = await GeminiSession.findOne({
            where: { sessionId }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session bulunamadı'
            });
        }

        await session.destroy();

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

