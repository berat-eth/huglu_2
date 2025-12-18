// API Test Utility - Detaylı Network Debugging
import axios from 'axios';

const API_URL = 'https://api.huglutekstil.com/api';
const API_KEY = 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f';

// Belirli bir ürünün detayını test et
export const testProductDetail = async (productId = 556) => {
  console.log('\n🧪 ========== PRODUCT DETAIL TEST ==========');
  console.log('📍 Product ID:', productId);
  console.log('📍 URL:', `${API_URL}/products/${productId}`);
  console.log('==========================================\n');

  try {
    const testAxios = axios.create({
      timeout: 15000,
      validateStatus: () => true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': API_KEY,
        'X-Tenant-Id': '1',
      },
    });

    const response = await testAxios.get(`${API_URL}/products/${productId}`);
    
    console.log('📦 Response Status:', response.status);
    console.log('📦 Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📦 COMPLETE RESPONSE DATA:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('═══════════════════════════════════════════════════════════\n');

    if (response.data?.success) {
      const product = response.data.data?.product || response.data.data || response.data;
      console.log('✅ Product found!');
      console.log('   ID:', product.id);
      console.log('   Name:', product.name);
      console.log('   All Keys:', Object.keys(product));
      console.log('\n🔍 Variation Fields:');
      console.log('   variations:', product.variations);
      console.log('   variationDetails:', product.variationDetails);
      console.log('   xmlOptions:', product.xmlOptions);
      console.log('   sizes:', product.sizes);
      console.log('   sizeOptions:', product.sizeOptions);
    } else {
      console.error('❌ Product not found or error:', response.data);
    }

    console.log('\n✅ ========== TEST COMPLETED ==========\n');
    return response.data;

  } catch (error) {
    console.error('\n❌ ========== TEST FAILED ==========');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('==========================================\n');
    return null;
  }
};

// Test axios instance - SSL ve network sorunlarını debug etmek için
const testAxios = axios.create({
  timeout: 15000,
  validateStatus: () => true, // Tüm status kodlarını kabul et
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'HugluMobileApp/1.0',
  },
});

