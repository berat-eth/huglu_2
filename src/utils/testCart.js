/**
 * Sepet API Test Fonksiyonları
 * 
 * Bu dosya sepet API endpoint'lerini test etmek için kullanılır.
 */

import { cartAPI } from '../services/api';

/**
 * Sepet API'lerini test eder
 * @param {string} userId - Test için kullanıcı ID'si
 * @param {string} productId - Test için ürün ID'si
 */
export const testCartAPI = async (userId, productId = '556') => {
  console.log('\n🧪 ===== SEPET API TEST BAŞLIYOR =====\n');
  
  try {
    // Test 1: Sepeti getir
    console.log('📋 Test 1: Sepeti getir...');
    const cartResponse = await cartAPI.get(userId);
    console.log('Sonuç:', JSON.stringify(cartResponse.data, null, 2));
    
    // Test 2: Sepete ürün ekle
    console.log('\n➕ Test 2: Sepete ürün ekle...');
    const addResponse = await cartAPI.add(userId, productId, 1, { size: 'M', color: 'Siyah' });
    console.log('Sonuç:', JSON.stringify(addResponse.data, null, 2));
    
    // Test 3: Sepet toplamını getir
    console.log('\n💰 Test 3: Sepet toplamını getir...');
    const totalResponse = await cartAPI.getTotal(userId);
    console.log('Sonuç:', JSON.stringify(totalResponse.data, null, 2));
    
    // Test 4: Sepeti tekrar getir (eklenen ürünü görmek için)
    console.log('\n📋 Test 4: Güncel sepeti getir...');
    const updatedCartResponse = await cartAPI.get(userId);
    console.log('Sonuç:', JSON.stringify(updatedCartResponse.data, null, 2));
    
    const cartItems = updatedCartResponse.data?.cart?.items || updatedCartResponse.data?.data?.items || [];
    
    if (cartItems.length > 0) {
      const firstItem = cartItems[0];
      const cartItemId = firstItem.id || firstItem._id;
      
      // Test 5: Ürün miktarını güncelle
      console.log('\n🔄 Test 5: Ürün miktarını güncelle...');
      const updateResponse = await cartAPI.update(cartItemId, 2);
      console.log('Sonuç:', JSON.stringify(updateResponse.data, null, 2));
      
      // Test 6: Ürünü sepetten çıkar
      console.log('\n🗑️ Test 6: Ürünü sepetten çıkar...');
      const removeResponse = await cartAPI.remove(cartItemId);
      console.log('Sonuç:', JSON.stringify(removeResponse.data, null, 2));
    }
    
    // Test 7: Çıkış öncesi sepet kontrolü
    console.log('\n🚪 Test 7: Çıkış öncesi sepet kontrolü...');
    const checkResponse = await cartAPI.checkBeforeLogout(userId);
    console.log('Sonuç:', JSON.stringify(checkResponse.data, null, 2));
    
    // Test 8: Sepeti temizle
    console.log('\n🧹 Test 8: Sepeti temizle...');
    const clearResponse = await cartAPI.clear(userId);
    console.log('Sonuç:', JSON.stringify(clearResponse.data, null, 2));
    
    console.log('\n✅ ===== SEPET API TEST TAMAMLANDI =====\n');
    
    return {
      success: true,
      message: 'Tüm testler başarıyla tamamlandı',
    };
  } catch (error) {
    console.error('\n❌ ===== SEPET API TEST HATASI =====');
    console.error('Hata:', error.message);
    console.error('Response:', error.response?.data);
    console.error('Status:', error.response?.status);
    
    return {
      success: false,
      error: error.message,
      response: error.response?.data,
    };
  }
};

/**
 * Sepet badge güncellemesini test eder
 * @param {string} userId - Kullanıcı ID'si
 */
export const testCartBadge = async (userId) => {
  console.log('\n🧪 ===== SEPET BADGE TEST BAŞLIYOR =====\n');
  
  try {
    const { updateCartBadge, getCartBadgeCount } = require('./cartBadge');
    
    // Test 1: Badge'i güncelle
    console.log('🔄 Test 1: Badge güncelleniyor...');
    const count = await updateCartBadge(userId);
    console.log('Güncel sepet sayısı:', count);
    
    // Test 2: Badge sayısını oku
    console.log('\n📖 Test 2: Badge sayısı okunuyor...');
    const savedCount = await getCartBadgeCount();
    console.log('Kaydedilmiş sayı:', savedCount);
    
    console.log('\n✅ ===== SEPET BADGE TEST TAMAMLANDI =====\n');
    
    return {
      success: true,
      count,
      savedCount,
    };
  } catch (error) {
    console.error('\n❌ ===== SEPET BADGE TEST HATASI =====');
    console.error('Hata:', error.message);
    
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Kullanım örneği:
 * 
 * import { testCartAPI, testCartBadge } from './src/utils/testCart';
 * 
 * // Sepet API testleri
 * await testCartAPI('USER_ID', 'PRODUCT_ID');
 * 
 * // Badge testleri
 * await testCartBadge('USER_ID');
 */
