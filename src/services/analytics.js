/**
 * Detaylı Analitik Servisi
 * 
 * Kapsamlı event tracking, session management ve performance monitoring
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { eventsAPI } from './api';
import { Platform } from 'react-native';

// expo-device fallback
let Device;
try {
  Device = require('expo-device');
} catch (e) {
  Device = {
    modelName: Platform.OS === 'ios' ? 'iPhone' : 'Android Device',
    brand: Platform.OS === 'ios' ? 'Apple' : 'Android',
    osVersion: Platform.Version?.toString() || 'Unknown'
  };
}

class AnalyticsService {
  constructor() {
    this.sessionId = null;
    this.deviceId = null;
    this.userId = null;
    this.tenantId = null;
    this.sessionStartTime = null;
    this.eventQueue = [];
    this.batchSize = 20;
    this.batchInterval = 30000; // 30 saniye
    this.batchTimer = null;
    this.isInitialized = false;
    this.screenHistory = [];
    this.performanceMetrics = {};
  }

  /**
   * Servisi başlat
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('ℹ️ Analytics: Servis zaten başlatılmış');
      return;
    }

    try {
      console.log('🚀 Analytics: Servis başlatılıyor...');
      
      // Device ID'yi al veya oluştur
      this.deviceId = await this.getOrCreateDeviceId();
      console.log('📱 Analytics: Device ID:', this.deviceId?.substring(0, 30) + '...');
      
      // User ID'yi al
      const storedUserId = await AsyncStorage.getItem('userId');
      this.userId = storedUserId ? parseInt(storedUserId) : null;
      console.log('👤 Analytics: User ID:', this.userId || 'Misafir');

      // Tenant ID'yi al
      const storedTenantId = await AsyncStorage.getItem('tenantId');
      this.tenantId = storedTenantId ? parseInt(storedTenantId) : 1;
      console.log('🏢 Analytics: Tenant ID:', this.tenantId);

      // Session başlat
      await this.startSession();

      // Batch timer'ı başlat
      this.startBatchTimer();
      console.log('⏰ Analytics: Batch timer başlatıldı (30 saniye)');

      this.isInitialized = true;
      console.log('✅ Analytics: Servis başarıyla başlatıldı', {
        deviceId: this.deviceId?.substring(0, 20) + '...',
        sessionId: this.sessionId?.substring(0, 20) + '...',
        userId: this.userId,
        tenantId: this.tenantId
      });
    } catch (error) {
      console.error('❌ Analytics: Başlatma hatası:', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Device ID'yi al veya oluştur
   */
  async getOrCreateDeviceId() {
    try {
      let deviceId = await AsyncStorage.getItem('analytics_device_id');
      
      if (!deviceId) {
        // Yeni device ID oluştur
        deviceId = `device_${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('analytics_device_id', deviceId);
      }

      return deviceId;
    } catch (error) {
      console.error('❌ Error getting device ID:', error);
      return `device_${Platform.OS}_${Date.now()}`;
    }
  }

  /**
   * Session başlat
   */
  async startSession() {
    try {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessionStartTime = Date.now();

      const sessionData = {
        tenantId: this.tenantId,
        userId: this.userId,
        deviceId: this.deviceId,
        sessionId: this.sessionId,
        metadata: {
          platform: Platform.OS,
          deviceModel: Device.modelName || 'Unknown',
          deviceBrand: Device.brand || 'Unknown',
          osVersion: Device.osVersion || 'Unknown',
          appVersion: '1.0.0',
          isExpoGo: __DEV__ || false, // Expo Go kontrolü
        }
      };

      console.log('📡 Analytics: Session başlatılıyor...', {
        sessionId: this.sessionId.substring(0, 20) + '...',
        deviceId: this.deviceId?.substring(0, 20) + '...',
        platform: Platform.OS
      });

      const response = await eventsAPI.startSession(sessionData);
      
      console.log('✅ Analytics: Session başlatıldı', {
        sessionId: this.sessionId.substring(0, 20) + '...',
        response: response?.data || response
      });
    } catch (error) {
      console.error('❌ Analytics: Session başlatma hatası:', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      // Session başlatılamasa bile devam et (offline mode)
      console.warn('⚠️ Analytics: Session başlatılamadı ama devam ediliyor (offline mode)');
    }
  }

  /**
   * Session bitir
   */
  async endSession() {
    if (!this.sessionId) return;

    try {
      // Kalan event'leri gönder
      await this.flushEvents();

      const duration = Date.now() - this.sessionStartTime;
      const eventCount = this.eventQueue.length;

      await eventsAPI.endSession({
        sessionId: this.sessionId,
        duration,
        eventCount,
        metadata: {
          screenHistory: this.screenHistory,
          performanceMetrics: this.performanceMetrics
        }
      });

      // Batch timer'ı durdur
      if (this.batchTimer) {
        clearInterval(this.batchTimer);
        this.batchTimer = null;
      }

      console.log('✅ Session ended:', this.sessionId);
      this.sessionId = null;
      this.sessionStartTime = null;
      this.screenHistory = [];
      this.performanceMetrics = {};
    } catch (error) {
      console.error('❌ Error ending session:', error);
    }
  }

  /**
   * User ID'yi güncelle
   */
  async setUserId(userId) {
    this.userId = userId;
    await AsyncStorage.setItem('userId', userId?.toString() || '');
  }

  /**
   * Tenant ID'yi güncelle
   */
  async setTenantId(tenantId) {
    this.tenantId = tenantId || 1;
    await AsyncStorage.setItem('tenantId', this.tenantId.toString());
  }

  /**
   * Event track et
   */
  async trackEvent(eventType, properties = {}) {
    if (!this.isInitialized) {
      console.log('🔄 Analytics: Servis başlatılıyor...');
      await this.initialize();
    }

    try {
      // Session kontrolü
      if (!this.sessionId) {
        console.warn('⚠️ Analytics: Session ID yok, yeni session başlatılıyor...');
        await this.startSession();
      }

      const event = {
        tenantId: this.tenantId,
        userId: this.userId,
        deviceId: this.deviceId,
        sessionId: this.sessionId,
        eventType,
        screenName: this.getCurrentScreen(),
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString()
      };

      // Queue'ya ekle
      this.eventQueue.push(event);
      
      console.log(`📊 Analytics: Event eklendi (${this.eventQueue.length}/${this.batchSize})`, {
        eventType,
        screenName: event.screenName,
        sessionId: this.sessionId?.substring(0, 20) + '...'
      });

      // Batch size'a ulaştıysa gönder
      if (this.eventQueue.length >= this.batchSize) {
        console.log(`📤 Analytics: Batch size'a ulaşıldı, event'ler gönderiliyor...`);
        await this.flushEvents();
      }
    } catch (error) {
      console.error('❌ Analytics: Event tracking hatası:', {
        error: error.message,
        eventType,
        stack: error.stack
      });
    }
  }

  /**
   * Screen view track et
   */
  async trackScreenView(screenName, properties = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Önceki ekranı exit olarak işaretle
      if (this.screenHistory.length > 0) {
        const previousScreen = this.screenHistory[this.screenHistory.length - 1];
        await this.trackEvent('screen_exit', {
          screenName: previousScreen.name,
          duration: Date.now() - previousScreen.startTime,
        });
      }

      // Yeni ekranı ekle
      this.screenHistory.push({
        name: screenName,
        startTime: Date.now()
      });

      // Screen view event'i track et
      await this.trackEvent('screen_view', {
        screenName,
        ...properties
      });
    } catch (error) {
      console.error('❌ Error tracking screen view:', error);
    }
  }

  /**
   * Product view track et
   */
  async trackProductView(productId, productData = {}) {
    await this.trackEvent('product_view', {
      productId,
      productName: productData.name,
      categoryId: productData.categoryId,
      price: productData.price,
      ...productData
    });
  }

  /**
   * Add to cart track et
   */
  async trackAddToCart(productId, quantity = 1, price = 0) {
    await this.trackEvent('add_to_cart', {
      productId,
      quantity,
      price,
      totalValue: quantity * price
    });
  }

  /**
   * Remove from cart track et
   */
  async trackRemoveFromCart(productId, quantity = 1) {
    await this.trackEvent('remove_from_cart', {
      productId,
      quantity
    });
  }

  /**
   * Purchase track et
   */
  async trackPurchase(orderId, orderData = {}) {
    await this.trackEvent('purchase', {
      orderId,
      totalAmount: orderData.totalAmount,
      itemCount: orderData.itemCount,
      paymentMethod: orderData.paymentMethod,
      ...orderData
    });
  }

  /**
   * Search track et
   */
  async trackSearch(query, resultsCount = 0) {
    await this.trackEvent('search', {
      query,
      resultsCount
    });
  }

  /**
   * Filter track et
   */
  async trackFilter(filterType, filterValue) {
    await this.trackEvent('filter', {
      filterType,
      filterValue
    });
  }

  /**
   * Click track et
   */
  async trackClick(elementName, properties = {}) {
    await this.trackEvent('click', {
      elementName,
      ...properties
    });
  }

  /**
   * Scroll track et
   */
  async trackScroll(screenName, scrollDepth) {
    await this.trackEvent('scroll', {
      screenName,
      scrollDepth
    });
  }

  /**
   * Error track et
   */
  async trackError(error, context = {}) {
    await this.trackEvent('error', {
      errorMessage: error.message || String(error),
      errorStack: error.stack,
      ...context
    });
  }

  /**
   * Performance track et
   */
  async trackPerformance(metricName, value, unit = 'ms') {
    this.performanceMetrics[metricName] = {
      value,
      unit,
      timestamp: Date.now()
    };

    await this.trackEvent('performance', {
      metricName,
      value,
      unit
    });
  }

  /**
   * Batch timer başlat
   */
  startBatchTimer() {
    if (this.batchTimer) {
      console.log('ℹ️ Analytics: Batch timer zaten çalışıyor');
      return;
    }

    console.log(`⏰ Analytics: Batch timer başlatıldı (${this.batchInterval / 1000} saniye)`);
    
    this.batchTimer = setInterval(async () => {
      if (this.eventQueue.length > 0) {
        console.log(`⏰ Analytics: Timer tetiklendi, ${this.eventQueue.length} event gönderiliyor...`);
        await this.flushEvents();
      } else {
        console.log('⏰ Analytics: Timer tetiklendi ama queue boş');
      }
    }, this.batchInterval);
  }

  /**
   * Event queue'yu gönder
   */
  async flushEvents() {
    if (this.eventQueue.length === 0) {
      console.log('📊 Analytics: Event queue boş, gönderilecek veri yok');
      return;
    }

    try {
      const eventsToSend = [...this.eventQueue];
      this.eventQueue = [];

      console.log(`📤 Analytics: ${eventsToSend.length} event gönderiliyor...`, {
        sessionId: this.sessionId,
        deviceId: this.deviceId,
        userId: this.userId,
        eventTypes: eventsToSend.map(e => e.eventType)
      });

      const response = await eventsAPI.trackBatch(eventsToSend);
      
      console.log(`✅ Analytics: ${eventsToSend.length} event başarıyla gönderildi`, {
        response: response?.data || response
      });
    } catch (error) {
      console.error('❌ Analytics: Event gönderme hatası:', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
        eventsCount: eventsToSend.length
      });
      
      // Hata durumunda event'leri geri ekle (sadece network hatası ise)
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        console.warn('⚠️ Analytics: Network hatası, event\'ler queue\'ya geri eklendi');
        this.eventQueue.unshift(...eventsToSend);
      } else {
        console.warn('⚠️ Analytics: Server hatası, event\'ler kayboldu');
      }
    }
  }

  /**
   * Mevcut ekranı al
   */
  getCurrentScreen() {
    if (this.screenHistory.length === 0) return null;
    return this.screenHistory[this.screenHistory.length - 1].name;
  }

  /**
   * Servisi temizle
   */
  async cleanup() {
    await this.endSession();
    this.isInitialized = false;
  }
}

// Singleton instance
const analyticsService = new AnalyticsService();

export default analyticsService;

