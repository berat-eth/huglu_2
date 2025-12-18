/**
 * Canlı İzleyici Sayısı Üretici
 * 
 * Ürün detay sayfasında gösterilecek canlı izleyici sayısını
 * ağırlıklı rastgele algoritma ile üretir.
 * 
 * Özellikler:
 * - 1-20 arası sayı üretir
 * - 1-10 arası değerler %70 olasılıkla çıkar (%40 daha fazla)
 * - 11-20 arası değerler %30 olasılıkla çıkar
 * - Daha gerçekçi ve inanılır sonuçlar
 */

/**
 * Ağırlıklı rastgele izleyici sayısı üretir
 * @returns {number} 1-20 arası izleyici sayısı
 */
export const generateWeightedRandomViewers = () => {
  const random = Math.random();
  
  // %70 olasılıkla 1-10 arası (düşük sayılar daha gerçekçi)
  if (random < 0.7) {
    return Math.floor(Math.random() * 10) + 1; // 1-10
  }
  // %30 olasılıkla 11-20 arası (popüler ürünler için)
  else {
    return Math.floor(Math.random() * 10) + 11; // 11-20
  }
};

/**
 * Özelleştirilebilir ağırlıklı rastgele sayı üretici
 * @param {Object} options - Yapılandırma seçenekleri
 * @param {number} options.minLow - Düşük aralık minimum (varsayılan: 1)
 * @param {number} options.maxLow - Düşük aralık maksimum (varsayılan: 10)
 * @param {number} options.minHigh - Yüksek aralık minimum (varsayılan: 11)
 * @param {number} options.maxHigh - Yüksek aralık maksimum (varsayılan: 20)
 * @param {number} options.lowProbability - Düşük aralık olasılığı (varsayılan: 0.7)
 * @returns {number} Üretilen izleyici sayısı
 */
export const generateCustomWeightedViewers = (options = {}) => {
  const {
    minLow = 1,
    maxLow = 10,
    minHigh = 11,
    maxHigh = 20,
    lowProbability = 0.7
  } = options;

  const random = Math.random();
  
  if (random < lowProbability) {
    // Düşük aralık
    return Math.floor(Math.random() * (maxLow - minLow + 1)) + minLow;
  } else {
    // Yüksek aralık
    return Math.floor(Math.random() * (maxHigh - minHigh + 1)) + minHigh;
  }
};

/**
 * Rastgele güncelleme aralığı üretir (saniye cinsinden)
 * @param {number} min - Minimum süre (saniye, varsayılan: 15)
 * @param {number} max - Maksimum süre (saniye, varsayılan: 30)
 * @returns {number} Milisaniye cinsinden süre
 */
export const generateRandomInterval = (min = 15, max = 30) => {
  return (min + Math.random() * (max - min)) * 1000;
};

/**
 * Ürün kategorisine göre özelleştirilmiş izleyici sayısı
 * @param {string} category - Ürün kategorisi
 * @returns {number} İzleyici sayısı
 */
export const generateCategoryBasedViewers = (category) => {
  // Popüler kategoriler için daha yüksek sayılar
  const popularCategories = ['Çadır', 'Sırt Çantası', 'Uyku Tulumu', 'Mont'];
  
  if (popularCategories.includes(category)) {
    // Popüler kategoriler: 5-25 arası, %60 olasılıkla 10-25
    return generateCustomWeightedViewers({
      minLow: 5,
      maxLow: 15,
      minHigh: 16,
      maxHigh: 25,
      lowProbability: 0.4 // Yüksek sayılar daha sık
    });
  } else {
    // Normal kategoriler: 1-15 arası, %70 olasılıkla 1-10
    return generateCustomWeightedViewers({
      minLow: 1,
      maxLow: 10,
      minHigh: 11,
      maxHigh: 15,
      lowProbability: 0.7
    });
  }
};

/**
 * Fiyat aralığına göre özelleştirilmiş izleyici sayısı
 * @param {number} price - Ürün fiyatı
 * @returns {number} İzleyici sayısı
 */
export const generatePriceBasedViewers = (price) => {
  if (price < 100) {
    // Ucuz ürünler: Daha fazla izleyici
    return generateCustomWeightedViewers({
      minLow: 5,
      maxLow: 15,
      minHigh: 16,
      maxHigh: 30,
      lowProbability: 0.5
    });
  } else if (price < 500) {
    // Orta fiyat: Normal dağılım
    return generateWeightedRandomViewers();
  } else {
    // Pahalı ürünler: Daha az izleyici
    return generateCustomWeightedViewers({
      minLow: 1,
      maxLow: 5,
      minHigh: 6,
      maxHigh: 10,
      lowProbability: 0.8
    });
  }
};

/**
 * Test fonksiyonu - Dağılımı kontrol eder
 * @param {number} iterations - Test sayısı (varsayılan: 1000)
 * @returns {Object} İstatistikler
 */
export const testDistribution = (iterations = 1000) => {
  const results = {
    lowRange: 0,  // 1-10
    highRange: 0, // 11-20
    values: []
  };

  for (let i = 0; i < iterations; i++) {
    const value = generateWeightedRandomViewers();
    results.values.push(value);
    
    if (value <= 10) {
      results.lowRange++;
    } else {
      results.highRange++;
    }
  }

  const lowPercentage = (results.lowRange / iterations * 100).toFixed(2);
  const highPercentage = (results.highRange / iterations * 100).toFixed(2);
  const average = (results.values.reduce((a, b) => a + b, 0) / iterations).toFixed(2);
  const min = Math.min(...results.values);
  const max = Math.max(...results.values);

  return {
    iterations,
    lowRange: results.lowRange,
    highRange: results.highRange,
    lowPercentage: `${lowPercentage}%`,
    highPercentage: `${highPercentage}%`,
    average,
    min,
    max,
    expectedLow: '70%',
    expectedHigh: '30%'
  };
};

// Örnek kullanım ve test
if (__DEV__) {
  console.log('🧪 Live Viewers Generator Test');
  console.log('================================');
  
  // 10 örnek değer
  console.log('\n📊 10 Örnek Değer:');
  for (let i = 0; i < 10; i++) {
    console.log(`  ${i + 1}. ${generateWeightedRandomViewers()} kişi`);
  }
  
  // Dağılım testi
  console.log('\n📈 Dağılım Testi (1000 iterasyon):');
  const stats = testDistribution(1000);
  console.log(`  Düşük Aralık (1-10): ${stats.lowRange} (${stats.lowPercentage}) - Beklenen: ${stats.expectedLow}`);
  console.log(`  Yüksek Aralık (11-20): ${stats.highRange} (${stats.highPercentage}) - Beklenen: ${stats.expectedHigh}`);
  console.log(`  Ortalama: ${stats.average}`);
  console.log(`  Min: ${stats.min}, Max: ${stats.max}`);
  
  // Kategori bazlı test
  console.log('\n🏷️ Kategori Bazlı Test:');
  console.log(`  Çadır (popüler): ${generateCategoryBasedViewers('Çadır')} kişi`);
  console.log(`  Havlu (normal): ${generateCategoryBasedViewers('Havlu')} kişi`);
  
  // Fiyat bazlı test
  console.log('\n💰 Fiyat Bazlı Test:');
  console.log(`  50₺ (ucuz): ${generatePriceBasedViewers(50)} kişi`);
  console.log(`  250₺ (orta): ${generatePriceBasedViewers(250)} kişi`);
  console.log(`  1000₺ (pahalı): ${generatePriceBasedViewers(1000)} kişi`);
}
