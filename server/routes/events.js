const express = require('express');
const router = express.Router();
const EventTracker = require('../services/event-tracker');

const eventTracker = new EventTracker();

/**
 * Tek event kaydetme
 * POST /api/events/track
 */
router.post('/track', async (req, res) => {
  try {
    const {
      tenantId,
      userId,
      deviceId,
      sessionId,
      eventType,
      screenName,
      properties,
      timestamp
    } = req.body;

    const result = await eventTracker.trackEvent({
      tenantId,
      userId,
      deviceId,
      sessionId,
      eventType,
      screenName,
      properties,
      timestamp
    });

    // Session event sayısını artır
    if (sessionId) {
      await eventTracker.incrementSessionEventCount(sessionId).catch(() => {
        // Sessizce devam et
      });
    }

    res.json({
      success: true,
      message: 'Event kaydedildi',
      eventId: result.eventId
    });
  } catch (error) {
    console.error('❌ Error tracking event:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Event kaydedilemedi'
    });
  }
});

/**
 * Toplu event kaydetme
 * POST /api/events/batch
 */
router.post('/batch', async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Events array gerekli ve boş olamaz'
      });
    }

    // Maksimum batch size kontrolü
    if (events.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maksimum 100 event gönderilebilir'
      });
    }

    const result = await eventTracker.trackBatch(events);

    // Session event sayılarını artır
    const sessionIds = [...new Set(events.map(e => e.sessionId).filter(Boolean))];
    for (const sessionId of sessionIds) {
      await eventTracker.incrementSessionEventCount(sessionId).catch(() => {
        // Sessizce devam et
      });
    }

    res.json({
      success: true,
      message: `${result.processed} event kaydedildi`,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors
    });
  } catch (error) {
    console.error('❌ Error tracking batch events:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Event\'ler kaydedilemedi'
    });
  }
});

/**
 * Session başlatma
 * POST /api/events/session/start
 */
router.post('/session/start', async (req, res) => {
  try {
    const {
      tenantId,
      userId,
      deviceId,
      sessionId,
      metadata
    } = req.body;

    const result = await eventTracker.startSession({
      tenantId,
      userId,
      deviceId,
      sessionId,
      metadata
    });

    res.json({
      success: true,
      message: 'Session başlatıldı',
      sessionId: result.sessionId
    });
  } catch (error) {
    console.error('❌ Error starting session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Session başlatılamadı'
    });
  }
});

/**
 * Session bitirme
 * POST /api/events/session/end
 */
router.post('/session/end', async (req, res) => {
  try {
    const {
      sessionId,
      duration,
      eventCount,
      metadata
    } = req.body;

    const result = await eventTracker.endSession({
      sessionId,
      duration,
      eventCount,
      metadata
    });

    res.json({
      success: true,
      message: 'Session sonlandırıldı'
    });
  } catch (error) {
    console.error('❌ Error ending session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Session sonlandırılamadı'
    });
  }
});

module.exports = router;



