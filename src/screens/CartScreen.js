import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { cartAPI } from '../services/api';
import { COLORS } from '../constants/colors';
import { updateCartBadge } from '../utils/cartBadge';
import analytics from '../services/analytics';

export default function CartScreen({ navigation }) {
  const [cartItems, setCartItems] = useState([]);
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadCart();
  }, []);

  // Sayfa her açıldığında sepeti yeniden yükle (sipariş sonrası temizlenmiş sepeti göstermek için)
  useFocusEffect(
    React.useCallback(() => {
      loadCart();
    }, [])
  );

  const loadCart = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem('userId');
      
      if (!storedUserId) {
        // Giriş yapılmamış - boş sepet göster
        setUserId(null);
        setCartItems([]);
        setLoading(false);
        return;
      }

      const now = Date.now();
      
      // Cache kontrolü - eğer sipariş sonrası sepet temizlendiyse veya değişiklik yapıldıysa cache'i bypass et
      let shouldBypassCache = forceRefresh;
      
      if (!forceRefresh) {
        const cartLastCleared = await AsyncStorage.getItem('cartLastCleared');
        const cartLastModified = await AsyncStorage.getItem('cartLastModified');
        const cacheTimestamp = cartLastCleared ? parseInt(cartLastCleared) : 0;
        const modifiedTimestamp = cartLastModified ? parseInt(cartLastModified) : 0;
        
        // Cache süresi: 1 dakika (60 saniye)
        const CACHE_DURATION = 60 * 1000; // 1 dakika
        
        // Eğer son 1 dakika içinde sepet temizlendiyse veya değiştirildiyse cache'i bypass et
        shouldBypassCache = 
          (cacheTimestamp > 0 && (now - cacheTimestamp) < CACHE_DURATION) ||
          (modifiedTimestamp > 0 && (now - modifiedTimestamp) < CACHE_DURATION);
      }

      setUserId(storedUserId);
      
      // Cache'i bypass etmek için timestamp query parametresi ekle
      let response;
      if (shouldBypassCache) {
        // Cache bypass için timestamp ile API çağrısı yap
        const { getApiUrl } = require('../config/api.config');
        const apiBaseUrl = getApiUrl();
        const apiUrl = `${apiBaseUrl}/cart/${storedUserId}?t=${now}`;
        const fetchResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await fetchResponse.json();
        response = { data };
        console.log('🔄 Cache bypass ile sepet yüklendi (forceRefresh:', forceRefresh, ')');
      } else {
        // Normal API çağrısı (cache kullanılabilir)
        response = await cartAPI.get(storedUserId);
        console.log('📦 Normal sepet yüklendi (cache kullanıldı)');
      }
      
      console.log('Sepet API yanıtı:', response.data);

      if (response.data?.success) {
        // Backend'den gelen cart items'ı formatla
        const cartData = response.data.cart || response.data.data || [];
        
        if (!Array.isArray(cartData)) {
          console.warn('Cart data array değil:', cartData);
          setCartItems([]);
          return;
        }

        // Helper function to extract size from selectedVariations
        const extractSize = (selectedVariations) => {
          if (!selectedVariations) return 'Standart';
          
          // Parse if string
          let variations = selectedVariations;
          if (typeof selectedVariations === 'string') {
            try {
              variations = JSON.parse(selectedVariations);
            } catch (e) {
              console.warn('selectedVariations parse hatası:', e);
              return 'Standart';
            }
          }
          
          if (!variations || typeof variations !== 'object') return 'Standart';
          
          // Eski format: selectedVariations.size
          if (variations.size) {
            return variations.size;
          }
          
          // Yeni format: selectedVariations[variationId].value
          // Tüm key'leri kontrol et (variationId'ler)
          for (const key in variations) {
            if (variations[key] && typeof variations[key] === 'object' && variations[key].value) {
              return variations[key].value;
            }
          }
          
          return 'Standart';
        };

        // Helper function to extract color from selectedVariations
        const extractColor = (selectedVariations) => {
          if (!selectedVariations) return 'Varsayılan';
          
          // Parse if string
          let variations = selectedVariations;
          if (typeof selectedVariations === 'string') {
            try {
              variations = JSON.parse(selectedVariations);
            } catch (e) {
              return 'Varsayılan';
            }
          }
          
          if (!variations || typeof variations !== 'object') return 'Varsayılan';
          
          // Eski format: selectedVariations.color
          if (variations.color) {
            return variations.color;
          }
          
          return 'Varsayılan';
        };

        const formattedItems = cartData.map(item => {
          // Parse selectedVariations if it's a string
          let parsedVariations = item.selectedVariations;
          if (typeof item.selectedVariations === 'string') {
            try {
              parsedVariations = JSON.parse(item.selectedVariations);
            } catch (e) {
              console.warn('selectedVariations parse hatası:', e);
              parsedVariations = {};
            }
          }
          
          return {
            id: item.id || item.cartItemId,
            productId: item.productId,
            name: item.productName || item.name,
            price: parseFloat(item.price || 0),
            originalPrice: item.originalPrice ? parseFloat(item.originalPrice) : null,
            quantity: item.quantity || 1,
            image: item.productImage || item.image,
            size: extractSize(item.selectedVariations),
            color: extractColor(item.selectedVariations),
            selectedVariations: parsedVariations || {},
          };
        });
        
        console.log('Formatlanmış sepet:', formattedItems);
        setCartItems(formattedItems);
      } else {
        console.log('Sepet boş veya başarısız yanıt');
        setCartItems([]);
      }
    } catch (error) {
      console.error('Sepet yükleme hatası:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setCartItems([]);
      // Kullanıcıya hata gösterme - sessizce boş sepet göster
    } finally {
      setLoading(false);
    }
  };

  const FREE_SHIPPING_LIMIT = 600;
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_LIMIT - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_LIMIT) * 100);
  const hasFreeShipping = subtotal >= FREE_SHIPPING_LIMIT;
  
  const shipping = hasFreeShipping ? 0 : 30;
  const tax = 0;
  const total = subtotal + shipping + tax;

  const updateQuantity = async (cartItemId, productId, delta, selectedVariations) => {
    const item = cartItems.find(i => i.id === cartItemId);
    if (!item) return;

    const newQuantity = Math.max(1, item.quantity + delta);
    
    try {
      await cartAPI.update(cartItemId, newQuantity);
      
      // Sepet değişti - cache'i bypass etmek için timestamp güncelle
      await AsyncStorage.setItem('cartLastModified', Date.now().toString());
      
      // Sepeti backend'den yeniden yükle (cache bypass ile)
      await loadCart(true); // forceRefresh = true
      
      // Badge'i güncelle
      if (userId) {
        await updateCartBadge(userId);
      }
    } catch (error) {
      console.error('Miktar güncelleme hatası:', error);
      Alert.alert('Hata', 'Miktar güncellenirken bir hata oluştu');
    }
  };

  const removeItem = async (cartItemId, productId, selectedVariations) => {
    try {
      await cartAPI.remove(cartItemId);
      
      const removedItem = cartItems.find(item => item.id === cartItemId);
      
      // Sepet değişti - cache'i bypass etmek için timestamp güncelle
      await AsyncStorage.setItem('cartLastModified', Date.now().toString());
      
      // Sepeti backend'den yeniden yükle (cache bypass ile)
      await loadCart(true); // forceRefresh = true
      
      // Analytics: Remove from cart tracking
      if (removedItem) {
        try {
          await analytics.trackRemoveFromCart(productId, {
            productName: removedItem.name,
            quantity: removedItem.quantity,
            price: removedItem.price
          });
        } catch (analyticsError) {
          console.log('Analytics remove from cart error:', analyticsError);
        }
      }
      
      // Badge'i güncelle
      if (userId) {
        await updateCartBadge(userId);
      }
    } catch (error) {
      console.error('Ürün silme hatası:', error);
      Alert.alert('Hata', 'Ürün silinirken bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sepetim</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Sepet yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Giriş yapılmamış kullanıcı için özel görünüm
  if (!userId && cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sepetim</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.guestEmptyContainer}>
            <Ionicons name="cart-outline" size={80} color={COLORS.gray300} />
            <Text style={styles.emptyTitle}>Sepetiniz Boş</Text>
            <Text style={styles.emptyText}>
              Giriş yaparak alışverişe başlayın ve siparişlerinizi takip edin
            </Text>
          </View>

          {/* Login Prompt Card */}
          <View style={styles.loginPromptCard}>
            <View style={styles.loginPromptContent}>
              <View style={styles.loginPromptHeader}>
                <View style={styles.loginPromptIcon}>
                  <Ionicons name="person" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.loginPromptTextContainer}>
                  <Text style={styles.loginPromptTitle}>Daha Hızlı Alışveriş</Text>
                  <Text style={styles.loginPromptText}>
                    Giriş yapın veya kayıt olun, ödüller kazanın ve siparişlerinizi takip edin.
                  </Text>
                </View>
              </View>
              <View style={styles.loginPromptButtons}>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.loginButtonText}>Giriş Yap</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.signUpButton}
                  onPress={() => navigation.navigate('SignUp')}
                >
                  <Text style={styles.signUpButtonText}>Kayıt Ol</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Continue Shopping Button */}
          <View style={styles.continueShoppingContainer}>
            <TouchableOpacity
              style={styles.continueShoppingButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.continueShoppingText}>Alışverişe Devam Et</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sepetim</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>Sepetiniz Boş</Text>
          <Text style={styles.emptyText}>Alışverişe başlamak için ürünleri keşfedin</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.shopButtonText}>Alışverişe Başla</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sepetim</Text>
        <TouchableOpacity>
          <Text style={styles.editButton}>Düzenle</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            {hasFreeShipping ? (
              <>
                <Text style={styles.progressText}>🎉 Ücretsiz kargo kazandınız!</Text>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              </>
            ) : (
              <>
                <Text style={styles.progressText}>
                  Ücretsiz kargoya ₺{remainingForFreeShipping.toFixed(2)} kaldı
                </Text>
                <Ionicons name="car-outline" size={20} color={COLORS.primary} />
              </>
            )}
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${freeShippingProgress}%` },
                hasFreeShipping && styles.progressFillComplete
              ]} 
            />
          </View>
          {!hasFreeShipping && (
            <Text style={styles.progressHint}>
              ₺{FREE_SHIPPING_LIMIT} ve üzeri alışverişlerde kargo ücretsiz!
            </Text>
          )}
        </View>

        {/* Cart Items */}
        <View style={styles.itemsContainer}>
          {cartItems.map((item) => (
            <View key={item.id} style={styles.cartItem}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemDetails}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <TouchableOpacity onPress={() => removeItem(item.id, item.productId, item.selectedVariations)}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.gray400} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.itemVariant}>
                  Boyut: {item.size} • Renk: {item.color}
                </Text>
                <View style={styles.itemFooter}>
                  <View>
                    <Text style={styles.itemPrice}>₺{item.price.toFixed(2)}</Text>
                    {item.originalPrice && (
                      <Text style={styles.itemOriginalPrice}>₺{item.originalPrice.toFixed(2)}</Text>
                    )}
                  </View>
                  <View style={styles.quantityControl}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.id, item.productId, -1, item.selectedVariations)}
                    >
                      <Ionicons name="remove" size={18} color={COLORS.textMain} />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={[styles.quantityButton, styles.quantityButtonAdd]}
                      onPress={() => updateQuantity(item.id, item.productId, 1, item.selectedVariations)}
                    >
                      <Ionicons name="add" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Promo Code */}
        <View style={styles.promoSection}>
          <Text style={styles.promoLabel}>Promosyon Kodu</Text>
          <View style={styles.promoInput}>
            <Ionicons name="pricetag-outline" size={20} color={COLORS.gray400} />
            <TextInput
              style={styles.promoTextInput}
              placeholder="Kodu girin"
              placeholderTextColor={COLORS.gray400}
              value={promoCode}
              onChangeText={setPromoCode}
            />
            <TouchableOpacity style={styles.applyButton}>
              <Text style={styles.applyButtonText}>Uygula</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Sipariş Özeti</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ara Toplam</Text>
            <Text style={styles.summaryValue}>₺{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Kargo Ücreti</Text>
            {hasFreeShipping ? (
              <Text style={[styles.summaryValue, styles.freeShipping]}>Ücretsiz</Text>
            ) : (
              <Text style={styles.summaryValue}>₺{shipping.toFixed(2)}</Text>
            )}
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Vergi</Text>
            <Text style={styles.summaryValue}>₺{tax.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>Toplam</Text>
            <Text style={styles.summaryTotalValue}>₺{total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={async () => {
            // Analytics: Checkout start tracking
            try {
              await analytics.trackCheckoutStart({
                cartValue: total,
                itemCount: cartItems.length,
                subtotal: subtotal,
                shipping: shipping
              });
            } catch (analyticsError) {
              console.log('Analytics checkout start error:', analyticsError);
            }
            
            navigation.navigate('PaymentMethod', { 
              cartTotal: total,
              subtotal,
              shipping,
              hasFreeShipping 
            });
          }}
        >
          <Text style={styles.checkoutButtonText}>Ödemeye Geç</Text>
          <View style={styles.checkoutPrice}>
            <Text style={styles.checkoutPriceText}>₺{total.toFixed(2)}</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  guestEmptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  loginPromptCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  loginPromptContent: {
    gap: 16,
  },
  loginPromptHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  loginPromptIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPromptTextContainer: {
    flex: 1,
  },
  loginPromptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  loginPromptText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  loginPromptButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  loginButton: {
    flex: 1,
    backgroundColor: COLORS.textMain,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  signUpButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(13, 27, 15, 0.1)',
  },
  signUpButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  continueShoppingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  continueShoppingButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  continueShoppingText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  shopButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    textAlign: 'center',
  },
  editButton: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressSection: {
    padding: 24,
    gap: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(17, 212, 33, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  progressFillComplete: {
    backgroundColor: COLORS.success || COLORS.primary,
  },
  progressHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  itemsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  cartItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  itemVariant: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  itemOriginalPrice: {
    fontSize: 12,
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    padding: 4,
    gap: 12,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonAdd: {
    backgroundColor: COLORS.primary,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    minWidth: 16,
    textAlign: 'center',
  },
  promoSection: {
    padding: 24,
  },
  promoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  promoInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  promoTextInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textMain,
  },
  applyButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.gray600,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  freeShipping: {
    color: COLORS.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.gray200,
    marginVertical: 12,
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  bottomBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  checkoutPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkoutPriceText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
});
