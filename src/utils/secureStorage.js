/**
 * Güvenli Depolama Utility
 * Hassas veriler için SecureStore, hassas olmayan veriler için AsyncStorage kullanır
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hassas veri anahtarları - bunlar SecureStore'da saklanmalı
const SENSITIVE_KEYS = [
  'userId',
  'userName',
  'userEmail',
  'userPhone',
  'userPassword', // Şifre hiçbir zaman saklanmamalı ama kontrol için
  'token',
  'authToken',
  'refreshToken',
  'apiKey',
  'tenantId',
  'twoFactorEnabled',
  'privacySettings',
  'tempCardData', // Kart bilgileri - kaldırılacak ama şimdilik kontrol için
  'guestDeviceId',
  'isLoggedIn'
];

// Hassas olmayan veriler - AsyncStorage'da kalabilir
const NON_SENSITIVE_KEYS = [
  'hasSeenOnboarding',
  'cartCount',
  'cartLastCleared',
  'cartLastModified',
  'compareProducts',
  'analytics_device_id',
  'language',
  'theme'
];

/**
 * Anahtarın hassas olup olmadığını kontrol et
 */
function isSensitiveKey(key) {
  return SENSITIVE_KEYS.some(sensitiveKey => 
    key.toLowerCase().includes(sensitiveKey.toLowerCase())
  );
}

/**
 * Güvenli depolama - hassas veriler için SecureStore, diğerleri için AsyncStorage
 */
export const secureStorage = {
  /**
   * Değer kaydet
   */
  async setItem(key, value) {
    try {
      if (isSensitiveKey(key)) {
        // Hassas veriler SecureStore'da
        if (value === null || value === undefined) {
          await SecureStore.deleteItemAsync(key);
        } else {
          await SecureStore.setItemAsync(key, String(value));
        }
      } else {
        // Hassas olmayan veriler AsyncStorage'da
        if (value === null || value === undefined) {
          await AsyncStorage.removeItem(key);
        } else {
          await AsyncStorage.setItem(key, String(value));
        }
      }
    } catch (error) {
      console.error(`❌ SecureStorage setItem error for key "${key}":`, error);
      throw error;
    }
  },

  /**
   * Değer al
   */
  async getItem(key) {
    try {
      if (isSensitiveKey(key)) {
        // Hassas veriler SecureStore'dan
        return await SecureStore.getItemAsync(key);
      } else {
        // Hassas olmayan veriler AsyncStorage'dan
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error(`❌ SecureStorage getItem error for key "${key}":`, error);
      return null;
    }
  },

  /**
   * Birden fazla değer kaydet
   */
  async multiSet(keyValuePairs) {
    try {
      const securePairs = [];
      const asyncPairs = [];

      for (const [key, value] of keyValuePairs) {
        if (isSensitiveKey(key)) {
          securePairs.push([key, value]);
        } else {
          asyncPairs.push([key, value]);
        }
      }

      // SecureStore için tek tek kaydet
      for (const [key, value] of securePairs) {
        if (value === null || value === undefined) {
          await SecureStore.deleteItemAsync(key);
        } else {
          await SecureStore.setItemAsync(key, String(value));
        }
      }

      // AsyncStorage için toplu kaydet
      if (asyncPairs.length > 0) {
        await AsyncStorage.multiSet(asyncPairs);
      }
    } catch (error) {
      console.error('❌ SecureStorage multiSet error:', error);
      throw error;
    }
  },

  /**
   * Birden fazla değer al
   */
  async multiGet(keys) {
    try {
      const secureKeys = [];
      const asyncKeys = [];

      // Anahtarları ayır
      for (const key of keys) {
        if (isSensitiveKey(key)) {
          secureKeys.push(key);
        } else {
          asyncKeys.push(key);
        }
      }

      const results = [];

      // SecureStore'dan al
      for (const key of secureKeys) {
        const value = await SecureStore.getItemAsync(key);
        results.push([key, value]);
      }

      // AsyncStorage'dan al
      if (asyncKeys.length > 0) {
        const asyncResults = await AsyncStorage.multiGet(asyncKeys);
        results.push(...asyncResults);
      }

      // Orijinal sıraya göre sırala
      const keyMap = new Map(results);
      return keys.map(key => [key, keyMap.get(key) || null]);
    } catch (error) {
      console.error('❌ SecureStorage multiGet error:', error);
      return keys.map(key => [key, null]);
    }
  },

  /**
   * Değer sil
   */
  async removeItem(key) {
    try {
      if (isSensitiveKey(key)) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`❌ SecureStorage removeItem error for key "${key}":`, error);
    }
  },

  /**
   * Birden fazla değer sil
   */
  async multiRemove(keys) {
    try {
      const secureKeys = [];
      const asyncKeys = [];

      for (const key of keys) {
        if (isSensitiveKey(key)) {
          secureKeys.push(key);
        } else {
          asyncKeys.push(key);
        }
      }

      // SecureStore'dan sil
      for (const key of secureKeys) {
        await SecureStore.deleteItemAsync(key);
      }

      // AsyncStorage'dan sil
      if (asyncKeys.length > 0) {
        await AsyncStorage.multiRemove(asyncKeys);
      }
    } catch (error) {
      console.error('❌ SecureStorage multiRemove error:', error);
    }
  },

  /**
   * Tüm anahtarları al
   */
  async getAllKeys() {
    try {
      // SecureStore tüm anahtarları listeleme desteği yok
      // AsyncStorage'dan anahtarları al ve SecureStore'dan kontrol et
      const asyncKeys = await AsyncStorage.getAllKeys();
      // SecureStore anahtarları için manuel takip gerekebilir
      return asyncKeys;
    } catch (error) {
      console.error('❌ SecureStorage getAllKeys error:', error);
      return [];
    }
  },

  /**
   * Tüm verileri temizle
   */
  async clear() {
    try {
      // SecureStore clear desteği yok, manuel silme gerekir
      const asyncKeys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(asyncKeys);
      
      // SecureStore'daki hassas verileri manuel olarak silmek gerekir
      // Bu fonksiyon sadece AsyncStorage'ı temizler
      console.warn('⚠️ SecureStore clear: Hassas veriler manuel olarak silinmelidir');
    } catch (error) {
      console.error('❌ SecureStorage clear error:', error);
    }
  }
};

export default secureStorage;
