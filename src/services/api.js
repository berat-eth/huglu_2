import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, API_CONFIG } from '../config/api.config';

// Backend API URL
const API_BASE_URL = getApiUrl();

// API Key
const API_KEY = API_CONFIG.API_KEY;

// Axios instance oluştur - React Native için optimize edilmiş
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'Accept': 'application/json',
    'User-Agent': 'HugluMobileApp/1.0',
  },
  validateStatus: (status) => status < 500,
  // React Native için SSL sertifika sorunlarını önlemek
  httpsAgent: undefined,
});

// Request interceptor - TenantId ekle
api.interceptors.request.use(
  async (config) => {
    try {
      // AsyncStorage'dan tenantId al (Backend token kullanmıyor, sadece tenantId)
      const tenantId = await AsyncStorage.getItem('tenantId');
      
      config.headers['X-Tenant-Id'] = tenantId || '1';
      
      console.log('📤 API Request:', config.method.toUpperCase(), config.url, {
        tenantId: tenantId || '1',
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`
      });
    } catch (error) {
      console.error('❌ Request interceptor error:', error);
      // Hata olsa bile request'i gönder
      config.headers['X-Tenant-Id'] = '1';
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor setup error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Hata yönetimi
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.url, response.status, {
      dataSize: JSON.stringify(response.data).length,
      success: response.data?.success
    });
    return response;
  },
  async (error) => {
    // Detaylı hata loglama
    const errorDetails = {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      fullURL: error.config?.baseURL + error.config?.url,
      headers: error.config?.headers,
      message: error.message,
      code: error.code,
    };
    
    if (error.response) {
      // Sunucu yanıt verdi ama hata kodu döndü
      console.error('❌ API Error Response:', {
        ...errorDetails,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        responseHeaders: error.response.headers,
      });
    } else if (error.request) {
      // İstek gönderildi ama yanıt alınamadı
      console.error('❌ API Error Request (No Response):', errorDetails);
      console.error('   This usually means:');
      console.error('   - Network timeout');
      console.error('   - Server not responding');
      console.error('   - CORS issue (unlikely for mobile)');
      console.error('   - SSL certificate problem');
    } else {
      // İstek oluşturulurken hata
      console.error('❌ API Error Setup:', errorDetails);
    }
    
    // Unauthorized - logout (401)
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.multiRemove(['userId', 'userName', 'userEmail', 'userPhone', 'isLoggedIn']);
        console.log('🔓 User logged out due to 401');
      } catch (logoutError) {
        console.error('❌ Logout error:', logoutError);
      }
    }
    
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================
export const authAPI = {
  login: (email, password) => api.post('/users/login', { email, password }),
  register: (userData) => api.post('/users', userData), // Backend endpoint: POST /api/users
  googleLogin: (idToken) => api.post('/auth/google/verify', { idToken }),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

// ==================== PRODUCTS API ====================
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getVariations: (productId) => api.get(`/products/${productId}/variations`),
  getCategories: () => api.get('/categories'),
  search: (query, filters) => api.get('/products/search', { params: { query, ...filters } }),
  searchByBarcode: (barcode) => api.get('/products/barcode', { params: { barcode } }),
  getByCategory: (category, params) => api.get('/products', { params: { category, ...params } }),
  getFeatured: (limit = 10) => api.get('/products/featured', { params: { limit } }),
  getRecommendations: (productId, limit = 6) => api.get(`/products/${productId}/recommendations`, { params: { limit } }),
};

// ==================== CART API ====================
export const cartAPI = {
  // Sepeti getir
  get: (userId) => api.get(`/cart/${userId}`),
  
  // Sepete ürün ekle
  add: (userId, productId, quantity, selectedVariations) => 
    api.post('/cart', { userId, productId, quantity, selectedVariations }),
  
  // Sepetteki ürün miktarını güncelle
  update: (cartItemId, quantity) => 
    api.put(`/cart/${cartItemId}`, { quantity }),
  
  // Sepetten ürün çıkar
  remove: (cartItemId) => 
    api.delete(`/cart/${cartItemId}`),
  
  // Sepeti temizle
  clear: (userId) => api.delete(`/cart/user/${userId}`),
  
  // Sepet toplamını getir
  getTotal: (userId) => api.get(`/cart/${userId}/total`),
  
  // Çıkış öncesi sepet kontrolü
  checkBeforeLogout: (userId) => api.post('/cart/check-before-logout', { userId }),
};

// ==================== ORDERS API ====================
export const ordersAPI = {
  create: (orderData) => api.post('/orders', orderData),
  getByUser: (userId) => api.get(`/orders/user/${userId}`),
  getById: (orderId) => api.get(`/orders/${orderId}`),
  track: (orderId) => api.get(`/orders/${orderId}/track`),
  getReturnable: (userId) => api.get('/orders/returnable', { params: { userId } }),
  cancel: (orderId) => api.put(`/orders/${orderId}/cancel`),
  getInvoice: (orderId) => api.get(`/orders/${orderId}/invoice`),
};

// ==================== INVOICES API ====================
export const invoicesAPI = {
  getByUser: (userId) => api.get(`/invoices/${userId}`),
  getBillingInvoices: (userId) => api.get(`/billing/invoices/${userId}`),
  getOrderInvoices: (userId) => api.get(`/orders/${userId}/invoices`),
  getByOrderId: (orderId) => api.get(`/orders/${orderId}/invoice`),
  getSharedInvoice: (token) => api.get(`/invoices/share/${token}`),
};

// ==================== USER API ====================
export const userAPI = {
  getProfile: (userId) => api.get(`/users/${userId}`),
  updateProfile: (userId, userData) => api.put(`/users/${userId}`, userData),
  changePassword: (userId, currentPassword, newPassword) => 
    api.put(`/users/${userId}/password`, { currentPassword, newPassword }),
  search: (query, excludeUserId) => api.get('/users/search', { params: { query, excludeUserId } }),
  
  // Two Factor Authentication
  getTwoFactorStatus: (userId) => api.get(`/users/${userId}/two-factor`),
  sendTwoFactorCode: (userId, phoneNumber) => api.post(`/users/${userId}/two-factor/send-code`, { phoneNumber }),
  verifyTwoFactorCode: (userId, code) => api.post(`/users/${userId}/two-factor/verify`, { code }),
  disableTwoFactor: (userId) => api.put(`/users/${userId}/two-factor/disable`),
  
  // Privacy Settings
  getPrivacySettings: (userId) => api.get(`/users/${userId}/privacy-settings`),
  updatePrivacySettings: (userId, settings) => api.put(`/users/${userId}/privacy-settings`, settings),
  
  // Addresses
  getAddresses: (userId, addressType) => api.get('/user-addresses', { params: { userId, addressType } }),
  addAddress: (addressData) => api.post('/user-addresses', addressData),
  updateAddress: (id, addressData) => api.put(`/user-addresses/${id}`, addressData),
  deleteAddress: (id) => api.delete(`/user-addresses/${id}`),
  setDefaultAddress: (id) => api.put(`/user-addresses/${id}/set-default`),
};

// ==================== USER LEVEL API ====================
export const userLevelAPI = {
  getLevel: (userId) => api.get(`/user-level/${userId}`),
  getHistory: (userId) => api.get(`/user-level/${userId}/history`),
  getStats: (userId) => api.get(`/user-level/${userId}/stats`),
  addExp: (userId, amount, source) => api.post(`/user-level/${userId}/add-exp`, { amount, source }),
  addPurchaseExp: (userId, orderAmount, orderId) => api.post(`/user-level/${userId}/purchase-exp`, { orderAmount, orderId }),
  addInvitationExp: (userId, invitedUserId) => api.post(`/user-level/${userId}/invitation-exp`, { invitedUserId }),
  addSocialShareExp: (userId, platform, contentType, contentId) => api.post(`/user-level/${userId}/social-share-exp`, { platform, contentType, contentId }),
  claimRewards: (userId, levelId) => api.post(`/user-level/${userId}/claim-rewards`, { levelId }),
};

// ==================== WALLET API ====================
export const walletAPI = {
  // Bakiye ve İşlemler (Gerçek Backend Endpoint'leri)
  getBalance: (userId) => api.get(`/wallet/balance/${userId}`),
  getTransactions: (userId) => api.get(`/wallet/transactions/${userId}`),
  getTransfers: () => api.get('/wallet/transfers'),
  
  // Transfer
  transfer: (fromUserId, toUserId, amount, description) => 
    api.post('/wallet/transfer', { fromUserId, toUserId, amount, description }),
  
  // Bakiye Yükleme
  rechargeRequest: (userId, amount, paymentMethod) => 
    api.post('/wallet/recharge-request', { userId, amount, paymentMethod }),
  
  // Hediye Kartı
  useGiftCard: (userId, code) => 
    api.post('/wallet/gift-card', { userId, code }),
  
  // Ek endpoint'ler (backend'de yoksa çalışmaz)
  getPoints: (userId) => api.get(`/wallet/points/${userId}`),
  getPaymentMethods: (userId) => api.get(`/wallet/payment-methods/${userId}`),
  getVouchers: (userId) => api.get(`/wallet/gift-cards/${userId}`),
};

// ==================== USERS API ====================
export const usersAPI = {
  search: (query) => api.get('/users/search', { params: { query } }),
  getProfile: (userId) => api.get(`/users/${userId}`),
};

// ==================== NOTIFICATIONS API ====================
export const notificationsAPI = {
  // Bildirimleri getir
  getAll: (userId) => api.get('/notifications', { params: { userId } }),
  
  // Sistem bildirimi oluştur
  createSystem: (userId, title, message, type) => 
    api.post('/notifications/system', { userId, title, message, type }),
  
  // Bildirimi okundu işaretle
  markAsRead: (notificationId) => 
    api.put(`/notifications/${notificationId}/read`),
  
  // Tüm bildirimleri okundu işaretle
  markAllAsRead: (userId) => 
    api.put('/notifications/read-all', { userId }),
  
  // Bildirimi sil
  delete: (notificationId) => 
    api.delete(`/notifications/${notificationId}`),
};

// ==================== PAYMENT API ====================
export const paymentAPI = {
  process: (paymentData) => api.post('/payments/process', paymentData),
  getStatus: (paymentId) => api.get(`/payments/${paymentId}/status`),
  getTestCards: () => api.get('/payments/test-cards'),
};

// ==================== REVIEWS API ====================
export const reviewsAPI = {
  getByProduct: (productId) => api.get('/reviews', { params: { productId } }),
  create: (reviewData, images) => {
    const formData = new FormData();
    Object.keys(reviewData).forEach(key => {
      formData.append(key, reviewData[key]);
    });
    if (images && images.length > 0) {
      images.forEach((image, index) => {
        formData.append('images', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.name || `review_${index}.jpg`,
        });
      });
    }
    return api.post('/reviews', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id, reviewData) => api.put(`/reviews/${id}`, reviewData),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// ==================== PRODUCT QUESTIONS API ====================
export const productQuestionsAPI = {
  getByProduct: (productId) => api.get(`/product-questions`, { params: { productId } }),
  create: (questionData) => api.post('/product-questions', questionData),
  answer: (questionId, answerData) => api.post(`/product-questions/${questionId}/answer`, answerData),
  delete: (questionId) => api.delete(`/product-questions/${questionId}`),
  helpful: (questionId, userId) => api.post(`/product-questions/${questionId}/helpful`, { userId }),
};

// ==================== FAVORITES/WISHLIST API ====================
export const wishlistAPI = {
  // Gerçek Backend Endpoint'leri
  get: (userId) => api.get(`/favorites/user/${userId}`),
  add: (userId, productId) => api.post('/favorites', { userId, productId }),
  remove: (favoriteId, userId) => api.delete(`/favorites/${favoriteId}`, { params: { userId } }),
  
  // Alternatif: productId ile silme (backend'de favoriteId bulunamazsa)
  removeByProduct: (userId, productId) => api.delete(`/favorites/product/${productId}`, { params: { userId } }),
  
  // Toggle (varsa sil, yoksa ekle)
  toggle: (userId, productId) => api.post('/favorites/toggle', { userId, productId }),
};

// ==================== RETURN REQUESTS API ====================
export const returnRequestsAPI = {
  get: (userId) => api.get(`/returns/user/${userId}`),
  getReturnableOrders: (userId) => api.get(`/returns/returnable-orders/${userId}`),
  create: (requestData) => api.post('/returns', requestData),
  cancel: (returnRequestId) => api.put(`/returns/${returnRequestId}/cancel`),
};

// ==================== STORIES API ====================
export const storiesAPI = {
  getAll: () => api.get('/stories'),
  getActive: () => api.get('/stories'),
  view: (id) => api.post(`/stories/${id}/view`),
};

// ==================== SLIDERS API ====================
export const slidersAPI = {
  getAll: () => api.get('/sliders'),
  getActive: () => api.get('/sliders'),
  click: (id) => api.post(`/sliders/${id}/click`),
  view: (id) => api.post(`/sliders/${id}/view`),
};

// ==================== FLASH DEALS API ====================
export const flashDealsAPI = {
  getActive: () => api.get('/flash-deals'), // Backend'de /active yok, direkt /flash-deals aktif olanları döndürüyor
  getAll: () => api.get('/flash-deals'),
};

// ==================== CAMPAIGNS API ====================
export const campaignsAPI = {
  getAll: () => api.get('/campaigns'),
  getAvailable: (userId) => api.get(`/campaigns/available/${userId}`),
  apply: (userId, campaignId) => api.post('/campaigns/apply', { userId, campaignId }),
};

// ==================== POPUPS API ====================
export const popupsAPI = {
  getActive: () => api.get('/popups'),
  view: (id) => api.post(`/popups/${id}/view`),
  click: (id) => api.post(`/popups/${id}/click`),
};

// ==================== RECOMMENDATIONS API ====================
export const recommendationsAPI = {
  getForUser: (userId) => api.get(`/recommendations/user/${userId}`),
  trackEvent: (userId, eventType, productId, eventValue, searchQuery, filterDetails) => 
    api.post('/recommendations/event', { userId, eventType, productId, eventValue, searchQuery, filterDetails }),
  getUserProfile: (userId) => api.get(`/recommendations/user/${userId}/profile`),
  rebuildProfile: (userId) => api.post(`/recommendations/user/${userId}/rebuild-profile`),
};

// ==================== CHATBOT API ====================
export const chatbotAPI = {
  sendMessage: (userId, message, sessionId) => 
    api.post('/chatbot/message', { userId, message, sessionId }),
  getHistory: (userId, sessionId) => 
    api.get('/chatbot/history', { params: { userId, sessionId } }),
  createSession: (userId) => api.post('/chatbot/session', { userId }),
};

// ==================== ANALYTICS API ====================
export const analyticsAPI = {
  trackEvent: (eventData) => api.post('/user-data/behavior/track', eventData),
  startSession: (sessionData) => api.post('/user-data/behavior/session/start', sessionData),
  endSession: (sessionData) => api.post('/user-data/behavior/session/end', sessionData),
  linkDevice: (deviceId, userId) => api.post('/user-data/behavior/link-device', { deviceId, userId }),
};

// ==================== REFERRAL API ====================
export const referralAPI = {
  getReferralInfo: (userId) => api.get(`/referral/${userId}`),
  trackReferral: (referrerId, referredUserId, referralCode) => 
    api.post('/referral/track', { referrerId, referredUserId, referralCode }),
};

// ==================== COMMUNITY/UGC API ====================
export const communityAPI = {
  // Posts
  getPosts: (params) => api.get('/community/posts', { params }),
  getPostById: (postId) => api.get(`/community/posts/${postId}`),
  createPost: (postData) => api.post('/community/posts', postData),
  updatePost: (postId, postData) => api.put(`/community/posts/${postId}`, postData),
  deletePost: (postId) => api.delete(`/community/posts/${postId}`),
  
  // Interactions
  likePost: (postId, userId) => api.post(`/community/posts/${postId}/like`, { userId }),
  unlikePost: (postId, userId) => api.delete(`/community/posts/${postId}/like`, { data: { userId } }),
  addComment: (postId, userId, comment) => api.post(`/community/posts/${postId}/comment`, { userId, comment }),
  getComments: (postId) => api.get(`/community/posts/${postId}/comments`),
  deleteComment: (commentId) => api.delete(`/community/comments/${commentId}`),
  
  // User
  getUserPosts: (userId, params) => api.get(`/community/users/${userId}/posts`, { params }),
  followUser: (userId, followUserId) => api.post(`/community/users/${userId}/follow`, { followUserId }),
  unfollowUser: (userId, followUserId) => api.delete(`/community/users/${userId}/follow`, { data: { followUserId } }),
  getFollowers: (userId) => api.get(`/community/users/${userId}/followers`),
  getFollowing: (userId) => api.get(`/community/users/${userId}/following`),
};

// ==================== HEALTH CHECK & MAINTENANCE ====================
export const healthAPI = {
  check: () => api.get('/health'),
  maintenance: (platform = 'mobile') => api.get('/maintenance/status', { params: { platform } }),
};

export default api;
