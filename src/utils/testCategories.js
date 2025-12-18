/**
 * Kategori Verilerini Test Et ve Eşleştirme Tablosu Oluştur
 * 
 * Bu script API'den gerçek kategori verilerini çeker ve
 * ürün önerileri için eşleştirme tablosu oluşturur.
 */

import { productsAPI } from '../services/api';

/**
 * API'den kategorileri çek ve konsola yazdır
 */
export const fetchAndDisplayCategories = async () => {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📂 KATEGORİ VERİLERİNİ ÇEKİYORUM...');
    console.log('═══════════════════════════════════════════════════════════\n');

    const response = await productsAPI.getCategories();
    
    if (response.data?.success) {
      const categories = response.data.data || response.data.categories || [];
      
      console.log('✅ Toplam Kategori Sayısı:', categories.length);
      console.log('\n📋 KATEGORİ LİSTESİ:');
      console.log('═══════════════════════════════════════════════════════════\n');
      
      categories.forEach((category, index) => {
        console.log(`${index + 1}. ${JSON.stringify(category, null, 2)}`);
      });
      
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('📊 KATEGORİ İSİMLERİ (Eşleştirme için):');
      console.log('═══════════════════════════════════════════════════════════\n');
      
      const categoryNames = categories.map(cat => {
        // Farklı API formatlarını destekle
        return cat.name || cat.categoryName || cat.title || cat.label || cat;
      });
      
      console.log('Kategori İsimleri:', categoryNames);
      
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('💡 ÖNERİ: Bu kategori isimlerini kullanarak eşleştirme yapın');
      console.log('═══════════════════════════════════════════════════════════\n');
      
      return {
        success: true,
        categories,
        categoryNames,
      };
    } else {
      console.error('❌ API yanıtı başarısız:', response.data);
      return {
        success: false,
        error: 'API yanıtı başarısız',
      };
    }
  } catch (error) {
    console.error('\n❌ KATEGORİ ÇEKME HATASI:');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Hata:', error.message);
    console.error('Detay:', error.response?.data || error);
    console.error('═══════════════════════════════════════════════════════════\n');
    
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Test fonksiyonu - Konsola yazdır
 */
export const testCategories = async () => {
  console.log('🚀 Kategori testi başlatılıyor...\n');
  const result = await fetchAndDisplayCategories();
  
  if (result.success) {
    console.log('✅ Test başarılı!');
    console.log('\n📝 Sonraki Adım:');
    console.log('Bu kategori isimlerini kullanarak CATEGORY_RECOMMENDATIONS');
    console.log('tablosunu oluşturun ve eşleştirmeleri yapın.\n');
  } else {
    console.log('❌ Test başarısız!');
    console.log('Hata:', result.error, '\n');
  }
  
  return result;
};

// Eğer direkt çalıştırılırsa
if (require.main === module) {
  testCategories();
}
