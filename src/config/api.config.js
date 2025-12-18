// API Configuration
// Backend sunucunuzun IP adresini buraya yazın

// Yerel ağ için (aynı WiFi'de)
// Windows: ipconfig -> IPv4 Address
// Mac/Linux: ifconfig -> inet
export const API_CONFIG = {
  // Development - Production URL kullan (local backend yoksa)
  LOCAL: 'https://plaxsy.com/api',
  
  // Production
  PRODUCTION: 'https://plaxsy.com/api',
  
  // API Key
  API_KEY: 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
  
  // Timeout
  TIMEOUT: 30000,
};

// Aktif ortam seçimi
export const getApiUrl = () => {
  // Her zaman production URL kullan (backend production'da çalışıyor)
  // Eğer local backend çalıştırıyorsan, LOCAL'i değiştir: 'http://192.168.1.101:3000/api'
  return API_CONFIG.PRODUCTION;
};

export default API_CONFIG;