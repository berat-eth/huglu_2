/**
 * Bakım modu test scripti
 * Bu dosyayı App.js'de import edip çalıştırarak bakım modu kontrolünü test edebilirsiniz
 * 
 * Kullanım:
 * import { testMaintenanceMode } from './src/utils/testMaintenance';
 * testMaintenanceMode();
 */

import { checkMaintenanceMode } from './maintenanceCheck';
import { healthAPI } from '../services/api';

/**
 * Bakım modu kontrolünü test eder
 */
export const testMaintenanceMode = async () => {
  try {
    console.log('\n\n🧪 ========== MAINTENANCE MODE TEST ==========');
    
    // Test 1: Direct API call
    console.log('\n1️⃣ Direct API Call Test...');
    try {
      const directResponse = await healthAPI.maintenance('mobile');
      console.log('✅ Direct API Response:');
      console.log(JSON.stringify(directResponse.data, null, 2));
    } catch (error) {
      console.error('❌ Direct API Error:', error.message);
      console.error('Response:', error.response?.data);
    }
    
    // Test 2: checkMaintenanceMode function
    console.log('\n2️⃣ checkMaintenanceMode Function Test...');
    const result = await checkMaintenanceMode('mobile');
    console.log('✅ Function Result:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n==========================================\n\n');
    
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
};

/**
 * Bakım modunu manuel olarak aktif/pasif yapmak için backend'e istek gönderir
 * NOT: Bu fonksiyon sadece test amaçlıdır, production'da kullanılmamalıdır
 */
export const toggleMaintenanceMode = async (isActive, message = 'Sistem bakımda') => {
  console.log(`🔧 Bakım modu ${isActive ? 'aktif' : 'pasif'} ediliyor...`);
  console.log('⚠️ Bu fonksiyon sadece test amaçlıdır!');
  console.log('⚠️ Backend\'de admin endpoint\'i olmalıdır: POST /admin/maintenance');
  
  // Bu fonksiyon backend'de admin endpoint'i varsa çalışır
  // Örnek: POST /admin/maintenance { isActive: true, message: "...", platform: "mobile" }
};

export default testMaintenanceMode;
