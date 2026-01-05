import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, API_CONFIG } from '../config/api.config';
import safeLog from '../utils/safeLogger';

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
  // React Native otomatik olarak sistem SSL sertifikalarını kullanır
  // httpsAgent sadece Node.js için geçerlidir, React Native'de kullanılmaz
});

// Request interceptor - TenantId ekle
api.interceptors.request.use(
  async (config) => {
    try {
      // AsyncStorage'dan tenantId al (Backend token kullanmıyor, sadece tenantId)
      const tenantId = await AsyncStorage.getItem('tenantId');
      
      config.headers['X-Tenant-Id'] = tenantId || '1';
      
      // Güvenli loglama - hassas veriler otomatik temizlenir
      safeLog.api(
        config.method.toUpperCase(),
        `${config.baseURL}${config.url}`,
        config.data ? { keys: Object.keys(config.data) } : null,
        null
      );
    } catch (error) {
      safeLog.error('Request interceptor error:', error);
      // Hata olsa bile request'i gönder
      config.headers['X-Tenant-Id'] = '1';
    }
    return config;
  },
  (error) => {
    safeLog.error('Request interceptor setup error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Hata yönetimi
api.interceptors.response.use(
  (response) => {
    // Güvenli loglama - response data otomatik temizlenir
    safeLog.api(
      response.config.method.toUpperCase(),
      `${response.config.baseURL}${response.config.url}`,
      null,
      {
        status: response.status,
        dataSize: JSON.stringify(response.data).length,
        success: response.data?.success
      }
    );
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
      safeLog.error('API Error Response:', {
        ...errorDetails,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    } else if (error.request) {
      // İstek gönderildi ama yanıt alınamadı
      safeLog.error('API Error Request (No Response):', errorDetails);
      safeLog.debug('Possible causes: Network timeout, Server not responding, SSL certificate problem');
    } else {
      // İstek oluşturulurken hata
      safeLog.error('API Error Setup:', errorDetails);
    }
    
    // Unauthorized - logout (401)
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.multiRemove(['userId', 'userName', 'userEmail', 'userPhone', 'isLoggedIn']);
        safeLog.debug('User logged out due to 401');
      } catch (logoutError) {
        safeLog.error('Logout error:', logoutError);
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
  searchByImage: (imageUri, category = null) => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'search-image.jpg',
    });
    if (category) {
      formData.append('category', category);
    }
    return api.post('/products/search/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getByCategory: (category, params) => api.get('/products', { params: { category, ...params } }),
  getFeatured: (limit = 10) => api.get('/products/featured', { params: { limit } }),
  getRecommendations: (productId, limit = 6) => api.get(`/products/${productId}/recommendations`, { params: { limit } }),
};

// ==================== CART API ====================
export const cartAPI = {
  // Sepeti getir
  get: (userId) => api.get(`/cart/${userId}`),
  
  // Sepete ürün ekle
  add: (userId, productId, quantity, selectedVariations, price) => 
    api.post('/cart', { userId, productId, quantity, selectedVariations, price }),
  
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
  // Enhanced EXP System
  addProductViewExp: (userId, productId) => api.post(`/user-level/${userId}/product-view-exp`, { productId }),
  addToCartExp: (userId, productId) => api.post(`/user-level/${userId}/add-to-cart-exp`, { productId }),
  addToFavoriteExp: (userId, productId) => api.post(`/user-level/${userId}/add-to-favorite-exp`, { productId }),
  addDailyLoginExp: (userId) => api.post(`/user-level/${userId}/daily-login-exp`),
  getStreak: (userId) => api.get(`/user-level/${userId}/streak`),
  addCommunityExp: (userId, type, postId, commentId) => api.post(`/user-level/${userId}/community-exp`, { type, postId, commentId }),
  checkLevelUp: (userId) => api.post(`/user-level/${userId}/check-level-up`),
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
  
  // Çekim Talebi (Banka Hesabına Transfer)
  createWithdrawRequest: (userId, amount, iban, accountHolderName) =>
    api.post('/wallet/withdraw-request', { userId, amount, iban, accountHolderName }),
  
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
  cancel: (returnRequestId, userId) => api.put(`/returns/${returnRequestId}/cancel`, { userId }),
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
  sendMessage: (userId, message, sessionId, productId = null, actionType = 'text', messageHistory = null) => 
    api.post('/chatbot/message', { userId, message, sessionId, productId, actionType, messageHistory }),
  getHistory: (userId, sessionId) => 
    api.get('/chatbot/history', { params: { userId, sessionId } }),
  createSession: (userId) => api.post('/chatbot/session', { userId }),
};

// ==================== CANLI DESTEK API ====================
export const liveSupportAPI = {
  sendMessage: async (userId, message) => {
    // Misafir kullanıcı için deviceId'yi de gönder
    let deviceId = null;
    if (userId < 0) {
      // Negatif userId = misafir kullanıcı
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        deviceId = await AsyncStorage.getItem('guestDeviceId');
      } catch (error) {
        safeLog.error('DeviceId alınamadı:', error);
      }
    }
    return api.post('/chatbot/live-support/message', { userId, message, deviceId });
  },
  getHistory: (userId, deviceId = null) => {
    const url = `/chatbot/live-support/history/${userId}`;
    const params = deviceId ? { deviceId } : {};
    return api.get(url, { params });
  },
  getAdminMessages: (userId) => 
    api.get(`/chatbot/admin-messages/${userId}`),
  getConversations: (userId) => 
    api.get(`/chatbot/live-support/conversations/${userId}`),
};

// Events API removed

// Analytics API removed

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
  createPost: (postData) => {
    // If image is a local URI, use FormData; otherwise use JSON
    if (postData.image && (postData.image.startsWith('file://') || postData.image.startsWith('content://'))) {
      const formData = new FormData();
      formData.append('userId', postData.userId);
      formData.append('caption', postData.caption || '');
      formData.append('location', postData.location || '');
      formData.append('category', postData.category || 'All');
      if (postData.productId) formData.append('productId', postData.productId);
      if (postData.hashtags && postData.hashtags.length > 0) {
        formData.append('hashtags', JSON.stringify(postData.hashtags));
      }
      // Optional: specify image format (9:16 or 1:1)
      if (postData.imageFormat) {
        formData.append('imageFormat', postData.imageFormat);
      }
      formData.append('image', {
        uri: postData.image,
        type: 'image/jpeg',
        name: 'post.jpg',
      });
      return api.post('/community/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } else {
      // Image is already a URL, send as JSON
      return api.post('/community/posts', postData);
    }
  },
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

// ==================== GAMIFICATION API ====================
export const gamificationAPI = {
  // Daily Rewards
  getDailyReward: (userId) => api.get(`/gamification/daily-reward/${userId}`),
  claimDailyReward: (userId) => api.post(`/gamification/daily-reward/${userId}/claim`),
  getStreak: (userId) => api.get(`/gamification/daily-reward/${userId}/streak`),
  
  // Quests
  getQuests: (userId) => api.get(`/gamification/quests/${userId}`),
  getQuestById: (questId, userId) => api.get(`/gamification/quests/${questId}`, { params: { userId } }),
  claimQuestReward: (questId, userId) => api.post(`/gamification/quests/${questId}/claim`, { userId }),
  trackQuestProgress: (questId, userId, progress) => api.post(`/gamification/quests/${questId}/progress`, { userId, progress }),
  
  // Badges
  getBadges: (userId) => api.get(`/gamification/badges/${userId}`),
  getBadgeById: (badgeId, userId) => api.get(`/gamification/badges/${badgeId}`, { params: { userId } }),
  
  // Lucky Draw
  getLuckyDrawInfo: (userId) => api.get(`/gamification/lucky-draw/${userId}`),
  spinLuckyDraw: (userId, points) => api.post(`/gamification/lucky-draw/${userId}/spin`, { points }),
};

// ==================== WELCOME BONUS API ====================
export const welcomeBonusAPI = {
  checkEligibility: (userId) => api.get(`/welcome-bonus/${userId}/eligibility`),
  claimWelcomeBonus: (userId) => api.post(`/welcome-bonus/${userId}/claim`),
  getWelcomePackages: () => api.get('/welcome-bonus/packages'),
};

// ==================== VIP PROGRAM API ====================
export const vipAPI = {
  getVIPStatus: (userId) => api.get(`/vip/${userId}/status`),
  getVIPBenefits: (userId) => api.get(`/vip/${userId}/benefits`),
  getExclusiveProducts: (userId) => api.get(`/vip/${userId}/exclusive-products`),
  getPersonalConsultant: (userId) => api.get(`/vip/${userId}/consultant`),
  getUpcomingEvents: (userId) => api.get(`/vip/${userId}/events`),
  convertExpToCoupon: (userId, expAmount) => api.post(`/vip/${userId}/convert-exp`, { expAmount }),
};

// ==================== SUBSCRIPTION API ====================
export const subscriptionAPI = {
  getSubscriptions: (userId) => api.get(`/subscriptions/${userId}`),
  createSubscription: (subscriptionData) => api.post('/subscriptions', subscriptionData),
  updateSubscription: (subscriptionId, subscriptionData) => api.put(`/subscriptions/${subscriptionId}`, subscriptionData),
  cancelSubscription: (subscriptionId) => api.delete(`/subscriptions/${subscriptionId}`),
  pauseSubscription: (subscriptionId) => api.post(`/subscriptions/${subscriptionId}/pause`),
  resumeSubscription: (subscriptionId) => api.post(`/subscriptions/${subscriptionId}/resume`),
  getFrequentOrders: (userId) => api.get(`/subscriptions/${userId}/frequent-orders`),
};

// ==================== SOCIAL SHARING API ====================
export const socialSharingAPI = {
  shareProduct: (userId, productId, platform) => api.post('/social-sharing/product', { userId, productId, platform }),
  shareWishlist: (userId, platform) => api.post('/social-sharing/wishlist', { userId, platform }),
  shareExperience: (userId, content, platform) => api.post('/social-sharing/experience', { userId, content, platform }),
  getShareRewards: (userId) => api.get(`/social-sharing/${userId}/rewards`),
  submitUGC: (userId, productId, imageUri, caption) => {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('productId', productId);
    formData.append('caption', caption);
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'ugc.jpg',
    });
    return api.post('/social-sharing/ugc', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ==================== FREE SAMPLES API ====================
export const freeSamplesAPI = {
  getAvailableSamples: () => api.get('/free-samples/available'),
  requestSample: (userId, productId) => api.post('/free-samples/request', { userId, productId }),
  getMySamples: (userId) => api.get(`/free-samples/${userId}`),
};

// ==================== CART ABANDONMENT API ====================
export const cartAbandonmentAPI = {
  getAbandonedCart: (userId) => api.get(`/cart-abandonment/${userId}`),
  sendReminder: (userId, cartId) => api.post(`/cart-abandonment/${userId}/reminder`, { cartId }),
  applyAbandonedCartOffer: (userId, cartId, offerCode) => api.post(`/cart-abandonment/${userId}/apply-offer`, { cartId, offerCode }),
};

// ==================== WIN-BACK CAMPAIGNS API ====================
export const winBackAPI = {
  getWinBackOffers: (userId) => api.get(`/win-back/${userId}/offers`),
  claimWinBackOffer: (userId, offerId) => api.post(`/win-back/${userId}/claim`, { offerId }),
};

// ==================== HEALTH CHECK & MAINTENANCE ====================
export const healthAPI = {
  check: () => api.get('/health'),
  maintenance: (platform = 'mobile') => api.get('/maintenance/status', { params: { platform } }),
};

export default api;