export const testAPI = async () => {
  console.log('\n🧪 ========== API CONNECTION TEST ==========');
  console.log('📍 URL:', API_URL);
  console.log('🔑 API Key:', API_KEY.substring(0, 20) + '...');
  console.log('⏰ Timeout: 15 seconds');
  console.log('==========================================\n');

  try {
    // Test 0: Basic connectivity test
    console.log('0️⃣ Testing basic HTTPS connectivity...');
    try {
      const basicTest = await testAxios.get('https://api.huglutekstil.com', {
        timeout: 5000,
      });
      console.log('✅ Basic HTTPS works:', basicTest.status);
    } catch (err) {
      console.error('❌ Basic HTTPS failed:', err.message);
      console.error('   Code:', err.code);
      console.error('   This might be SSL certificate issue or DNS problem');
    }

    // Test 1: Health Check
    console.log('\n1️⃣ Testing Health Check endpoint...');
    const healthResponse = await testAxios.get(`${API_URL}/health`, {
      headers: {
        'X-API-Key': API_KEY,
      },
    });
    
    if (healthResponse.status === 200) {
      console.log('✅ Health Check SUCCESS:', healthResponse.status);
      console.log('   Response:', JSON.stringify(healthResponse.data).substring(0, 100));
    } else {
      console.error('❌ Health Check FAILED:', healthResponse.status);
      console.error('   Response:', healthResponse.data);
    }

    // Test 2: Categories (simpler endpoint)
    console.log('\n2️⃣ Testing Categories endpoint...');
    const categoriesResponse = await testAxios.get(`${API_URL}/categories`, {
      headers: {
        'X-API-Key': API_KEY,
        'X-Tenant-Id': '1',
      },
    });
    
    if (categoriesResponse.status === 200) {
      console.log('✅ Categories SUCCESS:', categoriesResponse.status);
      console.log('   Count:', categoriesResponse.data?.data?.length || 0);
    } else {
      console.error('❌ Categories FAILED:', categoriesResponse.status);
      console.error('   Response:', categoriesResponse.data);
    }

    // Test 3: Products
    console.log('\n3️⃣ Testing Products endpoint...');
    const productsResponse = await testAxios.get(`${API_URL}/products`, {
      headers: {
        'X-API-Key': API_KEY,
        'X-Tenant-Id': '1',
      },
      params: { limit: 5 },
    });
    
    if (productsResponse.status === 200) {
      console.log('✅ Products SUCCESS:', productsResponse.status);
      console.log('   Count:', productsResponse.data?.data?.length || 0);
    } else {
      console.error('❌ Products FAILED:', productsResponse.status);
      console.error('   Response:', productsResponse.data);
    }

    // Test 4: Sliders
    console.log('\n4️⃣ Testing Sliders endpoint...');
    const slidersResponse = await testAxios.get(`${API_URL}/sliders`, {
      headers: {
        'X-API-Key': API_KEY,
        'X-Tenant-Id': '1',
      },
    });
    
    if (slidersResponse.status === 200) {
      console.log('✅ Sliders SUCCESS:', slidersResponse.status);
      console.log('   Count:', slidersResponse.data?.data?.length || 0);
    } else {
      console.error('❌ Sliders FAILED:', slidersResponse.status);
      console.error('   Response:', slidersResponse.data);
    }

    // Test 5: Flash Deals (endpoint: /flash-deals, not /flash-deals/active)
    console.log('\n5️⃣ Testing Flash Deals endpoint...');
    const flashDealsResponse = await testAxios.get(`${API_URL}/flash-deals`, {
      headers: {
        'X-API-Key': API_KEY,
        'X-Tenant-Id': '1',
      },
    });
    
    if (flashDealsResponse.status === 200) {
      console.log('✅ Flash Deals SUCCESS:', flashDealsResponse.status);
      console.log('   Count:', flashDealsResponse.data?.data?.length || 0);
      if (flashDealsResponse.data?.data?.length > 0) {
        console.log('   Sample:', JSON.stringify({
          id: flashDealsResponse.data.data[0].id,
          name: flashDealsResponse.data.data[0].name,
          productsCount: flashDealsResponse.data.data[0].products?.length || 0
        }));
      }
    } else {
      console.error('❌ Flash Deals FAILED:', flashDealsResponse.status);
      console.error('   Response:', flashDealsResponse.data);
    }

    console.log('\n✅ ========== ALL TESTS COMPLETED ==========\n');
    return true;

  } catch (error) {
    console.error('\n❌ ========== API TEST FAILED ==========');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    
    if (error.response) {
      console.error('\n📥 Response received but with error:');
      console.error('   Status:', error.response.status);
      console.error('   Headers:', JSON.stringify(error.response.headers));
      console.error('   Data:', JSON.stringify(error.response.data).substring(0, 200));
    } else if (error.request) {
      console.error('\n📤 Request sent but no response:');
      console.error('   This usually means:');
      console.error('   - Network is down');
      console.error('   - Server is not responding');
      console.error('   - SSL certificate issue');
      console.error('   - CORS blocking (unlikely for mobile)');
      console.error('   - Firewall blocking');
    } else {
      console.error('\n⚙️ Request setup error:');
      console.error('   Error:', error.message);
    }
    
    console.error('\n🔧 Troubleshooting steps:');
    console.error('   1. Check if you have internet connection');
    console.error('   2. Try opening https://api.huglutekstil.com/api/health in browser');
    console.error('   3. Check if backend server is running');
    console.error('   4. Verify API key is correct');
    console.error('   5. Check Android network permissions');
    console.error('==========================================\n');
    
    return false;
  }
};

// Basit network connectivity testi
export const testNetworkConnectivity = async () => {
  console.log('\n🌐 Testing network connectivity...');
  
  try {
    // Google'a ping at
    const response = await testAxios.get('https://www.google.com', {
      timeout: 5000,
    });
    console.log('✅ Internet connection OK');
    return true;
  } catch (error) {
    console.error('❌ No internet connection');
    console.error('   Error:', error.message);
    return false;
  }
};
