import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Dimensions, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProductSlider from '../components/ProductSlider';
import Stories from '../components/Stories';
import HomeScreenSkeleton from '../components/HomeScreenSkeleton';
import ServerErrorScreen from './ServerErrorScreen';
import { COLORS } from '../constants/colors';
import { productsAPI, slidersAPI, flashDealsAPI, storiesAPI, cartAPI, wishlistAPI, chatbotAPI } from '../services/api';
import { testAPI, testNetworkConnectivity } from '../utils/testAPI';
import { getCategoryIcon, getIoniconName } from '../utils/categoryIcons';
import { isServerError } from '../utils/errorHandler';
import { updateCartBadge } from '../utils/cartBadge';
import { useAlert } from '../hooks/useAlert';
import { getApiUrl } from '../config/api.config';
export default function HomeScreen({ navigation }) {
  const alert = useAlert();
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [sliders, setSliders] = useState([]);
  const [stories, setStories] = useState([]);
  const [categories, setCategories] = useState(['Tümü']);
  const [userName, setUserName] = useState('Misafir');
  const [popularProducts, setPopularProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [personalizedProducts, setPersonalizedProducts] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [storyVisible, setStoryVisible] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const storyScrollRef = useRef(null);
  const [showServerError, setShowServerError] = useState(false);
  const [flashDealsEndTime, setFlashDealsEndTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [userFavorites, setUserFavorites] = useState([]);
  
  // Chatbot states
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [botTyping, setBotTyping] = useState(false);
  const chatScrollViewRef = useRef(null);

  useEffect(() => {
    // İlk yüklemede veri yükle (splash'te preload edilmiş olabilir ama yine de kontrol et)
    const initialize = async () => {
      await loadUserInfo();
      await loadData();
    };
    
    initialize();
  }, []);

  // Sayfa her açıldığında sepet sayısını güncelle
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        await loadCartCount(userId);
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Flash Deals Timer
  useEffect(() => {
    if (!flashDealsEndTime) {
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const endTime = new Date(flashDealsEndTime).getTime();
      const distance = endTime - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      // Günleri hesapla
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      // Kalan saatleri hesapla (günler çıkarıldıktan sonra)
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      // Kalan dakikaları hesapla
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      // Kalan saniyeleri hesapla
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [flashDealsEndTime]);

  // Size Özel - Her 20 dakikada bir rastgele ürünler (Flash Deals hariç, stokta olanlar)
  useEffect(() => {
    const ROTATION_INTERVAL = 20 * 60 * 1000; // 20 dakika
    const STORAGE_KEY = 'personalizedProductsLastUpdate';
    const STORAGE_PRODUCTS_KEY = 'personalizedProductsCache';

    const rotatePersonalizedProducts = async (forceUpdate = false) => {
      try {
        // Son güncelleme zamanını kontrol et
        const lastUpdateStr = await AsyncStorage.getItem(STORAGE_KEY);
        const lastUpdate = lastUpdateStr ? parseInt(lastUpdateStr, 10) : 0;
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdate;

        // Eğer 20 dakika geçmemişse ve force update değilse, cache'den yükle
        if (!forceUpdate && timeSinceLastUpdate < ROTATION_INTERVAL) {
          const cachedProducts = await AsyncStorage.getItem(STORAGE_PRODUCTS_KEY);
          if (cachedProducts) {
            const products = JSON.parse(cachedProducts);
            setPersonalizedProducts(products);
            const remainingTime = Math.ceil((ROTATION_INTERVAL - timeSinceLastUpdate) / 60000);
            console.log(`📦 Size Özel ürünler cache'den yüklendi (${remainingTime} dakika sonra güncellenecek)`);
            return;
          }
        }

        // 20 dakika geçtiyse veya cache yoksa, yeni ürünler yükle
        console.log('🔄 Size Özel ürünler güncelleniyor...');
        const response = await productsAPI.getAll({ limit: 100 });
        
        if (response.data?.success) {
          const allProducts = response.data.data?.products || response.data.data || [];
          
          // Flash deals ürünlerinin ID'lerini al
          const flashDealsIds = products.map(p => p.id || p._id);
          
          // Flash deals olmayan VE stokta olan ürünleri filtrele
          const availableProducts = allProducts.filter(p => {
            const isNotFlashDeal = !flashDealsIds.includes(p.id || p._id);
            const isInStock = (p.stock !== undefined && p.stock > 0) || p.stock === undefined;
            return isNotFlashDeal && isInStock;
          });
          
          // Rastgele 6 ürün seç
          const shuffled = [...availableProducts].sort(() => Math.random() - 0.5);
          const selectedProducts = shuffled.slice(0, 6);
          
          // State'i güncelle
          setPersonalizedProducts(selectedProducts);
          
          // Cache'e kaydet
          await AsyncStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(selectedProducts));
          await AsyncStorage.setItem(STORAGE_KEY, now.toString());
        }
      } catch (error) {
        console.error('❌ Size Özel ürünler yüklenemedi:', error);
      }
    };

    // İlk yüklemede çalıştır (cache kontrolü ile)
    if (products.length > 0) {
      rotatePersonalizedProducts(false);
    }

    // Her 20 dakikada bir kontrol et ve gerekirse güncelle
    const interval = setInterval(() => {
      rotatePersonalizedProducts(true);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [products]);

  const runNetworkTest = async () => {
    console.log('\n🔍 Running network diagnostics...');
    
    // 1. Internet bağlantısını test et
    const hasInternet = await testNetworkConnectivity();
    
    if (!hasInternet) {
      alert.show(
        'İnternet Bağlantısı Yok',
        'Lütfen internet bağlantınızı kontrol edin.',
        [{ text: 'Tamam' }]
      );
      return false;
    }
    
    // 2. API bağlantısını test et
    const apiWorking = await testAPI();
    
    if (!apiWorking) {
      alert.show(
        'API Bağlantı Hatası',
        'Sunucuya bağlanılamıyor. Lütfen daha sonra tekrar deneyin.',
        [
          { text: 'Tekrar Dene', onPress: () => runNetworkTest() },
          { text: 'İptal', style: 'cancel' }
        ]
      );
      return false;
    }
    
    return true;
  };

  const loadUserInfo = async () => {
    try {
      const [name, isLoggedIn, userId] = await AsyncStorage.multiGet(['userName', 'isLoggedIn', 'userId']);
      if (isLoggedIn[1] === 'true' && name[1]) {
        setUserName(name[1]);
      } else {
        setUserName('Misafir');
      }
      
      // Sepet sayısını yükle
      if (userId[1]) {
        await loadCartCount(userId[1]);
        await loadUserFavorites(userId[1]);
      }
    } catch (error) {
      console.error('Kullanıcı bilgisi yüklenemedi:', error);
      setUserName('Misafir');
    }
  };

  const loadUserFavorites = async (userId) => {
    try {
      const response = await wishlistAPI.get(userId);
      if (response.data?.success) {
        const favorites = response.data.data || response.data.favorites || [];
        const favoriteIds = favorites.map((fav) => fav.productId || fav.id);
        setUserFavorites(favoriteIds);
      }
    } catch (error) {
      console.log('Favoriler yüklenemedi:', error);
    }
  };

  const toggleFavorite = async (product) => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        alert.show('Giriş Gerekli', 'Favorilere eklemek için lütfen giriş yapın');
        return;
      }

      const productId = product.id || product._id;
      if (!productId) return;

      // Optimistic update
      const isCurrentlyFavorite = userFavorites.includes(productId);
      const newFavorites = isCurrentlyFavorite
        ? userFavorites.filter(id => id !== productId)
        : [...userFavorites, productId];
      setUserFavorites(newFavorites);

      // Update product state
      const updateProductFavorite = (productList) => {
        return productList.map(p => {
          const pid = p.id || p._id;
          if (pid === productId) {
            return { ...p, isFavorite: !isCurrentlyFavorite };
          }
          return p;
        });
      };

      setProducts(updateProductFavorite(products));
      setPopularProducts(updateProductFavorite(popularProducts));
      setNewProducts(updateProductFavorite(newProducts));
      setPersonalizedProducts(updateProductFavorite(personalizedProducts));

      try {
        if (isCurrentlyFavorite) {
          // Favorilerden çıkar - endpoint.md'ye göre favoriteId ile silme
          const favoritesResponse = await wishlistAPI.get(userId);
          if (favoritesResponse.data?.success) {
            const favorites = favoritesResponse.data.data || favoritesResponse.data.favorites || [];
            const favorite = favorites.find((fav) => (fav.productId || fav.id) === productId);
            
            if (favorite && (favorite.id || favorite._id)) {
              // DELETE /favorites/:favoriteId endpoint'ini kullan (endpoint.md'ye göre)
              await wishlistAPI.remove(favorite.id || favorite._id, userId);
            } else {
              throw new Error('Favorite ID bulunamadı');
            }
          }
        } else {
          // Favorilere ekle - POST /favorites endpoint'ini kullan
          await wishlistAPI.add(userId, productId);
        }
      } catch (error) {
        // Hata durumunda geri al
        setUserFavorites(isCurrentlyFavorite ? [...userFavorites, productId] : userFavorites.filter(id => id !== productId));
        const revertProductFavorite = (productList) => {
          return productList.map(p => {
            const pid = p.id || p._id;
            if (pid === productId) {
              return { ...p, isFavorite: isCurrentlyFavorite };
            }
            return p;
          });
        };
        setProducts(revertProductFavorite(products));
        setPopularProducts(revertProductFavorite(popularProducts));
        setNewProducts(revertProductFavorite(newProducts));
        setPersonalizedProducts(revertProductFavorite(personalizedProducts));
        console.error('Favori toggle hatası:', error);
        alert.show('Hata', 'Favori işlemi başarısız oldu');
      }
    } catch (error) {
      console.error('Favori toggle hatası:', error);
    }
  };

  // Chatbot handlers
  const handleChatbotSend = async () => {
    if (!chatInput.trim() || botTyping) return;

    const userMessage = {
      id: chatMessages.length + 1,
      type: 'user',
      text: chatInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    const messageText = chatInput;
    setChatInput('');
    setBotTyping(true);

    try {
      const userId = await AsyncStorage.getItem('userId');

      // Son 6 mesajı hazırla (context için)
      const recentMessages = chatMessages.slice(-6).map(msg => ({
        type: msg.type,
        text: msg.text,
        timestamp: msg.timestamp
      }));

      // Backend'e mesaj gönder (Gemini API backend'de kullanılacak)
      // Son 6 mesaj ve sistem prompt backend'e gönderilecek
      const response = await chatbotAPI.sendMessage(
        userId || null,
        messageText,
        null, // sessionId - backend otomatik yönetir
        null, // productId - ana ekranda ürün yok
        'text',
        recentMessages // Mesaj geçmişi
      );

      setBotTyping(false);

      if (response.data?.success && response.data?.data) {
        const botData = response.data.data;
        const botResponse = {
          id: botData.id || `bot-${Date.now()}`,
          type: 'bot',
          text: botData.text || botData.message || 'Yanıt alınamadı',
          messageType: botData.type || 'text',
          action: botData.action,
          productId: botData.productId,
          quickReplies: botData.quickReplies || [],
          timestamp: botData.timestamp ? new Date(botData.timestamp) : new Date(),
        };
        setChatMessages(prev => [...prev, botResponse]);

        // Eğer sepete ekleme action'ı varsa, sepete ekle
        if (botData.action === 'add-to-cart' && botData.productId && userId) {
          try {
            await cartAPI.add(userId, botData.productId, 1);
            await loadCartCount(userId);
            const successMessage = {
              id: `bot-${Date.now()}-success`,
              type: 'bot',
              text: '✅ Ürün sepete eklendi!',
              timestamp: new Date(),
            };
            setChatMessages(prev => [...prev, successMessage]);
          } catch (error) {
            console.error('Sepete ekleme hatası:', error);
          }
        }
      } else {
        // Fallback yanıt
        const botResponse = {
          id: chatMessages.length + 2,
          type: 'bot',
          text: 'Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin.',
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      console.error('Chatbot mesaj hatası:', error);
      setBotTyping(false);
      
      const botResponse = {
        id: chatMessages.length + 2,
        type: 'bot',
        text: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, botResponse]);
    }
  };

  const loadCartCount = async (userId) => {
    try {
      const count = await updateCartBadge(userId);
      setCartCount(count);
    } catch (error) {
      console.error('❌ Sepet sayısı yüklenemedi:', error.message);
      setCartCount(0);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProducts(),
        loadSliders(),
        loadStories(),
        loadCategories(),
        loadPopularProducts(),
        loadNewProducts(),
      ]);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      
      // Sunucu hatası kontrolü
      if (isServerError(error)) {
        setShowServerError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPopularProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 100 });
      
      if (response.data.success) {
        const allProducts = response.data.data?.products || response.data.data || [];
        
        // Önce stokta olan ürünleri filtrele
        const inStockProducts = allProducts.filter(p => 
          (p.stock !== undefined && p.stock > 0) || p.stock === undefined
        );
        
        // Rating'e göre sırala ve ilk 6'yı al
        let popular = inStockProducts
          .filter(p => p.rating && p.rating > 0)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 6);
        
        // Eğer rating'li ürün yoksa, stokta olan rastgele 6 ürün al
        if (popular.length === 0) {
          popular = inStockProducts
            .sort(() => Math.random() - 0.5)
            .slice(0, 6);
        }
        
        // Favori durumlarını ekle
        const popularWithFavorites = popular.map(p => ({
          ...p,
          isFavorite: userFavorites.includes(p.id || p._id)
        }));
        setPopularProducts(popularWithFavorites);
      }
    } catch (error) {
      console.error('❌ Popüler ürünler yüklenemedi:', error.message);
      
      // Sunucu hatası kontrolü
      if (isServerError(error)) {
        throw error; // Üst catch bloğuna fırlat
      }
      
      setPopularProducts([]);
    }
  };

  const loadNewProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 100 });
      
      if (response.data.success) {
        const allProducts = response.data.data?.products || response.data.data || [];
        
        // Önce stokta olan ürünleri filtrele
        const inStockProducts = allProducts.filter(p => 
          (p.stock !== undefined && p.stock > 0) || p.stock === undefined
        );
        
        // Son eklenen ürünleri al (lastUpdated'e göre sırala)
        let newItems = inStockProducts
          .filter(p => p.lastUpdated || p.createdAt)
          .sort((a, b) => {
            const dateA = new Date(a.lastUpdated || a.createdAt || 0);
            const dateB = new Date(b.lastUpdated || b.createdAt || 0);
            return dateB - dateA;
          })
          .slice(0, 6);
        
        // Eğer tarihli ürün yoksa, stokta olan rastgele 6 ürün al
        if (newItems.length === 0) {
          newItems = inStockProducts
            .sort(() => Math.random() - 0.5)
            .slice(0, 6);
        }
        
        // Favori durumlarını ekle
        const newItemsWithFavorites = newItems.map(p => ({
          ...p,
          isFavorite: userFavorites.includes(p.id || p._id)
        }));
        setNewProducts(newItemsWithFavorites);
        if (newItems.length > 0) {
          console.log('   İlk ürün:', newItems[0].name, '- Date:', newItems[0].lastUpdated, '- Stok:', newItems[0].stock);
        }
      }
    } catch (error) {
      console.error('❌ Yeni ürünler yüklenemedi:', error.message);
      
      // Sunucu hatası kontrolü
      if (isServerError(error)) {
        throw error; // Üst catch bloğuna fırlat
      }
      
      setNewProducts([]);
    }
  };

  const loadStories = async () => {
    try {
      const response = await storiesAPI.getActive();
      
      if (response.data.success) {
        const storiesData = response.data.data || [];
        setStories(storiesData);
      } else {
        setStories([]);
      }
    } catch (error) {
      setStories([]);
    }
  };

  const handleStoryPress = async (story) => {
    try {
      // Story görüntülenme sayısını artır
      await storiesAPI.view(story.id);
      
      // Tüm storyleri ve sliderları birleştir
      const allItems = [...stories, ...heroSlides];
      const index = allItems.findIndex(item => item.id === story.id);
      
      if (index !== -1) {
        setCurrentStoryIndex(index);
        setActiveStory(allItems[index]);
        setStoryVisible(true);
      } else {
        setCurrentStoryIndex(0);
        setActiveStory(story);
        setStoryVisible(true);
      }
    } catch (error) {
      console.error('Story view error:', error);
    }
  };

  const handleStoryLink = () => {
    if (!activeStory?.link_url) return;
    const link = activeStory.link_url;
    if (link.includes('product')) {
      const productId = link.split('/').pop();
      navigation.navigate('ProductDetail', { productId });
    } else if (link.includes('category')) {
      navigation.navigate('Shop');
    }
    setStoryVisible(false);
  };

  const loadProducts = async () => {
    try {
      console.log('🔄 Loading Flash Deals...');
      // Ana sayfada Flash Deals ürünlerini göster
      const response = await flashDealsAPI.getActive();
      console.log('📦 Flash Deals response:', response.status, response.data);
      
      if (response.data.success) {
        const flashDealsData = response.data.data || [];
        console.log('📊 Flash Deals data:', flashDealsData.length, 'deals');
        
        // Flash deals içindeki products'ları düzleştir ve indirim hesapla
        const allProducts = flashDealsData.flatMap(deal => {
          const products = deal.products || [];
          
          return products.map(product => {
            const basePrice = parseFloat(product.price || 0);
            const discountValue = parseFloat(deal.discount_value || 0);
            
            let discountedPrice = basePrice;
            
            if (deal.discount_type === 'percentage') {
              discountedPrice = basePrice * (1 - discountValue / 100);
            } else {
              discountedPrice = basePrice - discountValue;
            }
            
            return {
              ...product,
              oldPrice: basePrice, // Eski fiyat
              price: Math.max(0, discountedPrice), // İndirimli fiyat
              isFlashDeal: true, // Flash indirim flag'i
              dealName: deal.name, // Flash deal adı
            };
          });
        });
        
        setProducts(allProducts);
        setProducts([]);
        
        // Flash deals'den en yakın bitiş tarihini al ve timer'ı ayarla
        if (flashDealsData.length > 0) {
          // Tüm aktif flash deals'lerin end_date'lerini al
          const endDates = flashDealsData
            .map(deal => deal.end_date)
            .filter(date => date != null)
            .map(date => new Date(date));
          
          if (endDates.length > 0) {
            // En yakın bitiş tarihini bul (en küçük tarih)
            const nearestEndDate = new Date(Math.min(...endDates.map(d => d.getTime())));
            setFlashDealsEndTime(nearestEndDate);
            console.log('⏰ Flash Deals bitiş tarihi ayarlandı:', nearestEndDate);
          } else {
            // Eğer end_date yoksa varsayılan olarak 6 saat sonra bitecek şekilde ayarla
            const defaultEndTime = new Date();
            defaultEndTime.setHours(defaultEndTime.getHours() + 6);
            setFlashDealsEndTime(defaultEndTime);
            console.log('⏰ Flash Deals bitiş tarihi bulunamadı, varsayılan ayarlandı:', defaultEndTime);
          }
        }
      }
    } catch (error) {
      console.error('❌ Flash Deals yüklenemedi:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      setProducts([]);
    }
  };

  const loadSliders = async () => {
    try {
      const response = await slidersAPI.getAll();
      
      if (response.data.success) {
        const slidersData = response.data.data || [];
        setSliders(slidersData);
      }
    } catch (error) {
      // Hata durumunda sessizce devam et
    }
  };

  const loadCategories = async () => {
    try {
      console.log('🔄 Loading Categories...');
      const response = await productsAPI.getCategories();
      console.log('📦 Categories response:', response.status, response.data);
      
      if (response.data && response.data.success) {
        // Backend direkt string array döndürüyor: { success: true, data: ['Kategori1', 'Kategori2', ...] }
        const categoriesData = response.data.data || [];
        console.log('📊 Categories data:', categoriesData);
        
        // Backend'den gelen kategorileri 'Tümü' ile birleştir
        const categoryNames = categoriesData
          .filter(cat => cat && typeof cat === 'string' && cat.trim() !== '')
          .map(cat => cat.trim());
        
        if (categoryNames.length > 0) {
          setCategories(['Tümü', ...categoryNames]);
          console.log('✅ Kategoriler yüklendi:', categoryNames.length, 'kategori');
        } else {
          console.warn('⚠️ Kategoriler boş, varsayılan kategoriler kullanılıyor');
          setCategories(['Tümü', 'Havlu', 'Bornoz', 'Nevresim', 'Pike', 'Battaniye']);
        }
      } else {
        console.warn('⚠️ Categories response not successful:', response.data);
        // Hata durumunda varsayılan kategorileri kullan
        setCategories(['Tümü', 'Havlu', 'Bornoz', 'Nevresim', 'Pike', 'Battaniye']);
      }
    } catch (error) {
      console.error('❌ Kategoriler yüklenemedi:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      // Hata durumunda varsayılan kategorileri kullan
      setCategories(['Tümü', 'Havlu', 'Bornoz', 'Nevresim', 'Pike', 'Battaniye']);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Kategori ikonlarını belirle
  const getCategoryIcon = (category) => {
    const iconMap = {
      'Tümü': 'grid-outline',
      'Havlu': 'water-outline',
      'Bornoz': 'shirt-outline',
      'Nevresim': 'bed-outline',
      'Pike': 'snow-outline',
      'Battaniye': 'sunny-outline',
      'Yatak Örtüsü': 'bed-outline',
      'Çarşaf': 'document-outline',
      'Yastık': 'ellipse-outline',
      'Perde': 'albums-outline',
      'Masa Örtüsü': 'square-outline',
      'Peştemal': 'fitness-outline',
      'Plaj Havlusu': 'beach-outline',
      'Mutfak': 'restaurant-outline',
      'Banyo': 'water-outline',
      'Yatak Odası': 'moon-outline',
      'Salon': 'home-outline',
      'Çocuk': 'happy-outline',
      'Bebek': 'heart-outline',
    };
    
    // Kategori adını normalize et ve eşleştir
    const normalizedCategory = category.trim();
    return iconMap[normalizedCategory] || 'pricetag-outline';
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'Tümü' || product.category === selectedCategory;
    return matchesCategory;
  });

  const heroSlides = (sliders || []).map((slider) => {
    let imageUrl = slider.imageUrl || slider.image;
    
    // Eğer imageUrl yoksa veya geçersizse null döndür
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      return {
        id: slider.id,
        title: slider.title,
        description: slider.description,
        image: null,
        cta: slider.buttonText || 'İncele',
      };
    }
    
    imageUrl = imageUrl.trim();
    
    // Test slider gibi tam URL'ler için - olduğu gibi kullan (hiçbir işlem yapma)
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return {
        id: slider.id,
        title: slider.title,
        description: slider.description,
        image: imageUrl,
        imageUrl: imageUrl,
        cta: slider.buttonText || 'İncele',
        clickAction: slider.clickAction || null,
      };
    }
    
    // Base64 görselleri reddet
    if (imageUrl.startsWith('data:')) {
      return {
        id: slider.id,
        title: slider.title,
        description: slider.description,
        image: null,
        cta: slider.buttonText || 'İncele',
      };
    }
    
    // Relative URL kontrolü - /uploads/ veya / ile başlıyorsa base URL ekle
    if (imageUrl.startsWith('/uploads/') || (imageUrl.startsWith('/') && !imageUrl.startsWith('//'))) {
      // Base URL'i al - sonundaki /api'yi güvenli şekilde kaldır
      let API_BASE_URL = getApiUrl();
      if (API_BASE_URL.endsWith('/api')) {
        API_BASE_URL = API_BASE_URL.slice(0, -4); // Son 4 karakteri (/api) kaldır
      } else if (API_BASE_URL.endsWith('/api/')) {
        API_BASE_URL = API_BASE_URL.slice(0, -5); // Son 5 karakteri (/api/) kaldır
      }
      
      imageUrl = `${API_BASE_URL}${imageUrl}`;
    } else {
      // Geçersiz URL formatı
      imageUrl = null;
    }
    
    return {
      id: slider.id,
      title: slider.title,
      description: slider.description,
      image: imageUrl,
      imageUrl: imageUrl,
      cta: slider.buttonText || 'İncele',
      clickAction: slider.clickAction || null,
    };
  });

  const displayedProducts =
    (newProducts && newProducts.length > 0
      ? newProducts
      : popularProducts && popularProducts.length > 0
        ? popularProducts
        : filteredProducts).slice(0, 8);

  const { width: screenWidth } = Dimensions.get('window');
  const HERO_WIDTH = screenWidth * 0.88;
  const HERO_HEIGHT = HERO_WIDTH * 0.65;

  const formatPrice = (value) => {
    const numeric = parseFloat(value || 0);
    return `${numeric.toFixed(2)} ₺`;
  };

  if (loading) {
    return <HomeScreenSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Story Modal - Full Screen with Swipe */}
        <Modal visible={storyVisible} transparent={false} animationType="slide" onRequestClose={() => setStoryVisible(false)}>
          {(() => {
            // Stories ve sliders'ı birleştir - benzersiz key'ler için prefix ekle
            const allItems = [
              ...stories.map((story, idx) => ({ ...story, _uniqueKey: `story-${story.id || idx}` })),
              ...heroSlides.map((slide, idx) => ({ ...slide, _uniqueKey: `slider-${slide.id || idx}` }))
            ];
            const { width, height } = Dimensions.get('window');
            
            const normalizeImageUrl = (item) => {
              let imageUrl = item?.imageUrl || item?.image_url || item?.image || null;
              
              if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
                imageUrl = imageUrl.trim();
                
                let API_BASE_URL = getApiUrl();
                if (API_BASE_URL.endsWith('/api')) {
                  API_BASE_URL = API_BASE_URL.slice(0, -4);
                } else if (API_BASE_URL.endsWith('/api/')) {
                  API_BASE_URL = API_BASE_URL.slice(0, -5);
                }
                
                if (imageUrl.startsWith('/uploads/') || (imageUrl.startsWith('/') && !imageUrl.startsWith('//') && !imageUrl.startsWith('http'))) {
                  imageUrl = `${API_BASE_URL}${imageUrl}`;
                }
                
                if (imageUrl.startsWith('data:')) {
                  return null;
                }
                
                if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                  return imageUrl;
                }
              }
              
              return null;
            };
            
            return (
              <View style={styles.storyModalFullScreen}>
                {/* Close Button */}
                <TouchableOpacity style={styles.storyModalCloseButton} onPress={() => setStoryVisible(false)}>
                  <Text style={styles.storyModalCloseText}>✕</Text>
                </TouchableOpacity>
                
                {/* Story Counter */}
                {allItems.length > 1 && (
                  <View style={styles.storyCounter}>
                    <Text style={styles.storyCounterText}>
                      {currentStoryIndex + 1} / {allItems.length}
                    </Text>
                  </View>
                )}
                
                {/* Swipeable Story ScrollView */}
                <ScrollView
                  ref={storyScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / width);
                    if (index !== currentStoryIndex && index >= 0 && index < allItems.length) {
                      setCurrentStoryIndex(index);
                      setActiveStory(allItems[index]);
                      // Story görüntülenme sayısını artır
                      if (allItems[index].id) {
                        storiesAPI.view(allItems[index].id).catch(err => console.error('Story view error:', err));
                      }
                    }
                  }}
                  contentOffset={{ x: currentStoryIndex * width, y: 0 }}
                  scrollEventThrottle={16}
                >
                  {allItems.map((item, index) => {
                    const imageUrl = normalizeImageUrl(item);
                    const clickAction = item.clickAction || (typeof item.clickAction === 'string' ? JSON.parse(item.clickAction) : null);
                    const linkUrl = item.link_url || clickAction?.value || null;
                    
                    return (
                      <View key={item._uniqueKey || `item-${index}`} style={{ width, height }}>
                        {imageUrl ? (
                          <Image
                            source={{ uri: imageUrl }}
                            style={styles.storyModalFullImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.storyModalPlaceholder}>
                            <Text style={styles.storyModalPlaceholderText}>📷</Text>
                            <Text style={styles.storyModalPlaceholderSubText}>
                              {imageUrl === null ? 'Görsel Yüklenemedi' : 'Görsel Formatı Desteklenmiyor'}
                            </Text>
                          </View>
                        )}
                        
                        {/* Story Content Overlay */}
                        <View style={styles.storyModalOverlay}>
                          <Text style={styles.storyModalFullTitle}>{item.title}</Text>
                          {!!item.description && (
                            <Text style={styles.storyModalFullDesc}>{item.description}</Text>
                          )}
                          {linkUrl && (
                            <TouchableOpacity 
                              style={styles.storyModalFullButton} 
                              onPress={() => {
                                if (clickAction?.type === 'product' || linkUrl.includes('product')) {
                                  const productId = linkUrl.split('/').pop() || linkUrl;
                                  navigation.navigate('ProductDetail', { productId });
                                } else if (clickAction?.type === 'category' || linkUrl.includes('category')) {
                                  navigation.navigate('Shop');
                                } else if (clickAction?.type === 'url' || linkUrl.startsWith('http')) {
                                  Linking.openURL(linkUrl).catch(err => console.error('Link açma hatası:', err));
                                }
                                setStoryVisible(false);
                              }}
                            >
                              <Text style={styles.storyModalFullButtonText}>
                                {item.buttonText || item.cta || 'Detay'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            );
          })()}
        </Modal>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.welcomeText}>Hoş geldiniz,</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.textMain} />
              <View style={styles.badge} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Cart')}>
              <Ionicons name="cart-outline" size={22} color={COLORS.textMain} />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('Search')}
            activeOpacity={0.8}
          >
            <Ionicons name="search-outline" size={22} color={COLORS.gray400} />
            <Text style={styles.searchPlaceholder}>Bandana, bere, mont ara...</Text>
            <Ionicons name="options-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Stories */}
        {stories.length > 0 && <Stories stories={stories} onStoryPress={handleStoryPress} />}

        {/* Hero Carousel */}
        {heroSlides.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            decelerationRate="fast"
            snapToInterval={HERO_WIDTH + 12}
            contentContainerStyle={styles.carouselContainer}
          >
            {heroSlides.map((slide, index) => (
              <View key={slide.id ? `slider-${slide.id}` : `slider-index-${index}`} style={[styles.heroCard, { width: HERO_WIDTH, height: HERO_HEIGHT }]}>
                {slide.image && slide.image.startsWith('http') ? ( // Sadece HTTP/HTTPS URL'leri kabul et
                  <Image 
                    source={{ 
                      uri: slide.image,
                      cache: 'force-cache' // Görsel cache'leme
                    }} 
                    style={styles.heroImage} 
                    resizeMode="cover"
                    defaultSource={require('../../assets/icon.png')}
                  />
                ) : (
                  <View style={styles.heroImagePlaceholder}>
                    <Text style={styles.heroImagePlaceholderText}>🖼️</Text>
                    <Text style={styles.heroImagePlaceholderSubText}>
                      {!slide.image ? 'Görsel Yok' : 'Geçersiz Görsel URL'}
                    </Text>
                  </View>
                )}
                <View style={styles.heroOverlay} />
                <View style={styles.heroContent}>
                  <View style={styles.heroBadgeRow}>
                    <Text style={styles.heroBadge}>New Season</Text>
                  </View>
                  {slide.title && <Text style={styles.heroTitle}>{slide.title}</Text>}
                  {slide.description && <Text style={styles.heroSubtitle}>{slide.description}</Text>}
                  <TouchableOpacity style={styles.heroButton} onPress={() => navigation.navigate('Shop')}>
                    <Text style={styles.heroButtonText}>{slide.cta || 'İncele'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Categories */}
        {categories.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kategoriler</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {categories.map((category, index) => {
                // "Tümü" kategorisi için özel durum
                if (category === 'Tümü') {
                  return (
                    <TouchableOpacity
                      key={`${category}-${index}`}
                      style={[
                        styles.categoryChip,
                        selectedCategory === category && styles.categoryChipActive,
                      ]}
                      onPress={() => {
                        setSelectedCategory(category);
                        // "Tümü" seçildiğinde Shop ekranına yönlendir (filtre olmadan)
                        navigation.navigate('Shop');
                      }}
                      activeOpacity={0.9}
                    >
                      <Ionicons
                        name="grid-outline"
                        size={18}
                        color={selectedCategory === category ? COLORS.white : COLORS.primary}
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          selectedCategory === category && styles.categoryTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                
                // Şimdilik Ionicons kullan (PNG ikonlar şeffaf/beyaz olabilir)
                const useImage = false; // PNG ikonları devre dışı bırak
                
                return (
                  <TouchableOpacity
                    key={`${category}-${index}`}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category && styles.categoryChipActive,
                    ]}
                    onPress={() => {
                      setSelectedCategory(category);
                      // Kategori seçildiğinde Shop ekranına yönlendir ve kategori filtresi uygula
                      if (category !== 'Tümü') {
                        navigation.navigate('Shop', { category });
                      } else {
                        navigation.navigate('Shop');
                      }
                    }}
                    activeOpacity={0.9}
                  >
                    {useImage ? (
                      <Image 
                        source={categoryIconSource} 
                        style={[styles.categoryIconImage, { backgroundColor: '#11d421', borderWidth: 1, borderColor: '#000' }]}
                        resizeMode="contain"
                        onError={(e) => console.error('Image yükleme hatası:', category, e.nativeEvent.error)}
                      />
                    ) : (
                      <Ionicons
                        name={getIoniconName(category)}
                        size={20}
                        color={selectedCategory === category ? COLORS.white : COLORS.primary}
                      />
                    )}
                    <Text
                      style={[
                        styles.categoryText,
                        selectedCategory === category && styles.categoryTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Flash Deals Banner */}
        <TouchableOpacity 
          style={styles.flashDealsBanner}
          onPress={() => navigation.navigate('FlashDeals')}
          activeOpacity={0.9}
        >
          <View style={styles.flashDealsContent}>
            <View style={styles.flashDealsIcon}>
              <Ionicons name="flash" size={28} color={COLORS.white} />
            </View>
            <View style={styles.flashDealsText}>
              <Text style={styles.flashDealsTitle}>Flash İndirimler</Text>
              <View style={styles.timerContainer}>
                {timeLeft.days > 0 && (
                  <>
                    <View style={styles.timerBox}>
                      <Text style={styles.timerValue}>{String(timeLeft.days).padStart(2, '0')}</Text>
                    </View>
                    <Text style={styles.timerSeparator}>:</Text>
                  </>
                )}
                <View style={styles.timerBox}>
                  <Text style={styles.timerValue}>{String(timeLeft.hours).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.timerSeparator}>:</Text>
                <View style={styles.timerBox}>
                  <Text style={styles.timerValue}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.timerSeparator}>:</Text>
                <View style={styles.timerBox}>
                  <Text style={styles.timerValue}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
                </View>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
        </TouchableOpacity>

        {/* Size Özel Slider */}
        {personalizedProducts.length > 0 && (
          <ProductSlider
            title="Size Özel"
            products={personalizedProducts.map(p => ({ ...p, isFavorite: userFavorites.includes(p.id || p._id) }))}
            onSeeAll={() => navigation.navigate('Shop')}
            onProductPress={(product) => navigation.navigate('ProductDetail', { product })}
            onFavorite={toggleFavorite}
          />
        )}

        {/* Flash İndirimler Slider */}
        {filteredProducts.length > 0 && (
          <ProductSlider
            title="Flash İndirimler"
            products={filteredProducts.slice(0, 10).map(p => ({ ...p, isFavorite: userFavorites.includes(p.id || p._id) }))}
            onSeeAll={() => navigation.navigate('Shop')}
            onProductPress={(product) => navigation.navigate('ProductDetail', { product })}
            onFavorite={toggleFavorite}
          />
        )}

        {/* New Arrivals Slider (grid -> slider) */}
        {displayedProducts.length > 0 && (
          <ProductSlider
            title="Yeni Gelenler"
            products={displayedProducts.slice(0, 12).map(p => ({ ...p, isFavorite: userFavorites.includes(p.id || p._id) }))}
            onSeeAll={() => navigation.navigate('Shop')}
            onProductPress={(product) => navigation.navigate('ProductDetail', { product })}
            onFavorite={toggleFavorite}
          />
        )}

        {/* Promo Banner */}
        <View style={styles.promoBanner}>
          <View style={styles.promoContent}>
            <Text style={styles.promoLabel}>Yaz İndirimi</Text>
            <Text style={styles.promoTitle}>%50'ye Varan{'\n'}İndirimler</Text>
            <TouchableOpacity style={styles.heroButton} onPress={() => navigation.navigate('Campaigns')}>
              <Text style={styles.heroButtonText}>Fırsatları Gör</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.promoImagePlaceholder} />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Server Error Modal */}
      <Modal
        visible={showServerError}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <ServerErrorScreen
          onRetry={() => {
            setShowServerError(false);
            loadData();
          }}
          onClose={() => {}}
          onContactSupport={() => {
            setShowServerError(false);
            navigation.navigate('LiveChat');
          }}
        />
      </Modal>

      {/* Custom Alert */}
      {alert.AlertComponent()}

      {/* Chatbot Floating Button */}
      <TouchableOpacity
        style={styles.chatbotButton}
        onPress={() => {
          setShowChatbot(true);
          if (chatMessages.length === 0) {
            setChatMessages([
              {
                id: 1,
                type: 'bot',
                text: 'Merhaba! 👋 Size nasıl yardımcı olabilirim? Ürün arayabilir, sepete ekleme yapabilir ve sorularınızı yanıtlayabilirim.',
                timestamp: new Date(),
              }
            ]);
          }
        }}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.white} />
      </TouchableOpacity>

      {/* Chatbot Modal */}
      <Modal
        visible={showChatbot}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChatbot(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatbotModalContainer}
        >
          <View style={styles.chatbotModal}>
            {/* Header */}
            <View style={styles.chatbotHeader}>
              <View style={styles.chatbotHeaderLeft}>
                <View style={styles.chatbotAvatar}>
                  <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.chatbotTitle}>Huglu AI</Text>
                  <Text style={styles.chatbotSubtitle}>Size yardımcı olmaya hazır</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowChatbot(false)}
                style={styles.chatbotCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={chatScrollViewRef}
              style={styles.chatbotMessages}
              contentContainerStyle={styles.chatbotMessagesContent}
              onContentSizeChange={() => {
                chatScrollViewRef.current?.scrollToEnd({ animated: true });
              }}
            >
              {chatMessages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.chatbotMessage,
                    message.type === 'user' ? styles.chatbotMessageUser : styles.chatbotMessageBot,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatbotMessageText,
                      message.type === 'user' ? styles.chatbotMessageTextUser : styles.chatbotMessageTextBot,
                    ]}
                  >
                    {message.text}
                  </Text>
                  {message.action === 'add-to-cart' && message.productId && (
                    <TouchableOpacity
                      style={styles.chatbotActionButton}
                      onPress={async () => {
                        try {
                          const userId = await AsyncStorage.getItem('userId');
                          if (!userId) {
                            alert.show('Giriş Gerekli', 'Sepete eklemek için lütfen giriş yapın');
                            return;
                          }
                          await cartAPI.add(userId, message.productId, 1);
                          alert.show('Başarılı', 'Ürün sepete eklendi!');
                          await loadCartCount(userId);
                        } catch (error) {
                          alert.show('Hata', 'Ürün sepete eklenirken bir hata oluştu');
                        }
                      }}
                    >
                      <Text style={styles.chatbotActionButtonText}>Sepete Ekle</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {botTyping && (
                <View style={[styles.chatbotMessage, styles.chatbotMessageBot]}>
                  <Text style={styles.chatbotTypingText}>Yazıyor...</Text>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.chatbotInputContainer}>
              <TextInput
                style={styles.chatbotInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Mesajınızı yazın..."
                placeholderTextColor={COLORS.gray400}
                multiline
                onSubmitEditing={handleChatbotSend}
              />
              <TouchableOpacity
                style={[styles.chatbotSendButton, !chatInput.trim() && styles.chatbotSendButtonDisabled]}
                onPress={handleChatbotSend}
                disabled={!chatInput.trim() || botTyping}
              >
                {botTyping ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="send" size={20} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },

  welcomeText: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: COLORS.gray400,
  },
  carouselContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  heroCard: {
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    borderRadius: 16,
  },
  heroImagePlaceholder: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  heroImagePlaceholderText: {
    fontSize: 48,
    opacity: 0.3,
    marginBottom: 8,
  },
  heroImagePlaceholderSubText: {
    fontSize: 14,
    color: COLORS.gray600,
    fontWeight: '600',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  heroBadgeRow: {
    flexDirection: 'row',
  },
  heroBadge: {
    backgroundColor: COLORS.primary,
    color: COLORS.textMain,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    fontWeight: '800',
    fontSize: 11,
    alignSelf: 'flex-start',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  heroButton: {
    marginTop: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    color: COLORS.textMain,
    fontWeight: '800',
    fontSize: 14,
  },
  section: {
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 0,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  categoryIconImage: {
    width: 24,
    height: 24,
    zIndex: 10,
  },
  flashDealsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  flashDealsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  flashDealsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashDealsText: {
    gap: 8,
  },
  flashDealsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  flashDealsSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  timerValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    fontVariant: ['tabular-nums'],
  },
  timerSeparator: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginHorizontal: 2,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  productCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  productImageWrapper: {
    position: 'relative',
    aspectRatio: 4 / 5,
    backgroundColor: COLORS.gray100,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  productBadgeNew: {
    backgroundColor: COLORS.primary,
  },
  productBadgeDiscount: {
    backgroundColor: '#ef4444',
  },
  productBadgeText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 10,
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: 12,
    gap: 6,
  },
  productBrand: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productPrice: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  productOldPrice: {
    color: COLORS.gray400,
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  promoBanner: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 20,
    backgroundColor: '#1a331d',
    overflow: 'hidden',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoContent: {
    flex: 1,
    gap: 8,
  },
  promoLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  promoTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  promoImagePlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
  },
  storyModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  storyModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  storyModalImage: {
    width: '100%',
    height: 240,
  },
  storyModalContent: {
    padding: 16,
    gap: 8,
  },
  storyModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  storyModalDesc: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  storyModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  storyModalButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
  },
  storyModalPrimary: {
    backgroundColor: COLORS.primary,
  },
  storyModalButtonText: {
    fontWeight: '700',
    color: COLORS.textMain,
  },
  storyModalPrimaryText: {
    color: COLORS.textMain,
  },
  // Full Screen Story Modal Styles
  storyModalFullScreen: {
    flex: 1,
    backgroundColor: COLORS.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyModalCloseText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  storyCounter: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  storyCounterText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  storyModalFullImage: {
    width: '100%',
    height: '100%',
  },
  storyModalPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  storyModalPlaceholderText: {
    fontSize: 48,
    opacity: 0.3,
    marginBottom: 8,
  },
  storyModalPlaceholderSubText: {
    fontSize: 16,
    color: COLORS.gray600,
    fontWeight: '600',
  },
  storyModalOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    alignItems: 'center',
  },
  storyModalFullTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  storyModalFullDesc: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    opacity: 0.9,
  },
  storyModalFullButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  storyModalFullButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Chatbot styles
  chatbotButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  chatbotModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  chatbotModal: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  chatbotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  chatbotHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatbotAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatbotTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
  chatbotSubtitle: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 2,
  },
  chatbotCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatbotMessages: {
    flex: 1,
    padding: 16,
  },
  chatbotMessagesContent: {
    paddingBottom: 16,
  },
  chatbotMessage: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  chatbotMessageUser: {
    alignSelf: 'flex-end',
  },
  chatbotMessageBot: {
    alignSelf: 'flex-start',
  },
  chatbotMessageText: {
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
    borderRadius: 16,
  },
  chatbotMessageTextUser: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
  },
  chatbotMessageTextBot: {
    backgroundColor: COLORS.gray100,
    color: COLORS.textMain,
  },
  chatbotTypingText: {
    fontSize: 14,
    color: COLORS.gray600,
    fontStyle: 'italic',
    padding: 12,
  },
  chatbotActionButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  chatbotActionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  chatbotInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  chatbotInput: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.gray100,
    fontSize: 14,
    color: COLORS.textMain,
    marginRight: 8,
  },
  chatbotSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatbotSendButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
});
