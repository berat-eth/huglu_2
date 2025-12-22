/**
 * Analytics Debug Utility
 * 
 * Expo Go'da veri toplama durumunu kontrol etmek için yardımcı fonksiyonlar
 */

import analyticsService from '../services/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Analytics servisinin durumunu kontrol et
 */
export async function checkAnalyticsStatus() {
  const status = {
    isInitialized: analyticsService.isInitialized,
    sessionId: analyticsService.sessionId,
    deviceId: analyticsService.deviceId,
    userId: analyticsService.userId,
    tenantId: analyticsService.tenantId,
    eventQueueLength: analyticsService.eventQueue?.length || 0,
    platform: Platform.OS,
    isExpoGo: __DEV__ || false,
  };

  // AsyncStorage kontrolü
  try {
    const deviceId = await AsyncStorage.getItem('analytics_device_id');
    const userId = await AsyncStorage.getItem('userId');
    const tenantId = await AsyncStorage.getItem('tenantId');
    
    status.asyncStorage = {
      deviceId: deviceId ? 'Mevcut' : 'Yok',
      userId: userId || 'Yok',
      tenantId: tenantId || 'Yok',
    };
  } catch (error) {
    status.asyncStorageError = error.message;
  }

  return status;
}

/**
 * Test event gönder
 */
export async function sendTestEvent() {
  try {
    console.log('🧪 Test event gönderiliyor...');
    
    await analyticsService.trackEvent('test_event', {
      test: true,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      isExpoGo: __DEV__ || false,
    });

    console.log('✅ Test event gönderildi');
    
    return {
      success: true,
      message: 'Test event başarıyla gönderildi',
      queueLength: analyticsService.eventQueue?.length || 0,
    };
  } catch (error) {
    console.error('❌ Test event hatası:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Analytics servisini manuel başlat
 */
export async function initializeAnalytics() {
  try {
    console.log('🔄 Analytics servisi manuel başlatılıyor...');
    await analyticsService.initialize();
    
    const status = await checkAnalyticsStatus();
    return {
      success: true,
      status,
    };
  } catch (error) {
    console.error('❌ Analytics başlatma hatası:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Event queue'yu manuel gönder
 */
export async function flushEvents() {
  try {
    console.log('📤 Event queue manuel gönderiliyor...');
    await analyticsService.flushEvents();
    
    return {
      success: true,
      message: 'Event\'ler gönderildi',
    };
  } catch (error) {
    console.error('❌ Event gönderme hatası:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Tüm debug bilgilerini göster
 */
export async function getFullDebugInfo() {
  const status = await checkAnalyticsStatus();
  const queueInfo = analyticsService.eventQueue?.map((event, index) => ({
    index,
    eventType: event.eventType,
    screenName: event.screenName,
    timestamp: event.timestamp,
  })) || [];

  return {
    status,
    queueInfo,
    queueLength: analyticsService.eventQueue?.length || 0,
    recommendations: getRecommendations(status),
  };
}

/**
 * Duruma göre öneriler
 */
function getRecommendations(status) {
  const recommendations = [];

  if (!status.isInitialized) {
    recommendations.push('Analytics servisi başlatılmamış. initializeAnalytics() çağırın.');
  }

  if (!status.sessionId) {
    recommendations.push('Session ID yok. Servis başlatılmamış olabilir.');
  }

  if (!status.deviceId) {
    recommendations.push('Device ID yok. AsyncStorage kontrol edin.');
  }

  if (status.eventQueueLength === 0) {
    recommendations.push('Event queue boş. Test event göndermeyi deneyin.');
  }

  if (status.eventQueueLength > 0) {
    recommendations.push(`${status.eventQueueLength} event queue\'da bekliyor. flushEvents() çağırabilirsiniz.`);
  }

  if (status.asyncStorageError) {
    recommendations.push(`AsyncStorage hatası: ${status.asyncStorageError}`);
  }

  if (status.isExpoGo) {
    recommendations.push('Expo Go kullanılıyor. Bazı native modüller çalışmayabilir ama analytics çalışmalı.');
  }

  return recommendations;
}

