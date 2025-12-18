import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert, Share, Modal, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import CustomModal from '../components/CustomModal';
import ModalOption from '../components/ModalOption';
import ProductRecommendations from '../components/ProductRecommendations';
import AddToCartSuccessModal from '../components/AddToCartSuccessModal';
import LoginRequiredModal from '../components/LoginRequiredModal';
import { COLORS } from '../constants/colors';
import { productsAPI, cartAPI, productQuestionsAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateWeightedRandomViewers } from '../utils/liveViewersGenerator';

const { width } = Dimensions.get('window');

const COLORS_OPTIONS = [COLORS.primary, '#2c2c2c', '#aa3b3b', '#3b5aaa'];
export default function ProductDetailScreen({ navigation, route }) {
  const { product: initialProduct } = route.params || {};
  const [product, setProduct] = useState(initialProduct);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState(0);
  const [isFavorite, setIsFavorite] = useState(initialProduct?.isFavorite || false);
  const [quantity, setQuantity] = useState(1);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [addingCart, setAddingCart] = useState(false);
  const [showAddToCartSuccessModal, setShowAddToCartSuccessModal] = useState(false);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [loginRequiredMessage, setLoginRequiredMessage] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [showARViewer, setShowARViewer] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [botTyping, setBotTyping] = useState(false);
  const [showReviewImageViewer, setShowReviewImageViewer] = useState(false);
  const [reviewImageViewerIndex, setReviewImageViewerIndex] = useState(0);
  const [reviewImageViewerImages, setReviewImageViewerImages] = useState([]);
  const [liveViewers, setLiveViewers] = useState(0);

  // Canlı izleyici sayısını başlat ve periyodik güncelle
  useEffect(() => {
    // İlk değeri ayarla
    setLiveViewers(generateWeightedRandomViewers());

    // Her 15-30 saniyede bir güncelle (daha gerçekçi)
    const interval = setInterval(() => {
      setLiveViewers(generateWeightedRandomViewers());
    }, (15 + Math.random() * 15) * 1000); // 15-30 saniye arası rastgele

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!initialProduct?.id && !initialProduct?._id) return;
      try {
        setLoadingDetail(true);
        const productId = initialProduct.id || initialProduct._id;
        
        // 1. Ürün detayını al
        const response = await productsAPI.getById(productId);
        
        if (response.data?.success) {
            const data = response.data.data?.product || response.data.data || response.data;
            
            // 2. Varyasyonları ayrı endpoint'ten al
            try {
              const variationsResponse = await productsAPI.getVariations(productId);
              
              if (variationsResponse.data?.success) {
                const variations = variationsResponse.data.variations || variationsResponse.data.data || [];
                
                // Varyasyonları ürün datasına ekle
                data.variations = variations;
              }
            } catch (variationError) {
              // Varyasyon endpoint'i yoksa devam et
            }
            
            if (data) {
              setProduct(data);
              setIsFavorite(!!data?.isFavorite);
            }
        }
      } catch (error) {
        console.error('Ürün detayı yüklenemedi:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status,
        });
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [initialProduct]);

  // Soruları yükle
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!product?.id && !product?._id) return;
      
      try {
        setLoadingQuestions(true);
        const productId = product.id || product._id;
        const response = await productQuestionsAPI.getByProduct(productId);
        
        if (response.data?.success) {
          const questionsData = response.data.data || response.data.questions || [];
          setQuestions(questionsData);
        }
      } catch (error) {
        console.error('Sorular yüklenemedi:', error);
        // Hata durumunda boş array kullan
        setQuestions([]);
      } finally {
        setLoadingQuestions(false);
      }
    };

    fetchQuestions();
  }, [product]);

  // API'den gelen beden/variant bilgilerini normalize et
  const sizeOptions = useMemo(() => {
    if (!product) {
      return [];
    }
    
    const sizes = [];
    
    // 1. Önce variationDetails'i kontrol et (JSON field)
    if (product.variationDetails) {
      console.log('1️⃣ variationDetails bulundu, parse ediliyor...');
      try {
        const details = typeof product.variationDetails === 'string' 
          ? JSON.parse(product.variationDetails) 
          : product.variationDetails;
        
        console.log('📋 variationDetails parse edildi:', JSON.stringify(details, null, 2));
        
        if (Array.isArray(details)) {
          details.forEach(variation => {
            console.log('   Variation işleniyor:', variation);
            if (Array.isArray(variation.options)) {
              variation.options.forEach(option => {
                console.log('      Option işleniyor:', option);
                if (option.value && (option.stock === undefined || option.stock > 0)) {
                  sizes.push({
                    id: option.id,
                    variationId: variation.id,
                    value: option.value,
                    stock: option.stock || 999,
                    price: option.satisFiyati || option.priceModifier || product.price,
                    sku: option.sku || option.barkod,
                  });
                }
              });
            }
          });
        }
        console.log('✅ variationDetails\'den', sizes.length, 'beden bulundu');
      } catch (e) {
        console.error('❌ variationDetails parse hatası:', e);
      }
    } else {
      console.log('1️⃣ variationDetails YOK');
    }
    
    // 2. Variations array'i kontrol et (API'den gelen yeni format)
    if (sizes.length === 0 && Array.isArray(product.variations) && product.variations.length > 0) {
      console.log('2️⃣ variations array bulundu, işleniyor...');
      product.variations.forEach(variation => {
        console.log('   Variation:', variation);
        
        // Yeni format: variation direkt olarak option bilgilerini içerebilir
        if (variation.name || variation.value) {
          // Direkt variation objesi
          sizes.push({
            id: variation.id || variation._id,
            variationId: variation.variationId || variation.id,
            value: variation.value || variation.name || variation.size,
            stock: variation.stock !== undefined ? variation.stock : 999,
            price: variation.price || variation.satisFiyati || product.price,
            sku: variation.sku || variation.barkod,
          });
        }
        // Eski format: variation içinde options array'i var
        else if (Array.isArray(variation.options) && variation.options.length > 0) {
          variation.options.forEach(option => {
            console.log('      Option:', option);
            if (option.value && (option.stock === undefined || option.stock > 0)) {
              sizes.push({
                id: option.id,
                variationId: variation.id,
                value: option.value,
                stock: option.stock || 999,
                price: option.satisFiyati || option.priceModifier || product.price,
                sku: option.sku || option.barkod,
              });
            }
          });
        }
      });
      console.log('✅ variations\'dan', sizes.length, 'beden bulundu');
    } else {
      console.log('2️⃣ variations array YOK veya BOŞ');
    }
    
    // 3. xmlOptions'ı kontrol et
    if (sizes.length === 0 && product.xmlOptions) {
      console.log('3️⃣ xmlOptions bulundu, parse ediliyor...');
      try {
        const xmlOpts = typeof product.xmlOptions === 'string' 
          ? JSON.parse(product.xmlOptions) 
          : product.xmlOptions;
        
        console.log('📋 xmlOptions parse edildi:', xmlOpts);
        
        if (Array.isArray(xmlOpts)) {
          xmlOpts.forEach(opt => {
            console.log('   Option:', opt);
            if (opt.value || opt.name) {
              sizes.push({
                value: opt.value || opt.name,
                stock: opt.stock || 999,
                price: opt.price || product.price,
                sku: opt.sku || opt.barkod,
              });
            }
          });
        }
        console.log('✅ xmlOptions\'dan', sizes.length, 'beden bulundu');
      } catch (e) {
        console.error('❌ xmlOptions parse hatası:', e);
      }
    } else {
      console.log('3️⃣ xmlOptions YOK');
    }
    
    // 4. Eski format desteği (sizes, sizeOptions, variants)
    if (sizes.length === 0) {
      console.log('4️⃣ Eski format kontrol ediliyor...');
      const candidates =
        product?.sizes ||
        product?.sizeOptions ||
        product?.variants ||
        [];

      console.log('   Candidates:', candidates);

      if (Array.isArray(candidates) && candidates.length > 0) {
        candidates.forEach((s) => {
          console.log('   Candidate:', s);
          if (typeof s === 'string') {
            sizes.push({ value: s, stock: 999 });
          } else if (s?.name || s?.label || s?.size || s?.value) {
            sizes.push({ 
              value: s.name || s.label || s.size || s.value,
              stock: s.stock || 999,
            });
          }
        });
        console.log('✅ Eski format\'tan', sizes.length, 'beden bulundu');
      } else {
        console.log('⚠️ Eski format\'ta da beden bulunamadı');
      }
    }

    console.log('✅ SONUÇ: İşlenmiş beden seçenekleri:', sizes);
    console.log('🔍 Ürün variations analizi - BİTİŞ\n');
    return sizes;
  }, [product]);

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `${product?.name || 'Ürün'}\n\n${product?.description || ''}\n\nFiyat: ${parseFloat(product?.price || 0).toFixed(0)}₺`,
        title: product?.name || 'Ürün Paylaş',
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Paylaşıldı:', result.activityType);
        } else {
          console.log('Paylaşıldı');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Paylaşım iptal edildi');
      }
    } catch (error) {
      console.error('Paylaşım hatası:', error);
      Alert.alert('Hata', 'Ürün paylaşılırken bir hata oluştu.');
    }
  };

  const handleAIAssistant = () => {
    setShowAIModal(true);
  };

  const handleChatbotOpen = () => {
    setShowChatbot(true);
    // İlk mesajı ekle
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          id: 1,
          type: 'bot',
          text: `Merhaba! ${product?.name || 'Bu ürün'} hakkında size nasıl yardımcı olabilirim? 🛍️`,
          timestamp: new Date(),
        }
      ]);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      id: chatMessages.length + 1,
      type: 'user',
      text: chatInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    const messageText = chatInput;
    setChatInput('');

    // Typing indicator
    setBotTyping(true);

    // Simüle bot yanıtı (gerçek API entegrasyonu için chatbotAPI kullanılabilir)
    setTimeout(() => {
      setBotTyping(false);
      const response = getBotResponse(messageText);
      const botResponse = {
        id: chatMessages.length + 2,
        type: 'bot',
        text: response.text || response,
        messageType: response.type || 'text',
        action: response.action,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, botResponse]);
    }, 1200);
  };

  const getBotResponse = (message) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('sipariş') || lowerMessage.includes('satın al') || lowerMessage.includes('al')) {
      return {
        text: '🛒 Hızlı sipariş vermek ister misiniz?\n\nÜrünü sepete ekleyip ödeme sayfasına yönlendirebilirim.',
        type: 'quick-order',
        action: 'add-to-cart'
      };
    } else if (lowerMessage.includes('beden') || lowerMessage.includes('size')) {
      const sizes = sizeOptions.map(s => s.value || s.label || s).join(', ');
      return {
        text: `${product?.name} için mevcut bedenler:\n\n${sizes || 'Tek beden'}\n\nHangi bedeni tercih edersiniz? 👕`,
        type: 'text'
      };
    } else if (lowerMessage.includes('renk') || lowerMessage.includes('color')) {
      return {
        text: 'Ürünümüz farklı renk seçeneklerinde mevcut. Yukarıdan renk seçebilirsiniz. 🎨',
        type: 'text'
      };
    } else if (lowerMessage.includes('fiyat') || lowerMessage.includes('price') || lowerMessage.includes('kaç')) {
      return {
        text: `💰 Ürün fiyatı: ${product?.discountPrice || product?.price} ₺\n${product?.discountPrice ? '\n🎉 İndirimli fiyat!' : ''}`,
        type: 'text'
      };
    } else if (lowerMessage.includes('kargo') || lowerMessage.includes('teslimat') || lowerMessage.includes('takip')) {
      return {
        text: '📦 Kargo ücretsiz!\n⏱️ Teslimat: 2-3 iş günü\n📍 Sipariş verdikten sonra kargo takip numaranızı alacaksınız.',
        type: 'text'
      };
    } else if (lowerMessage.includes('iade') || lowerMessage.includes('değişim')) {
      return {
        text: '✅ 14 gün içinde ücretsiz iade\n🔄 Kolay değişim süreci\n💰 Hızlı para iadesi',
        type: 'text'
      };
    } else if (lowerMessage.includes('stok')) {
      return {
        text: product?.stock > 0 
          ? `✅ Ürün stoktadır!\n📦 ${product.stock} adet mevcut\n🚀 Hemen sipariş verebilirsiniz.` 
          : '❌ Üzgünüm, ürün şu anda stokta yok.\n🔔 Stok geldiğinde bildirim almak ister misiniz?',
        type: 'text'
      };
    } else if (lowerMessage.includes('mağaza') || lowerMessage.includes('saat')) {
      return {
        text: '🏪 Mağaza Çalışma Saatleri:\n\n📅 Pazartesi-Cumartesi: 09:00-21:00\n📅 Pazar: 10:00-20:00\n\n📍 En yakın mağazayı bulmak için "Mağazalar" menüsünü kullanabilirsiniz.',
        type: 'text'
      };
    } else if (lowerMessage.includes('indirim') || lowerMessage.includes('kampanya')) {
      return {
        text: '🎁 Aktif kampanyalarımızı görmek için "Kampanyalar" sayfasını ziyaret edebilirsiniz!\n\n💳 İlk alışverişinizde %10 indirim\n🎉 3 al 2 öde fırsatları',
        type: 'text'
      };
    } else if (lowerMessage.includes('ödeme') || lowerMessage.includes('taksit')) {
      return {
        text: '💳 Ödeme Seçenekleri:\n\n✅ Kredi Kartı (9 taksit)\n✅ Banka Kartı\n✅ Kapıda Ödeme\n✅ Havale/EFT',
        type: 'text'
      };
    } else if (lowerMessage.includes('yardım') || lowerMessage.includes('help')) {
      return {
        text: '🤝 Size nasıl yardımcı olabilirim?\n\n• Hızlı sipariş\n• Beden bilgisi\n• Fiyat ve kampanyalar\n• Kargo ve teslimat\n• İade ve değişim\n• Stok durumu\n• Ödeme seçenekleri\n• Mağaza saatleri',
        type: 'text'
      };
    } else {
      return {
        text: 'Size nasıl yardımcı olabilirim? 😊\n\n"Sipariş ver" diyerek hızlı sipariş verebilir veya beden, fiyat, kargo, iade hakkında sorabilirsiniz.',
        type: 'text'
      };
    }
  };

  const handleQuickAction = (question) => {
    const userMessage = {
      id: chatMessages.length + 1,
      type: 'user',
      text: question,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);

    // Typing indicator
    setBotTyping(true);

    // Bot yanıtı
    setTimeout(() => {
      setBotTyping(false);
      const response = getBotResponse(question);
      const botResponse = {
        id: chatMessages.length + 2,
        type: 'bot',
        text: response.text || response,
        messageType: response.type || 'text',
        action: response.action,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const handleQuickOrder = async () => {
    try {
      setShowChatbot(false);
      await handleAddToCart();
    } catch (error) {
      console.error('Hızlı sipariş hatası:', error);
    }
  };

  const handleAIOption = (option) => {
    setShowAIModal(false);
    
    setTimeout(() => {
      switch(option) {
        case 'features':
          Alert.alert(
            'Ürün Özellikleri',
            `${product?.name || 'Ürün'}\n\n${product?.description || 'Açıklama bulunmuyor.'}\n\nFiyat: ${parseFloat(product?.price || 0).toFixed(0)}₺\nKategori: ${product?.category || 'Belirtilmemiş'}`,
            [{ text: 'Tamam' }]
          );
          break;
        case 'similar':
          Alert.alert(
            'Benzer Ürünler',
            'Benzer ürünleri görmek için ürün listesine gidin.',
            [
              { text: 'İptal', style: 'cancel' },
              { text: 'Ürünlere Git', onPress: () => navigation.navigate('Shop') }
            ]
          );
          break;
        case 'tips':
          Alert.alert(
            'Kullanım Önerileri',
            `${product?.name || 'Bu ürün'} için öneriler:\n\n• Ürünü kullanmadan önce etiketini okuyun\n• Bakım talimatlarına uyun\n• Orijinal ambalajında saklayın`,
            [{ text: 'Tamam' }]
          );
          break;
      }
    }, 300);
  };

  const pickImage = async () => {
    if (reviewImages.length >= 5) {
      Alert.alert('Limit', 'En fazla 5 görsel ekleyebilirsiniz');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setReviewImages([...reviewImages, result.assets[0].uri]);
    }
  };

  const removeImage = (index) => {
    setReviewImages(reviewImages.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    if (!newReviewComment.trim()) {
      Alert.alert('Hata', 'Lütfen yorum yazın');
      return;
    }

    const newReview = {
      id: reviews.length + 1,
      userName: 'Siz',
      rating: newReviewRating,
      comment: newReviewComment,
      date: 'Şimdi',
      images: [...reviewImages]
    };

    setReviews([newReview, ...reviews]);
    setShowReviewModal(false);
    setNewReviewComment('');
    setNewReviewRating(5);
    setReviewImages([]);
    Alert.alert('Başarılı', 'Yorumunuz eklendi!');
  };

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) {
      Alert.alert('Hata', 'Lütfen sorunuzu yazın');
      return;
    }

    try {
      setSubmittingQuestion(true);
      const userId = await AsyncStorage.getItem('userId');
      
      if (!userId) {
        setLoginRequiredMessage('Soru sormak için lütfen giriş yapın');
        setShowLoginRequiredModal(true);
        setSubmittingQuestion(false);
        return;
      }

      const productId = product?.id || product?._id;
      const response = await productQuestionsAPI.create({
        productId,
        userId,
        question: newQuestion.trim()
      });

      if (response.data?.success) {
        const newQuestionData = response.data.data || response.data.question;
        setQuestions([newQuestionData, ...questions]);
        setShowQuestionModal(false);
        setNewQuestion('');
        Alert.alert('Başarılı', 'Sorunuz gönderildi! Satıcı en kısa sürede yanıtlayacaktır.');
      } else {
        Alert.alert('Hata', response.data?.message || 'Soru gönderilemedi');
      }
    } catch (error) {
      console.error('Soru gönderme hatası:', error);
      Alert.alert('Hata', 'Soru gönderilirken bir hata oluştu');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleImagePress = (index) => {
    setImageViewerIndex(index);
    setShowImageViewer(true);
  };

  const handleARView = () => {
    // Ürünün 3D modeli var mı kontrol et
    if (product?.model3D || product?.arModel || product?.glbModel) {
      setShowARViewer(true);
    } else {
      Alert.alert(
        'AR Görünümü',
        'Bu ürün için 3D model henüz mevcut değil.',
        [{ text: 'Tamam' }]
      );
    }
  };

  const handleAddToCompare = async () => {
    try {
      const productId = product?.id || product?._id;
      if (!productId) {
        Alert.alert('Hata', 'Ürün bilgisi bulunamadı');
        return;
      }

      // Mevcut karşılaştırma listesini al
      const compareList = await AsyncStorage.getItem('compareProducts');
      let productIds = compareList ? JSON.parse(compareList) : [];

      // Ürün zaten listede mi kontrol et
      if (productIds.includes(productId)) {
        Alert.alert(
          'Karşılaştırma Listesi',
          'Bu ürün zaten karşılaştırma listesinde. Karşılaştırma sayfasına gitmek ister misiniz?',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Git', onPress: () => navigation.navigate('ProductCompare') },
          ]
        );
        return;
      }

      // Maksimum 4 ürün karşılaştırılabilir
      if (productIds.length >= 4) {
        Alert.alert('Limit', 'En fazla 4 ürün karşılaştırabilirsiniz');
        return;
      }

      // Ürünü listeye ekle
      productIds.push(productId);
      await AsyncStorage.setItem('compareProducts', JSON.stringify(productIds));

      Alert.alert(
        'Başarılı! 🎉',
        'Ürün karşılaştırma listesine eklendi',
        [
          { text: 'Tamam', style: 'cancel' },
          { text: 'Karşılaştır', onPress: () => navigation.navigate('ProductCompare') },
        ]
      );
    } catch (error) {
      console.error('Karşılaştırma listesine eklenemedi:', error);
      Alert.alert('Hata', 'Ürün eklenirken bir hata oluştu');
    }
  };

  const handleAddToCart = async () => {
    if (!product?.id && !product?._id) {
      Alert.alert('Hata', 'Ürün bilgisi bulunamadı');
      return;
    }

    try {
      setAddingCart(true);
      const userId = await AsyncStorage.getItem('userId');
      
      if (!userId) {
        setLoginRequiredMessage('Sepete ürün eklemek için lütfen giriş yapın');
        setShowLoginRequiredModal(true);
        setAddingCart(false);
        return;
      }

      const pid = product.id || product._id;
      const selectedVariations = {};
      
      // Seçili beden bilgisini ekle
      if (sizeOptions.length > 0 && sizeOptions[selectedSize]) {
        const selectedSizeOption = sizeOptions[selectedSize];
        
        // Yeni format (API'den gelen detaylı bilgi)
        if (selectedSizeOption.id && selectedSizeOption.variationId) {
          selectedVariations[selectedSizeOption.variationId] = {
            id: selectedSizeOption.id,
            variationId: selectedSizeOption.variationId,
            value: selectedSizeOption.value,
            priceModifier: selectedSizeOption.price,
            stock: selectedSizeOption.stock,
            sku: selectedSizeOption.sku
          };
        } else {
          // Eski format (basit string)
          selectedVariations.size = selectedSizeOption.value || selectedSizeOption;
        }
      }
      
      selectedVariations.color = COLORS_OPTIONS[selectedColor];

      const response = await cartAPI.add(userId, pid, quantity, selectedVariations);

      if (response.data?.success) {
        // Badge'i güncelle
        const { updateCartBadge } = require('../utils/cartBadge');
        await updateCartBadge(userId);
        
        setShowAddToCartSuccessModal(true);
      } else {
        Alert.alert('Hata', response.data?.message || 'Sepete eklenemedi');
      }
    } catch (error) {
      console.error('Sepete ekleme hatası:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Sepete eklenirken bir hata oluştu';
      Alert.alert('Hata', errorMessage);
    } finally {
      setAddingCart(false);
    }
  };

  // Ürün yoksa geri dön
  if (!product) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.errorContainer}>
          <Text style={styles.errorText}>Ürün bulunamadı</Text>
          <Button title="Geri Dön" onPress={() => navigation.goBack()} />
        </SafeAreaView>
      </View>
    );
  }

  // Ürün resimlerini hazırla (API'deki tüm alanları destekle)
  const productImages = useMemo(() => {
    const list = [];
    const add = (url) => {
      if (url && typeof url === 'string' && url.trim() !== '' && !list.includes(url)) {
        // URL'yi temizle ve normalize et
        const cleanUrl = url.trim();
        // Eğer URL http veya https ile başlamıyorsa, placeholder kullan
        if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
          list.push(cleanUrl);
        } else {
          console.warn('Geçersiz görsel URL:', cleanUrl);
        }
      }
    };

    console.log('🖼️ Ürün görselleri işleniyor:', {
      images: product?.images,
      gallery: product?.gallery,
      image: product?.image,
      image1: product?.image1,
    });

    // images alanı - string veya array olabilir
    if (product?.images) {
      try {
        let imagesArray = product.images;
        
        // Eğer string ise JSON parse et
        if (typeof product.images === 'string') {
          imagesArray = JSON.parse(product.images);
          console.log('📦 images JSON parse edildi:', imagesArray);
        }
        
        // Array ise işle
        if (Array.isArray(imagesArray)) {
          imagesArray.forEach((img) => {
            const url = typeof img === 'string' ? img : (img?.url || img?.image || img?.src);
            add(url);
          });
        }
      } catch (error) {
        console.error('❌ images parse hatası:', error);
        // Parse edilemezse string olarak ekle
        if (typeof product.images === 'string' && product.images.startsWith('http')) {
          add(product.images);
        }
      }
    }

    // gallery alanı - string veya array olabilir
    if (product?.gallery) {
      try {
        let galleryArray = product.gallery;
        
        // Eğer string ise JSON parse et
        if (typeof product.gallery === 'string') {
          galleryArray = JSON.parse(product.gallery);
          console.log('📦 gallery JSON parse edildi:', galleryArray);
        }
        
        // Array ise işle
        if (Array.isArray(galleryArray)) {
          galleryArray.forEach((img) => {
            const url = typeof img === 'string' ? img : (img?.url || img?.image || img?.src);
            add(url);
          });
        }
      } catch (error) {
        console.error('❌ gallery parse hatası:', error);
        // Parse edilemezse string olarak ekle
        if (typeof product.gallery === 'string' && product.gallery.startsWith('http')) {
          add(product.gallery);
        }
      }
    }

    // Tekil alanlar
    add(product?.image);
    add(product?.image1);
    add(product?.image2);
    add(product?.image3);
    add(product?.image4);
    add(product?.image5);
    add(product?.imageUrl);
    add(product?.thumbnail);

    console.log('✅ İşlenmiş görsel listesi:', list);

    if (list.length === 0) {
      console.warn('⚠️ Ürün görseli bulunamadı, placeholder kullanılıyor');
      add('https://via.placeholder.com/400?text=Ürün+Görseli');
    }
    
    return list;
  }, [product]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState([]);
  const [reviews, setReviews] = useState([
    { id: 1, userName: 'Ayşe D.', rating: 5, comment: 'Bu sırt çantasına bayıldım! Karadeniz\'de 3 günlük yürüyüşte kullandım ve mükemmel dayanıklılık gösterdi. Su geçirmezlik gerçekten işe yarıyor.', date: '2 gün önce', images: ['https://picsum.photos/200/200?random=1'] },
    { id: 2, userName: 'Mehmet K.', rating: 4, comment: 'Kaliteli bir ürün. Fiyat/performans açısından çok iyi. Tek eksi yanı biraz ağır olması.', date: '1 hafta önce', images: [] },
    { id: 3, userName: 'Zeynep A.', rating: 5, comment: 'Harika bir çanta! Tüm outdoor ihtiyaçlarım için mükemmel. Kesinlikle tavsiye ederim.', date: '2 hafta önce', images: ['https://picsum.photos/200/200?random=2', 'https://picsum.photos/200/200?random=3'] }
  ]);

  // Soru-Cevap state'leri
  const [questions, setQuestions] = useState([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  
  const displayImage = productImages[currentImageIndex] || 'https://via.placeholder.com/400';

  const hasStock = product?.stock === undefined ? true : product.stock > 0;
  const maxQty = product?.stock && product.stock > 0 ? product.stock : 99;
  const priceValue = parseFloat(product?.discountPrice || product?.price || 0);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header - Scrollable */}
        <View style={styles.headerScrollable}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.headerButton, styles.compareButton]} onPress={handleAddToCompare}>
              <Ionicons name="git-compare-outline" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerButton, styles.aiButton]} onPress={handleAIAssistant}>
              <Ionicons name="sparkles" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerButton, styles.arButton]} 
              onPress={handleARView}
            >
              <Ionicons name="cube-outline" size={24} color={COLORS.white} />
              {(product?.model3D || product?.arModel || product?.glbModel) && (
                <View style={styles.arBadge} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => setIsFavorite(!isFavorite)}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Product Image */}
        <TouchableOpacity 
          style={styles.imageContainer}
          onPress={() => handleImagePress(currentImageIndex)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: displayImage }}
            style={styles.productImage}
            resizeMode="cover"
            defaultSource={require('../../assets/icon.png')}
            onError={(error) => {
              console.log('Görsel yükleme hatası:', displayImage, error.nativeEvent.error);
            }}
          />
          <View style={styles.zoomIndicator}>
            <Ionicons name="expand-outline" size={20} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        {/* Pagination */}
        {productImages.length > 1 && (
          <View style={styles.paginationContainer}>
            <View style={styles.pagination}>
              {productImages.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentImageIndex(index)}
                >
                  <View
                    style={[
                      styles.paginationDot,
                      currentImageIndex === index && styles.paginationDotActive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Image Gallery Thumbnails */}
        {productImages.length > 1 && (
          <View style={styles.galleryContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryContent}
            >
              {productImages.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentImageIndex(index)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.thumbnailContainer,
                      currentImageIndex === index && styles.thumbnailContainerActive,
                    ]}
                  >
                    <Image
                      source={{ uri: image }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                      defaultSource={require('../../assets/icon.png')}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Title & Price */}
          <View style={styles.titleSection}>
            <Text style={styles.category}>{product.category || 'Ürün'}</Text>
            <Text style={styles.productName}>{product.name}</Text>
            
            {/* Live Viewers Badge */}
            <View style={styles.liveViewersContainer}>
              <View style={styles.liveViewersBadge}>
                <View style={styles.liveIndicator} />
                <Ionicons name="eye-outline" size={16} color={COLORS.error} />
                <Text style={styles.liveViewersText}>
                  Şu anda <Text style={styles.liveViewersCount}>{liveViewers} kişi</Text> bu ürünü inceliyor
                </Text>
              </View>
            </View>
            
            {/* Stok Kodu */}
            {(product.sku || product.stockCode || product.barkod) && (
              <View style={styles.skuContainer}>
                <Ionicons name="barcode-outline" size={16} color={COLORS.gray500} />
                <Text style={styles.skuText}>
                  Stok Kodu: {product.sku || product.stockCode || product.barkod}
                </Text>
              </View>
            )}
            
            <View style={styles.priceRow}>
              <Text style={styles.price}>
                {priceValue.toFixed(2)} ₺
              </Text>
              {product.rating && product.rating > 0 && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={18} color="#FFA500" />
                  <Text style={styles.rating}>{parseFloat(product.rating).toFixed(1)}</Text>
                  <Text style={styles.reviews}>
                    ({product.reviewCount || 0} Değerlendirme)
                  </Text>
                </View>
              )}
            </View>
            {product.stock !== undefined && (
              <Text style={[styles.stockText, product.stock > 0 ? styles.inStock : styles.outOfStock]}>
                {product.stock > 0 ? `Stokta ${product.stock} adet` : 'Stokta yok'}
              </Text>
            )}
          </View>

          {/* Color Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Renk</Text>
            <View style={styles.colorsContainer}>
              {COLORS_OPTIONS.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === index && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(index)}
                />
              ))}
            </View>
          </View>

          {/* Size Selection */}
          {sizeOptions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Boyut</Text>
                <TouchableOpacity>
                  <Text style={styles.sizeGuide}>Boyut Rehberi</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sizesContainer}>
                {sizeOptions.map((size, index) => {
                  const sizeValue = size.value || size;
                  const isOutOfStock = size.stock !== undefined && size.stock <= 0;
                  
                  return (
                    <TouchableOpacity
                      key={size.id || index}
                      style={[
                        styles.sizeOption,
                        selectedSize === index && styles.sizeOptionSelected,
                        isOutOfStock && styles.sizeOptionDisabled,
                      ]}
                      onPress={() => !isOutOfStock && setSelectedSize(index)}
                      activeOpacity={0.85}
                      disabled={isOutOfStock}
                    >
                      <Text
                        style={[
                          styles.sizeText,
                          selectedSize === index && styles.sizeTextSelected,
                          isOutOfStock && styles.sizeTextDisabled,
                        ]}
                      >
                        {sizeValue}
                      </Text>
                      {isOutOfStock && (
                        <View style={styles.outOfStockLine} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Specs */}
          <View style={styles.specsContainer}>
            <View style={styles.specCard}>
              <View style={styles.specIcon}>
                <Ionicons name="scale-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.specLabel}>Ağırlık</Text>
              <Text style={styles.specValue}>1.2 kg</Text>
            </View>
            <View style={styles.specCard}>
              <View style={styles.specIcon}>
                <Ionicons name="water-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.specLabel}>Su Geçirmez</Text>
              <Text style={styles.specValue}>IPX5</Text>
            </View>
            <View style={styles.specCard}>
              <View style={styles.specIcon}>
                <Ionicons name="layers-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.specLabel}>Malzeme</Text>
              <Text style={styles.specValue}>Naylon</Text>
            </View>
          </View>

          {/* Description */}
          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Açıklama</Text>
              <Text style={styles.description}>
                {product.description}
              </Text>
            </View>
          )}

          {/* Product Questions Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Soru & Cevap ({questions.length})</Text>
            </View>

            {/* Ask Question Button */}
            <TouchableOpacity 
              style={styles.askQuestionButton}
              onPress={() => setShowQuestionModal(true)}
            >
              <Ionicons name="help-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.askQuestionText}>Ürün Hakkında Soru Sor</Text>
            </TouchableOpacity>

            {/* Questions List */}
            {loadingQuestions ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Sorular yükleniyor...</Text>
              </View>
            ) : questions.length > 0 ? (
              questions.slice(0, 3).map((question) => (
                <View key={question.id || question._id} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <View style={styles.questionUser}>
                      <Ionicons name="person-circle-outline" size={32} color={COLORS.gray400} />
                      <View style={styles.questionUserInfo}>
                        <Text style={styles.questionUserName}>
                          {question.userName || question.user?.name || 'Kullanıcı'}
                        </Text>
                        <Text style={styles.questionDate}>
                          {question.createdAt ? new Date(question.createdAt).toLocaleDateString('tr-TR') : 'Yakın zamanda'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.questionContent}>
                    <View style={styles.questionBadge}>
                      <Ionicons name="help-circle" size={16} color={COLORS.primary} />
                      <Text style={styles.questionBadgeText}>SORU</Text>
                    </View>
                    <Text style={styles.questionText}>{question.question}</Text>
                  </View>

                  {question.answer && (
                    <View style={styles.answerContent}>
                      <View style={styles.answerBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                        <Text style={styles.answerBadgeText}>CEVAP</Text>
                      </View>
                      <Text style={styles.answerText}>{question.answer}</Text>
                      {question.answeredBy && (
                        <Text style={styles.answeredBy}>
                          - {question.answeredBy === 'seller' ? 'Satıcı' : question.answeredBy}
                        </Text>
                      )}
                    </View>
                  )}

                  {!question.answer && (
                    <View style={styles.waitingAnswer}>
                      <Ionicons name="time-outline" size={16} color={COLORS.gray400} />
                      <Text style={styles.waitingAnswerText}>Cevap bekleniyor...</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyQuestionsContainer}>
                <Ionicons name="chatbubble-outline" size={48} color={COLORS.gray300} />
                <Text style={styles.emptyQuestionsText}>Henüz soru sorulmamış</Text>
                <Text style={styles.emptyQuestionsSubtext}>İlk soruyu siz sorun!</Text>
              </View>
            )}

            {questions.length > 3 && (
              <TouchableOpacity style={styles.seeAllQuestionsButton}>
                <Text style={styles.seeAllQuestionsText}>Tüm Soruları Gör ({questions.length})</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Reviews Preview */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Değerlendirmeler ({reviews.length})</Text>
            </View>

            {/* Add Review Button */}
            <TouchableOpacity 
              style={styles.addReviewButton}
              onPress={() => setShowReviewModal(true)}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              <Text style={styles.addReviewText}>Yorum Yap</Text>
            </TouchableOpacity>

            {/* Reviews List */}
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewUser}>
                    <View style={styles.reviewAvatar}>
                      <Ionicons name="person" size={20} color={COLORS.gray400} />
                    </View>
                    <View>
                      <Text style={styles.reviewName}>{review.userName}</Text>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons 
                            key={star} 
                            name={star <= review.rating ? "star" : "star-outline"} 
                            size={12} 
                            color="#FFA500" 
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
                <Text style={styles.reviewText}>{review.comment}</Text>
                {review.images && review.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesContainer}>
                    {review.images.map((img, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          setReviewImageViewerImages(review.images);
                          setReviewImageViewerIndex(idx);
                          setShowReviewImageViewer(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: img }} style={styles.reviewImage} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            ))}
          </View>

          {/* Product Recommendations */}
          <ProductRecommendations 
            currentProduct={product}
            maxItems={6}
            onProductPress={(recommendedProduct) => {
              // Yeni ürün detayına git
              navigation.push('ProductDetail', { product: recommendedProduct });
            }}
          />
        </View>
      </ScrollView>

      {/* Chatbot Floating Button */}
      {!showChatbot && (
        <TouchableOpacity 
          style={styles.chatbotButton}
          onPress={handleChatbotOpen}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}

      {/* Chatbot Modal */}
      <Modal
        visible={showChatbot}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowChatbot(false)}
      >
        <SafeAreaView style={styles.chatbotContainer} edges={['top', 'bottom']}>
          {/* Chatbot Header */}
          <View style={styles.chatbotHeader}>
            <TouchableOpacity onPress={() => setShowChatbot(false)}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
            </TouchableOpacity>
            <View style={styles.chatbotHeaderInfo}>
              <Text style={styles.chatbotHeaderTitle}>Huğlu AI</Text>
              <View style={styles.chatbotOnlineStatus}>
                <View style={styles.chatbotOnlineDot} />
                <Text style={styles.chatbotOnlineText}>Online</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Ionicons name="ellipsis-vertical" size={24} color={COLORS.textMain} />
            </TouchableOpacity>
          </View>

          {/* Chat Messages */}
          <ScrollView 
            style={styles.chatbotMessages}
            contentContainerStyle={styles.chatbotMessagesContent}
          >
            {chatMessages.map((message) => (
              <View key={message.id} style={styles.chatbotMessageWrapper}>
                {message.type === 'bot' && (
                  <View style={styles.chatbotBotHeader}>
                    <View style={styles.chatbotAvatar}>
                      <Ionicons name="chatbubbles" size={16} color={COLORS.primary} />
                    </View>
                    <Text style={styles.chatbotMessageLabel}>Huğlu AI</Text>
                  </View>
                )}
                <View style={[
                  styles.chatbotMessage,
                  message.type === 'user' ? styles.chatbotMessageUser : styles.chatbotMessageBot
                ]}>
                  <Text style={[
                    styles.chatbotMessageText,
                    message.type === 'user' && styles.chatbotMessageTextUser
                  ]}>
                    {message.text}
                  </Text>
                  
                  {/* Quick Order Button */}
                  {message.messageType === 'quick-order' && message.action === 'add-to-cart' && (
                    <TouchableOpacity 
                      style={styles.quickOrderButton}
                      onPress={handleQuickOrder}
                    >
                      <Ionicons name="cart" size={18} color={COLORS.white} />
                      <Text style={styles.quickOrderButtonText}>Sepete Ekle ve Devam Et</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {message.type === 'user' && (
                  <Text style={styles.chatbotMessageTime}>
                    Read {message.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
            ))}
            
            {/* Typing Indicator */}
            {botTyping && (
              <View style={styles.chatbotMessageWrapper}>
                <View style={styles.chatbotBotHeader}>
                  <View style={styles.chatbotAvatar}>
                    <Ionicons name="chatbubbles" size={16} color={COLORS.primary} />
                  </View>
                  <Text style={styles.chatbotMessageLabel}>Huğlu AI</Text>
                </View>
                <View style={[styles.chatbotMessage, styles.chatbotMessageBot]}>
                  <View style={styles.typingIndicator}>
                    <View style={[styles.typingDot, styles.typingDot1]} />
                    <View style={[styles.typingDot, styles.typingDot2]} />
                    <View style={[styles.typingDot, styles.typingDot3]} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick Actions */}
          <View style={styles.chatbotQuickActions}>
            <TouchableOpacity 
              style={[styles.chatbotQuickAction, styles.chatbotQuickActionPrimary]}
              onPress={() => handleQuickAction('Sipariş ver')}
            >
              <Ionicons name="cart" size={14} color={COLORS.primary} />
              <Text style={[styles.chatbotQuickActionText, styles.chatbotQuickActionTextPrimary]}>Hızlı Sipariş</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.chatbotQuickAction}
              onPress={() => handleQuickAction('Beden bilgisi')}
            >
              <Text style={styles.chatbotQuickActionText}>Beden bilgisi</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.chatbotQuickAction}
              onPress={() => handleQuickAction('Fiyat')}
            >
              <Text style={styles.chatbotQuickActionText}>Fiyat</Text>
            </TouchableOpacity>
          </View>

          {/* Chat Input */}
          <View style={styles.chatbotInputContainer}>
            <TouchableOpacity style={styles.chatbotAttachButton}>
              <Ionicons name="add-circle-outline" size={28} color={COLORS.gray400} />
            </TouchableOpacity>
            <TextInput
              style={styles.chatbotInput}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.gray400}
              value={chatInput}
              onChangeText={setChatInput}
              multiline
            />
            <TouchableOpacity style={styles.chatbotVoiceButton}>
              <Ionicons name="mic-outline" size={24} color={COLORS.gray400} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.chatbotSendButton}
              onPress={handleSendMessage}
            >
              <Ionicons name="send" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Bottom Bar */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <View style={styles.bottomContent}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={!hasStock}
            >
              <Ionicons name="remove" size={20} color={COLORS.textMain} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.min(maxQty, quantity + 1))}
              disabled={!hasStock}
            >
              <Ionicons name="add" size={20} color={COLORS.textMain} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              (!hasStock) && styles.addToCartButtonDisabled
            ]}
            onPress={handleAddToCart}
            disabled={!hasStock || addingCart}
          >
            <Ionicons name="cart-outline" size={20} color={COLORS.white} />
            <Text style={styles.addToCartText}>
              {hasStock ? (addingCart ? 'Ekleniyor...' : 'Sepete Ekle') : 'Stokta Yok'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Question Modal */}
      <Modal
        visible={showQuestionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuestionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.questionModalContent}>
            <View style={styles.questionModalHeader}>
              <Text style={styles.questionModalTitle}>Ürün Hakkında Soru Sor</Text>
              <TouchableOpacity onPress={() => setShowQuestionModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <View style={styles.questionModalInfo}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.questionModalInfoText}>
                Ürün hakkında merak ettiklerinizi sorun. Satıcı en kısa sürede yanıtlayacaktır.
              </Text>
            </View>

            {/* Question Input */}
            <View style={styles.questionInputContainer}>
              <Text style={styles.questionInputLabel}>Sorunuz</Text>
              <TextInput
                style={styles.questionInput}
                placeholder="Örn: Bu ürünün boyutları nedir?"
                placeholderTextColor={COLORS.gray400}
                multiline
                numberOfLines={6}
                value={newQuestion}
                onChangeText={setNewQuestion}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.characterCount}>{newQuestion.length}/500</Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitQuestionButton, submittingQuestion && styles.submitQuestionButtonDisabled]}
              onPress={handleSubmitQuestion}
              disabled={submittingQuestion || !newQuestion.trim()}
            >
              <Ionicons name="send" size={20} color={COLORS.white} />
              <Text style={styles.submitQuestionText}>
                {submittingQuestion ? 'Gönderiliyor...' : 'Soruyu Gönder'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reviewModalContent}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>Ürünü Değerlendir</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            {/* Rating Stars */}
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Puanınız</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setNewReviewRating(star)}
                  >
                    <Ionicons
                      name={star <= newReviewRating ? "star" : "star-outline"}
                      size={32}
                      color="#FFA500"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Comment Input */}
            <View style={styles.commentContainer}>
              <Text style={styles.commentLabel}>Yorumunuz</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Ürün hakkındaki düşüncelerinizi paylaşın..."
                placeholderTextColor={COLORS.gray400}
                multiline
                numberOfLines={6}
                value={newReviewComment}
                onChangeText={setNewReviewComment}
                textAlignVertical="top"
              />
            </View>

            {/* Image Upload */}
            <View style={styles.imageUploadContainer}>
              <Text style={styles.imageUploadLabel}>Fotoğraflar (Opsiyonel)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageUploadScroll}>
                {reviewImages.map((img, index) => (
                  <View key={index} style={styles.uploadedImageContainer}>
                    <Image source={{ uri: img }} style={styles.uploadedImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                {reviewImages.length < 5 && (
                  <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                    <Ionicons name="camera-outline" size={32} color={COLORS.gray400} />
                    <Text style={styles.addImageText}>Fotoğraf Ekle</Text>
                    <Text style={styles.addImageSubtext}>({reviewImages.length}/5)</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitReviewButton}
              onPress={handleSubmitReview}
            >
              <Text style={styles.submitReviewText}>Yorumu Gönder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AR Viewer Modal */}
      <Modal
        visible={showARViewer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowARViewer(false)}
      >
        <View style={styles.arViewerContainer}>
          <SafeAreaView style={styles.arViewerSafeArea} edges={['top']}>
            <View style={styles.arViewerHeader}>
              <TouchableOpacity
                style={styles.arViewerCloseButton}
                onPress={() => setShowARViewer(false)}
              >
                <Ionicons name="close" size={28} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.arViewerTitle}>AR Görünümü</Text>
              <View style={{ width: 44 }} />
            </View>
          </SafeAreaView>

          <View style={styles.arViewerContent}>
            <View style={styles.arPlaceholder}>
              <Ionicons name="cube" size={80} color={COLORS.primary} />
              <Text style={styles.arPlaceholderTitle}>3D Model Yükleniyor...</Text>
              <Text style={styles.arPlaceholderText}>
                Ürünü gerçek ortamınızda görmek için kameranızı kullanın
              </Text>
            </View>

            {/* AR Controls */}
            <View style={styles.arControls}>
              <TouchableOpacity style={styles.arControlButton}>
                <Ionicons name="refresh" size={24} color={COLORS.white} />
                <Text style={styles.arControlText}>Sıfırla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.arControlButton}>
                <Ionicons name="resize" size={24} color={COLORS.white} />
                <Text style={styles.arControlText}>Boyut</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.arControlButton}>
                <Ionicons name="sync" size={24} color={COLORS.white} />
                <Text style={styles.arControlText}>Döndür</Text>
              </TouchableOpacity>
            </View>

            {/* AR Instructions */}
            <View style={styles.arInstructions}>
              <View style={styles.arInstructionItem}>
                <Ionicons name="hand-left-outline" size={20} color={COLORS.white} />
                <Text style={styles.arInstructionText}>Sürükle: Taşı</Text>
              </View>
              <View style={styles.arInstructionItem}>
                <Ionicons name="expand-outline" size={20} color={COLORS.white} />
                <Text style={styles.arInstructionText}>Pinch: Boyutlandır</Text>
              </View>
              <View style={styles.arInstructionItem}>
                <Ionicons name="sync-outline" size={20} color={COLORS.white} />
                <Text style={styles.arInstructionText}>İki parmak: Döndür</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
      >
        <View style={styles.imageViewerContainer}>
          <SafeAreaView style={styles.imageViewerSafeArea} edges={['top']}>
            <View style={styles.imageViewerHeader}>
              <TouchableOpacity
                style={styles.imageViewerCloseButton}
                onPress={() => setShowImageViewer(false)}
              >
                <Ionicons name="close" size={28} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.imageViewerCounter}>
                {imageViewerIndex + 1} / {productImages.length}
              </Text>
            </View>
          </SafeAreaView>

          <View style={styles.imageViewerContent}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                setImageViewerIndex(index);
              }}
              contentOffset={{ x: imageViewerIndex * width, y: 0 }}
            >
              {productImages.map((image, index) => (
                <View key={index} style={styles.imageViewerSlide}>
                  <Image
                    source={{ uri: image }}
                    style={styles.imageViewerImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          </View>

          {productImages.length > 1 && (
            <View style={styles.imageViewerPagination}>
              {productImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.imageViewerDot,
                    imageViewerIndex === index && styles.imageViewerDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>

      {/* Review Image Viewer Modal */}
      <Modal
        visible={showReviewImageViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReviewImageViewer(false)}
      >
        <View style={styles.imageViewerContainer}>
          <SafeAreaView style={styles.imageViewerSafeArea} edges={['top']}>
            <View style={styles.imageViewerHeader}>
              <TouchableOpacity
                style={styles.imageViewerCloseButton}
                onPress={() => setShowReviewImageViewer(false)}
              >
                <Ionicons name="close" size={28} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.imageViewerCounter}>
                {reviewImageViewerIndex + 1} / {reviewImageViewerImages.length}
              </Text>
              <View style={styles.imageViewerBadge}>
                <Ionicons name="chatbox" size={16} color={COLORS.white} />
                <Text style={styles.imageViewerBadgeText}>Yorum</Text>
              </View>
            </View>
          </SafeAreaView>

          <View style={styles.imageViewerContent}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                setReviewImageViewerIndex(index);
              }}
              contentOffset={{ x: reviewImageViewerIndex * width, y: 0 }}
            >
              {reviewImageViewerImages.map((image, index) => (
                <View key={index} style={styles.imageViewerSlide}>
                  <Image
                    source={{ uri: image }}
                    style={styles.imageViewerImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          </View>

          {reviewImageViewerImages.length > 1 && (
            <View style={styles.imageViewerPagination}>
              {reviewImageViewerImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.imageViewerDot,
                    reviewImageViewerIndex === index && styles.imageViewerDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>

      {/* AI Assistant Modal */}
      <CustomModal
        visible={showAIModal}
        onClose={() => setShowAIModal(false)}
        title="AI Asistan"
        subtitle="Size nasıl yardımcı olabilirim?"
        icon="sparkles"
        iconColor={COLORS.primary}
        actionButton
        actionButtonText="Kapat"
        onActionPress={() => setShowAIModal(false)}
        scrollable={false}
      >
        <ModalOption
          icon="information-circle"
          iconColor={COLORS.primary}
          title="Ürün Özellikleri"
          description="Detaylı ürün bilgilerini görün"
          onPress={() => handleAIOption('features')}
        />
        <ModalOption
          icon="grid"
          iconColor={COLORS.primary}
          title="Benzer Ürünler"
          description="Size özel öneriler"
          onPress={() => handleAIOption('similar')}
        />
        <ModalOption
          icon="bulb"
          iconColor={COLORS.primary}
          title="Kullanım Önerileri"
          description="Ürünü en iyi şekilde kullanın"
          onPress={() => handleAIOption('tips')}
        />
      </CustomModal>

      {/* Add to Cart Success Modal */}
      <AddToCartSuccessModal
        visible={showAddToCartSuccessModal}
        onClose={() => setShowAddToCartSuccessModal(false)}
        onContinueShopping={() => {
          setShowAddToCartSuccessModal(false);
        }}
        onGoToCart={() => {
          setShowAddToCartSuccessModal(false);
          navigation.navigate('Cart');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  headerScrollable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compareButton: {
    backgroundColor: 'rgba(128, 128, 128, 0.9)',
    shadowColor: '#808080',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  aiButton: {
    backgroundColor: 'rgba(128, 128, 128, 0.9)',
    shadowColor: '#808080',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  arButton: {
    backgroundColor: 'rgba(128, 128, 128, 0.9)',
    shadowColor: '#808080',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    position: 'relative',
  },
  arBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    width: width,
    height: 450,
    backgroundColor: COLORS.gray200,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  galleryContainer: {
    backgroundColor: COLORS.backgroundLight,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  galleryContent: {
    gap: 12,
    paddingHorizontal: 8,
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailContainerActive: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  content: {
    backgroundColor: COLORS.backgroundLight,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  titleSection: {
    marginBottom: 24,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  productName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 12,
    lineHeight: 32,
  },
  liveViewersContainer: {
    marginBottom: 12,
  },
  liveViewersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    alignSelf: 'flex-start',
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  liveViewersText: {
    fontSize: 13,
    color: COLORS.gray700,
    fontWeight: '500',
  },
  liveViewersCount: {
    fontWeight: '700',
    color: COLORS.error,
  },
  skuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  skuText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  inStock: {
    color: COLORS.primary,
  },
  outOfStock: {
    color: COLORS.error,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  reviews: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  sizeGuide: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  colorsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    transform: [{ scale: 1.1 }],
  },
  sizesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  sizeOption: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  sizeTextSelected: {
    color: COLORS.primary,
  },
  sizeOptionDisabled: {
    backgroundColor: COLORS.gray100,
    opacity: 0.5,
  },
  sizeTextDisabled: {
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
  },
  outOfStockLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: COLORS.gray400,
    transform: [{ rotate: '-15deg' }],
  },
  specsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  specCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  specIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  specLabel: {
    fontSize: 10,
    color: COLORS.gray500,
    marginBottom: 4,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.gray600,
  },
  readMore: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.gray600,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  bottomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray100,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    minWidth: 20,
    textAlign: 'center',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addToCartButtonDisabled: {
    backgroundColor: COLORS.gray300,
    shadowOpacity: 0,
    elevation: 0,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 16,
  },
  addReviewText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reviewModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  reviewModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  ratingContainer: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 8,
  },
  commentContainer: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: 16,
    fontSize: 15,
    color: COLORS.textMain,
    minHeight: 120,
  },
  submitReviewButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitReviewText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  reviewImagesContainer: {
    marginTop: 12,
    flexDirection: 'row',
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  imageUploadContainer: {
    marginBottom: 24,
  },
  imageUploadLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  imageUploadScroll: {
    flexDirection: 'row',
  },
  uploadedImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  uploadedImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
  },
  addImageText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray500,
    marginTop: 4,
  },
  addImageSubtext: {
    fontSize: 10,
    color: COLORS.gray400,
    marginTop: 2,
  },
  zoomIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageViewerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  imageViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  imageViewerCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCounter: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  imageViewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageViewerBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  imageViewerContent: {
    flex: 1,
  },
  imageViewerSlide: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: width,
    height: '100%',
  },
  imageViewerPagination: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  imageViewerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  imageViewerDotActive: {
    width: 24,
    backgroundColor: COLORS.white,
  },
  arViewerContainer: {
    flex: 1,
    backgroundColor: COLORS.textMain,
  },
  arViewerSafeArea: {
    zIndex: 10,
  },
  arViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  arViewerCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arViewerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  arViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arPlaceholder: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  arPlaceholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 24,
    marginBottom: 12,
  },
  arPlaceholderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  arControls: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  arControlButton: {
    alignItems: 'center',
    gap: 8,
  },
  arControlText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  arInstructions: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
  },
  arInstructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  arInstructionText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Question Styles
  askQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginBottom: 16,
  },
  askQuestionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
  },
  questionCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  questionUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questionUserInfo: {
    flex: 1,
  },
  questionUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  questionDate: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  questionContent: {
    marginBottom: 12,
  },
  questionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  questionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3b82f6',
  },
  questionText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMain,
    fontWeight: '500',
  },
  answerContent: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  answerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  answerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  answerText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.gray600,
    marginBottom: 6,
  },
  answeredBy: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.gray500,
  },
  waitingAnswer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  waitingAnswerText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: COLORS.gray400,
  },
  emptyQuestionsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyQuestionsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray500,
    marginTop: 12,
  },
  emptyQuestionsSubtext: {
    fontSize: 14,
    color: COLORS.gray400,
    marginTop: 4,
  },
  seeAllQuestionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  seeAllQuestionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray400,
  },
  questionModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  questionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  questionModalInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  questionModalInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.gray600,
  },
  questionInputContainer: {
    marginBottom: 20,
  },
  questionInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  questionInput: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: 16,
    fontSize: 15,
    color: COLORS.textMain,
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.gray400,
    textAlign: 'right',
    marginTop: 6,
  },
  submitQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitQuestionButtonDisabled: {
    backgroundColor: COLORS.gray300,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitQuestionText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Chatbot Styles
  chatbotButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  chatbotContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  chatbotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  chatbotHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  chatbotHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  chatbotOnlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  chatbotOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  chatbotOnlineText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  chatbotMessages: {
    flex: 1,
  },
  chatbotMessagesContent: {
    padding: 16,
  },
  chatbotMessageWrapper: {
    marginBottom: 16,
  },
  chatbotBotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  chatbotAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatbotMessageLabel: {
    fontSize: 12,
    color: COLORS.gray400,
    fontWeight: '600',
  },
  chatbotMessage: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  chatbotMessageBot: {
    backgroundColor: COLORS.white,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  chatbotMessageUser: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  chatbotMessageText: {
    fontSize: 14,
    color: COLORS.textMain,
    lineHeight: 20,
  },
  chatbotMessageTextUser: {
    color: COLORS.white,
  },
  chatbotMessageTime: {
    fontSize: 11,
    color: COLORS.gray400,
    textAlign: 'right',
    marginTop: 4,
  },
  chatbotQuickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  chatbotQuickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.white,
  },
  chatbotQuickActionPrimary: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: COLORS.primary,
  },
  chatbotQuickActionText: {
    fontSize: 13,
    color: COLORS.textMain,
    fontWeight: '500',
  },
  chatbotQuickActionTextPrimary: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  quickOrderButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  chatbotInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  chatbotAttachButton: {
    padding: 4,
  },
  chatbotInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textMain,
    maxHeight: 100,
  },
  chatbotVoiceButton: {
    padding: 4,
  },
  chatbotSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray400,
  },
  typingDot1: {
    animation: 'typing 1.4s infinite',
  },
  typingDot2: {
    animation: 'typing 1.4s infinite 0.2s',
  },
  typingDot3: {
    animation: 'typing 1.4s infinite 0.4s',
  },

});
