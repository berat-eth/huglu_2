import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

/**
 * Analytics SDK - Mobil uygulama için analitik tracking
 */
class Analytics {
  constructor() {
    this.deviceId = null;
    this.sessionId = null;
    this.sessionStartTime = null;
    this.isInitialized = false;
    this.offlineQueue = [];
    this.maxQueueSize = 100;
  }

  /**
   * Analytics'i başlat
   */
  async initialize() {
    try {
      // Device ID'yi al veya oluştur
      let storedDeviceId = await AsyncStorage.getItem('analytics_device_id');
      if (!storedDeviceId) {
        storedDeviceId = this.generateDeviceId();
        await AsyncStorage.setItem('analytics_device_id', storedDeviceId);
      }
      this.deviceId = storedDeviceId;

      // Offline queue'yu yükle
      const queue = await AsyncStorage.getItem('analytics_queue');
      if (queue) {
        this.offlineQueue = JSON.parse(queue);
        // Queue'daki eventleri gönder
        await this.flushQueue();
      }

      this.isInitialized = true;
      console.log('✅ Analytics initialized');
    } catch (error) {
      console.error('❌ Analytics initialization error:', error);
    }
  }

  /**
   * Device ID oluştur
   */
  generateDeviceId() {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Session başlat
   */
  async startSession() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessionStartTime = new Date();

      // Session başlangıcını backend'e gönder
      await this.sendEvent({
        endpoint: '/analytics/session/start',
        data: {
          deviceInfo: await this.getDeviceInfo(),
          referrer: null,
          country: null,
          city: null
        }
      });

      console.log('✅ Session started:', this.sessionId);
    } catch (error) {
      console.error('❌ Error starting session:', error);
    }
  }

  /**
   * Session bitir
   */
  async endSession(conversion = null) {
    try {
      if (!this.sessionId) return;

      await this.sendEvent({
        endpoint: '/analytics/session/end',
        data: { conversion }
      });

      this.sessionId = null;
      this.sessionStartTime = null;
      console.log('✅ Session ended');
    } catch (error) {
      console.error('❌ Error ending session:', error);
    }
  }

  /**
   * Session heartbeat gönder
   */
  async heartbeat() {
    try {
      if (!this.sessionId) return;

      await this.sendEvent({
        endpoint: '/analytics/session/heartbeat',
        data: {}
      });
    } catch (error) {
      console.error('❌ Error sending heartbeat:', error);
    }
  }

  /**
   * Event gönder
   */
  async sendEvent({ endpoint, data }) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.sessionId) {
        await this.startSession();
      }

      const payload = {
        ...data,
        deviceId: this.deviceId,
        sessionId: this.sessionId
      };

      try {
        await api.post(endpoint, payload);
      } catch (error) {
        // Offline durumda queue'ya ekle
        if (error.message.includes('Network') || error.message.includes('timeout')) {
          await this.addToQueue(endpoint, payload);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ Error sending event:', error);
    }
  }

  /**
   * Batch event gönder
   */
  async sendBatchEvents(events) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.sessionId) {
        await this.startSession();
      }

      const payload = {
        events: events.map(event => ({
          ...event,
          deviceId: this.deviceId,
          sessionId: this.sessionId,
          timestamp: event.timestamp || new Date().toISOString()
        }))
      };

      try {
        await api.post('/analytics/events', payload);
      } catch (error) {
        if (error.message.includes('Network') || error.message.includes('timeout')) {
          // Her event'i ayrı ayrı queue'ya ekle
          for (const event of events) {
            await this.addToQueue('/analytics/events', { events: [event] });
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ Error sending batch events:', error);
    }
  }

  /**
   * Queue'ya ekle
   */
  async addToQueue(endpoint, data) {
    try {
      if (this.offlineQueue.length >= this.maxQueueSize) {
        // En eski event'i sil
        this.offlineQueue.shift();
      }

      this.offlineQueue.push({
        endpoint,
        data,
        timestamp: new Date().toISOString()
      });

      await AsyncStorage.setItem('analytics_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('❌ Error adding to queue:', error);
    }
  }

  /**
   * Queue'daki eventleri gönder
   */
  async flushQueue() {
    try {
      if (this.offlineQueue.length === 0) return;

      const eventsToSend = [...this.offlineQueue];
      this.offlineQueue = [];

      for (const queuedEvent of eventsToSend) {
        try {
          await api.post(queuedEvent.endpoint, queuedEvent.data);
        } catch (error) {
          // Başarısız olanları tekrar queue'ya ekle
          this.offlineQueue.push(queuedEvent);
        }
      }

      await AsyncStorage.setItem('analytics_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('❌ Error flushing queue:', error);
    }
  }

  /**
   * Device bilgilerini al
   */
  async getDeviceInfo() {
    // React Native'de device bilgileri için react-native-device-info kullanılabilir
    // Şimdilik basit bir yapı
    return {
      platform: 'mobile',
      os: 'unknown'
    };
  }

  // ==================== EVENT TRACKING METHODS ====================

  /**
   * Ekran görüntüleme
   */
  async trackScreenView(screenName, properties = {}) {
    await this.sendEvent({
      endpoint: '/analytics/screen/view',
      data: {
        screenName,
        properties
      }
    });
  }

  /**
   * Ürün görüntüleme
   */
  async trackProductView(productId, categoryId = null, screenName = null) {
    await this.sendEvent({
      endpoint: '/analytics/product/view',
      data: {
        productId,
        categoryId,
        screenName
      }
    });
  }

  /**
   * Sepete ekleme
   */
  async trackAddToCart(productId, quantity, price) {
    await this.sendEvent({
      endpoint: '/analytics/cart/add',
      data: {
        productId,
        quantity,
        price,
        amount: price * quantity
      }
    });
  }

  /**
   * Sepetten çıkarma
   */
  async trackRemoveFromCart(productId) {
    await this.sendEvent({
      endpoint: '/analytics/cart/remove',
      data: {
        productId
      }
    });
  }

  /**
   * Checkout başlangıcı
   */
  async trackCheckoutStart(amount, items = []) {
    await this.sendEvent({
      endpoint: '/analytics/checkout/start',
      data: {
        amount,
        items
      }
    });
  }

  /**
   * Satın alma
   */
  async trackPurchase(orderId, amount, items = []) {
    await this.sendEvent({
      endpoint: '/analytics/purchase',
      data: {
        orderId,
        amount,
        items
      }
    });
  }

  /**
   * Arama
   */
  async trackSearch(searchQuery, resultsCount = null) {
    await this.sendEvent({
      endpoint: '/analytics/search',
      data: {
        searchQuery,
        resultsCount
      }
    });
  }

  /**
   * Tıklama
   */
  async trackClick(element, screenName = null, properties = {}) {
    await this.sendEvent({
      endpoint: '/analytics/click',
      data: {
        element,
        screenName,
        properties
      }
    });
  }

  /**
   * Scroll
   */
  async trackScroll(scrollDepth, screenName = null) {
    await this.sendEvent({
      endpoint: '/analytics/scroll',
      data: {
        scrollDepth,
        screenName
      }
    });
  }

  /**
   * Performans metrikleri
   */
  async trackPerformance(loadTime, responseTime, screenName = null) {
    await this.sendEvent({
      endpoint: '/analytics/performance',
      data: {
        loadTime,
        responseTime,
        screenName
      }
    });
  }

  /**
   * Hata raporlama
   */
  async trackError(errorMessage, errorStack = null, screenName = null) {
    await this.sendEvent({
      endpoint: '/analytics/error',
      data: {
        errorMessage,
        errorStack,
        screenName
      }
    });
  }
}

// Singleton instance
const analytics = new Analytics();

export default analytics;

