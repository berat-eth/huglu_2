const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// UUID oluşturma fonksiyonu
function generateId() {
    return crypto.randomBytes(16).toString('hex');
}

// poolWrapper'ı almak için
let poolWrapper = null;

// poolWrapper'ı set etmek için middleware
router.use((req, res, next) => {
  if (!poolWrapper) {
    poolWrapper = req.app.locals.poolWrapper || require('../database-schema').poolWrapper;
  }
  next();
});

// Chat Sessions Route
// GET /api/chat/sessions - Tüm sessionları getir
router.get('/', async (req, res) => {
    try {
        if (!poolWrapper) {
            return res.status(500).json({
                success: false,
                message: 'Database connection not available'
            });
        }

        // Session'ları ve son mesajlarını getir
        const [sessions] = await poolWrapper.execute(`
            SELECT 
                s.id,
                s.name,
                s.messageCount,
                s.createdAt,
                s.updatedAt,
                (
                    SELECT content 
                    FROM chat_messages 
                    WHERE sessionId = s.id 
                    ORDER BY timestamp DESC 
                    LIMIT 1
                ) as lastMessage
            FROM chat_sessions s
            ORDER BY s.updatedAt DESC
        `);

        const formattedSessions = sessions.map(session => ({
            id: session.id,
            name: session.name,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            messageCount: session.messageCount || 0,
            lastMessage: session.lastMessage 
                ? (session.lastMessage.length > 100 ? session.lastMessage.substring(0, 100) + '...' : session.lastMessage)
                : null
        }));

        res.json({
            success: true,
            sessions: formattedSessions
        });
    } catch (error) {
        console.error('❌ Sessions yüklenemedi:', error);
        res.status(500).json({
            success: false,
            message: 'Sessions yüklenemedi',
            error: error.message
        });
    }
});

// POST /api/chat/sessions - Yeni session oluştur
router.post('/', async (req, res) => {
    try {
        if (!poolWrapper) {
            return res.status(500).json({
                success: false,
                message: 'Database connection not available'
            });
        }

        const { name, messages = [] } = req.body;
        const sessionId = generateId();

        // Yeni session oluştur
        await poolWrapper.execute(`
            INSERT INTO chat_sessions (id, name, messageCount, createdAt, updatedAt)
            VALUES (?, ?, ?, NOW(), NOW())
        `, [sessionId, name || `Sohbet ${new Date().toLocaleDateString('tr-TR')}`, messages.length]);

        // Eğer mesajlar varsa kaydet
        if (messages.length > 0) {
            const messagePromises = messages.map(msg => {
                const messageId = generateId();
                return poolWrapper.execute(`
                    INSERT INTO chat_messages (id, sessionId, role, content, timestamp, createdAt)
                    VALUES (?, ?, ?, ?, ?, NOW())
                `, [
                    messageId,
                    sessionId,
                    msg.role || 'user',
                    msg.content || '',
                    msg.timestamp ? new Date(msg.timestamp) : new Date()
                ]);
            });
            await Promise.all(messagePromises);
        }

        res.json({
            success: true,
            sessionId: sessionId,
            message: 'Session başarıyla oluşturuldu'
        });
    } catch (error) {
        console.error('❌ Session oluşturulamadı:', error);
        res.status(500).json({
            success: false,
            message: 'Session oluşturulamadı',
            error: error.message
        });
    }
});

// GET /api/chat/sessions/:id/messages - Session mesajlarını getir
router.get('/:id/messages', async (req, res) => {
    try {
        if (!poolWrapper) {
            return res.status(500).json({
                success: false,
                message: 'Database connection not available'
            });
        }

        const { id } = req.params;

        const [messages] = await poolWrapper.execute(`
            SELECT id, role, content, timestamp, createdAt
            FROM chat_messages
            WHERE sessionId = ?
            ORDER BY createdAt ASC
        `, [id]);

        const formattedMessages = messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
        }));

        res.json({
            success: true,
            messages: formattedMessages
        });
    } catch (error) {
        console.error('❌ Session mesajları yüklenemedi:', error);
        res.status(500).json({
            success: false,
            message: 'Session mesajları yüklenemedi',
            error: error.message
        });
    }
});

// POST /api/chat/sessions/:id/messages - Session mesajlarını kaydet
router.post('/:id/messages', async (req, res) => {
    try {
        if (!poolWrapper) {
            return res.status(500).json({
                success: false,
                message: 'Database connection not available'
            });
        }

        const { id } = req.params;
        const { messages } = req.body;

        // Session'ın var olduğunu kontrol et
        const [sessions] = await poolWrapper.execute(`
            SELECT id FROM chat_sessions WHERE id = ?
        `, [id]);

        if (sessions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Session bulunamadı'
            });
        }

        // Mevcut mesajları sil
        await poolWrapper.execute(`
            DELETE FROM chat_messages WHERE sessionId = ?
        `, [id]);

        // Yeni mesajları kaydet
        if (messages && messages.length > 0) {
            const messagePromises = messages.map(msg => {
                const messageId = generateId();
                return poolWrapper.execute(`
                    INSERT INTO chat_messages (id, sessionId, role, content, timestamp, createdAt)
                    VALUES (?, ?, ?, ?, ?, NOW())
                `, [
                    messageId,
                    id,
                    msg.role || 'user',
                    msg.content || '',
                    msg.timestamp || new Date()
                ]);
            });
            await Promise.all(messagePromises);
        }

        // Session'ı güncelle
        await poolWrapper.execute(`
            UPDATE chat_sessions
            SET messageCount = ?, updatedAt = NOW()
            WHERE id = ?
        `, [messages ? messages.length : 0, id]);

        res.json({
            success: true,
            message: 'Mesajlar başarıyla kaydedildi'
        });
    } catch (error) {
        console.error('❌ Mesajlar kaydedilemedi:', error);
        res.status(500).json({
            success: false,
            message: 'Mesajlar kaydedilemedi',
            error: error.message
        });
    }
});

// DELETE /api/chat/sessions/:id - Session sil
router.delete('/:id', async (req, res) => {
    try {
        if (!poolWrapper) {
            return res.status(500).json({
                success: false,
                message: 'Database connection not available'
            });
        }

        const { id } = req.params;

        // Foreign key cascade olduğu için mesajlar otomatik silinecek
        // Önce session'ı sil
        const [result] = await poolWrapper.execute(`
            DELETE FROM chat_sessions WHERE id = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Session bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Session başarıyla silindi'
        });
    } catch (error) {
        console.error('❌ Session silinemedi:', error);
        res.status(500).json({
            success: false,
            message: 'Session silinemedi',
            error: error.message
        });
    }
});

module.exports = router;
