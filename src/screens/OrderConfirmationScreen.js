import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../components/Button';
import { COLORS } from '../constants/colors';
import { cartAPI, ordersAPI, userLevelAPI, userAPI, walletAPI } from '../services/api';
import OrderSuccessModal from '../components/OrderSuccessModal';
import ErrorModal from '../components/ErrorModal';

export default function OrderConfirmationScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [total, setTotal] = useState(0);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  // Route'dan gelen parametreler
  const routeTotal = route?.params?.total;
  const routeSubtotal = route?.params?.subtotal;
  const routeShipping = route?.params?.shipping;
  const paymentMethod = route?.params?.paymentMethod;
  const routeShippingAddress = route?.params?.shippingAddress;

  useEffect(() => {
    loadOrderData();
    loadShippingAddress();
    loadCustomerInfo();
  }, []);

  // Sayfa her açıldığında adresi ve ödeme yöntemlerini yeniden yükle
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadShippingAddress();
      loadPaymentMethods();
    });
    return unsubscribe;
  }, [navigation]);

  const handleCreateOrder = async () => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem('userId');
      
      if (!storedUserId) {
        setErrorMessage('Lütfen giriş yapın');
        setShowErrorModal(true);
        return;
      }

      // Sipariş verilerini hazırla
      const address = shippingAddress || {};
      
      // Adres bilgilerini kontrol et
      if (!address || (!address.fullAddress && !address.address)) {
        setErrorMessage('Lütfen teslimat adresi seçin');
        setShowErrorModal(true);
        setLoading(false);
        return;
      }
      
      // Tam adres string'ini oluştur
      const addressLine = address.fullAddress || address.address || '';
      const city = address.city || '';
      const district = address.district || '';
      const postalCode = address.postalCode || '';
      
      const fullAddressString = [
        addressLine,
        city && district ? `${city}, ${district}` : (city || district),
        postalCode
      ].filter(Boolean).join('\n').trim() || addressLine;
      
      // Seçilen ödeme yöntemini belirle
      let finalPaymentMethod = paymentMethod || 'card';
      if (selectedPaymentMethod) {
        if (selectedPaymentMethod.type === 'bank_transfer') {
          finalPaymentMethod = 'bank_transfer';
        } else if (selectedPaymentMethod.type === 'wallet') {
          finalPaymentMethod = 'wallet';
        } else {
          finalPaymentMethod = 'card';
        }
      }

      const orderData = {
        userId: parseInt(storedUserId),
        totalAmount: total,
        status: 'pending',
        shippingAddress: fullAddressString,
        paymentMethod: finalPaymentMethod,
        city: city,
        district: district,
        fullAddress: addressLine,
        customerName: customerInfo.name || address.fullName || address.customerName || '',
        customerEmail: customerInfo.email || address.email || '',
        customerPhone: customerInfo.phone || address.phone || '',
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          productName: item.name || null,
          productDescription: item.description || null,
          productCategory: item.category || null,
          productBrand: item.brand || null,
          productImage: item.image || null,
          selectedVariations: typeof item.selectedVariations === 'string' 
            ? item.selectedVariations 
            : (item.selectedVariations ? JSON.stringify(item.selectedVariations) : null)
        }))
      };

      console.log('Sipariş oluşturuluyor:', orderData);

      const response = await ordersAPI.create(orderData);
      
      if (response.data?.success) {
        // Sipariş başarılı
        const orderId = response.data.data?.orderId || response.data.orderId;
        
        // Alışveriş EXP'si ekle
        try {
          await userLevelAPI.addPurchaseExp(storedUserId, total, orderId);
          console.log('✅ Alışveriş EXP eklendi');
        } catch (expError) {
          console.log('⚠️ EXP eklenemedi:', expError.message);
          // Sipariş başarılı, sadece EXP eklenemedi
        }
        
        // Success modal'ı göster
        setSuccessModalData({
          orderId,
          expGained: true, // EXP kazanımı başarılı
          paymentMethod: finalPaymentMethod,
          paymentInfo: finalPaymentMethod === 'bank_transfer' ? {
            recipient: 'Huğlu Av Tüfekleri Kooperatifi',
            bank: 'İş Bankası',
            iban: 'TR33 0006 4000 0011 2345 6789 01',
          } : null,
          totalAmount: total,
        });
        setShowSuccessModal(true);
        
        // Sepeti temizle
        try {
          await cartAPI.clear(storedUserId);
        } catch (clearError) {
          console.error('Sepet temizleme hatası:', clearError);
        }
      } else {
        setErrorMessage(response.data?.message || 'Sipariş oluşturulamadı');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Sipariş oluşturma hatası:', error);
      setErrorMessage('Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderData = async () => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem('userId');
      
      if (!storedUserId) {
        setErrorMessage('Lütfen giriş yapın');
        setShowErrorModal(true);
        setTimeout(() => navigation.navigate('Login'), 2000);
        return;
      }

      // Sepet ürünlerini al
      const cartResponse = await cartAPI.get(storedUserId);
      console.log('OrderConfirmation - Sepet API yanıtı:', cartResponse.data);
      
      if (cartResponse.data?.success) {
        const cartData = cartResponse.data.cart || cartResponse.data.data || [];
        
        if (!Array.isArray(cartData)) {
          console.warn('Cart data array değil:', cartData);
          setCartItems([]);
          return;
        }

        // Backend'den gelen veriyi formatla
        const formattedItems = cartData.map(item => {
          // selectedVariations string ise parse et
          let variations = {};
          if (item.selectedVariations) {
            if (typeof item.selectedVariations === 'string') {
              try {
                variations = JSON.parse(item.selectedVariations);
              } catch (e) {
                console.warn('selectedVariations parse hatası:', e);
                variations = {};
              }
            } else {
              variations = item.selectedVariations;
            }
          }

          // Varyant string'ini oluştur
          let variantString = null;
          if (variations && Object.keys(variations).length > 0) {
            // Eğer variations içinde nested object varsa (örn: "145352": {...})
            const variantParts = [];
            Object.entries(variations).forEach(([key, value]) => {
              if (typeof value === 'object' && value !== null) {
                // Nested object durumu (örn: size variation)
                if (value.value) {
                  variantParts.push(value.value);
                }
              } else {
                // Basit key-value durumu (örn: color: "#11d421")
                if (key === 'color') {
                  variantParts.push(`Renk seçildi`);
                } else {
                  variantParts.push(`${key}: ${value}`);
                }
              }
            });
            variantString = variantParts.length > 0 ? variantParts.join(' | ') : null;
          }

          return {
            id: item.id || item.cartItemId,
            productId: item.productId,
            name: item.productName || item.name,
            price: parseFloat(item.price || 0),
            quantity: item.quantity || 1,
            image: item.productImage || item.image,
            variant: variantString,
            selectedVariations: variations,
            // Backend için ek alanlar
            description: item.productDescription || item.description || null,
            category: item.productCategory || item.category || null,
            brand: item.productBrand || item.brand || null,
          };
        });
        
        console.log('OrderConfirmation - Formatlanmış sepet:', formattedItems);
        setCartItems(formattedItems);

        // Route'dan gelen değerleri kullan, yoksa hesapla
        if (routeTotal !== undefined && routeSubtotal !== undefined) {
          console.log('Route\'dan gelen sipariş değerleri:', {
            total: routeTotal,
            subtotal: routeSubtotal,
            shipping: routeShipping
          });
          setTotal(routeTotal);
          setSubtotal(routeSubtotal);
          setShipping(routeShipping || 0);
        } else {
          const FREE_SHIPPING_LIMIT = 600;
          const calculatedSubtotal = formattedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const calculatedShipping = calculatedSubtotal >= FREE_SHIPPING_LIMIT ? 0 : 30;
          const calculatedTotal = calculatedSubtotal + calculatedShipping;
          
          console.log('Hesaplanan değerler:', {
            subtotal: calculatedSubtotal,
            shipping: calculatedShipping,
            total: calculatedTotal
          });
          
          setSubtotal(calculatedSubtotal);
          setShipping(calculatedShipping);
          setTotal(calculatedTotal);
        }
      } else {
        console.log('Sepet boş veya başarısız yanıt');
        setCartItems([]);
      }
    } catch (error) {
      console.error('Sipariş verileri yükleme hatası:', error);
      setErrorMessage('Sipariş bilgileri yüklenirken bir hata oluştu');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const loadShippingAddress = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      // Route'dan gelen adresi kontrol et
      if (routeShippingAddress) {
        setShippingAddress(routeShippingAddress);
        return;
      }

      // API'den varsayılan adresi çek
      try {
        const response = await userAPI.getAddresses(userId, 'shipping');
        if (response.data?.success) {
          const addresses = response.data.data || response.data.addresses || [];
          // Varsayılan adresi bul veya ilk adresi kullan
          const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
          if (defaultAddress) {
            setShippingAddress(defaultAddress);
          }
        }
      } catch (error) {
        console.log('Adres yüklenemedi:', error.message);
        // Hata durumunda boş bırak, kullanıcı bilgileri gösterilir
      }
    } catch (error) {
      console.error('Adres yükleme hatası:', error);
    }
  };

  const loadCustomerInfo = async () => {
    try {
      const [userName, userEmail, userPhone] = await AsyncStorage.multiGet([
        'userName',
        'userEmail',
        'userPhone',
      ]);

      setCustomerInfo({
        name: userName[1] || '',
        email: userEmail[1] || '',
        phone: userPhone[1] || '',
      });
    } catch (error) {
      console.error('Kullanıcı bilgileri yükleme hatası:', error);
    }
  };

  const handleChangeAddress = async () => {
    setShowAddressModal(true);
    await loadAddresses();
  };

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const response = await userAPI.getAddresses(userId, 'shipping');
      if (response.data?.success) {
        const addressList = response.data.data || response.data.addresses || [];
        setAddresses(addressList);
      }
    } catch (error) {
      console.error('Adresler yüklenemedi:', error);
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSelectAddress = (address) => {
    setShippingAddress(address);
    setShowAddressModal(false);
  };

  const handleAddNewAddress = () => {
    setShowAddressModal(false);
    navigation.navigate('AddAddress', {
      onAddressAdded: async () => {
        await loadAddresses();
        await loadShippingAddress();
      }
    });
  };

  const handleChangePayment = async () => {
    setShowPaymentModal(true);
    await loadPaymentMethods();
  };

  const loadPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      try {
        const response = await walletAPI.getPaymentMethods(userId);
        if (response.data?.success) {
          const methods = response.data.data || response.data.paymentMethods || [];
          setPaymentMethods(methods);
          // Varsayılan ödeme yöntemini bul
          const defaultMethod = methods.find(m => m.isDefault) || methods[0];
          if (defaultMethod && !selectedPaymentMethod) {
            setSelectedPaymentMethod(defaultMethod);
          }
        }
      } catch (error) {
        console.log('Ödeme yöntemleri yüklenemedi, mock data kullanılıyor:', error);
        // Mock data
        const mockMethods = [
          {
            id: 1,
            cardType: 'Visa',
            lastFour: '4242',
            expiryDate: '12/28',
            cardName: 'John Doe',
            isDefault: true,
          },
          {
            id: 2,
            cardType: 'Mastercard',
            lastFour: '8888',
            expiryDate: '06/29',
            cardName: 'John Doe',
            isDefault: false,
          },
        ];
        setPaymentMethods(mockMethods);
        if (!selectedPaymentMethod) {
          setSelectedPaymentMethod(mockMethods[0]);
        }
      }
    } catch (error) {
      console.error('Ödeme yöntemleri yükleme hatası:', error);
      setPaymentMethods([]);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleSelectPaymentMethod = (method) => {
    setSelectedPaymentMethod(method);
    setShowPaymentModal(false);
  };

  const handleAddNewPaymentMethod = () => {
    setShowPaymentModal(false);
    navigation.navigate('PaymentMethod', {
      onPaymentAdded: async () => {
        await loadPaymentMethods();
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sipariş Özeti</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Sipariş hazırlanıyor...</Text>
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
        <Text style={styles.headerTitle}>Sipariş Özeti</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        <View style={styles.stepCompleted}>
          <Ionicons name="checkmark" size={16} color={COLORS.white} />
        </View>
        <View style={styles.progressLine} />
        <View style={styles.stepCompleted}>
          <Ionicons name="checkmark" size={16} color={COLORS.white} />
        </View>
        <View style={styles.progressLine} />
        <View style={styles.stepActive}>
          <Text style={styles.stepNumber}>3</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ürünler ({cartItems.length})</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
              <Text style={styles.editButton}>Sepeti Düzenle</Text>
            </TouchableOpacity>
          </View>

          {cartItems.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartText}>Sepetinizde ürün bulunmuyor</Text>
            </View>
          ) : (
            cartItems.map((item) => (
              <View key={item.id} style={styles.orderItem}>
                <View style={styles.itemImage}>
                  {item.image ? (
                    <Image 
                      source={{ uri: item.image }} 
                      style={styles.itemImageContent}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Ionicons name="image-outline" size={32} color={COLORS.gray400} />
                    </View>
                  )}
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  {item.variant && (
                    <Text style={styles.itemVariant}>{item.variant}</Text>
                  )}
                  <View style={styles.itemFooter}>
                    <Text style={styles.itemQuantity}>Adet: {item.quantity}</Text>
                    <Text style={styles.itemPrice}>₺{(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Delivery & Payment */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoHeaderLeft}>
              <Ionicons name="car-outline" size={20} color={COLORS.gray400} />
              <Text style={styles.infoHeaderTitle}>TESLİMAT</Text>
            </View>
            <TouchableOpacity onPress={() => handleChangeAddress()}>
              <Text style={styles.changeButton}>Değiştir</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoContent}>
            <View style={styles.infoIcon}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoDetails}>
              <Text style={styles.infoName}>
                {shippingAddress?.fullName || shippingAddress?.customerName || customerInfo.name || 'Adres bilgisi yükleniyor...'}
              </Text>
              <Text style={styles.infoAddress}>
                {shippingAddress?.fullAddress || shippingAddress?.address || 'Adres bilgisi bulunamadı'}
                {shippingAddress && (
                  <>
                    {'\n'}
                    {shippingAddress.city || ''}
                    {shippingAddress.district ? `, ${shippingAddress.district}` : ''}
                    {shippingAddress.postalCode ? ` ${shippingAddress.postalCode}` : ''}
                  </>
                )}
              </Text>
              {shippingAddress?.phone && (
                <View style={styles.infoPhone}>
                  <Ionicons name="call-outline" size={12} color={COLORS.gray500} />
                  <Text style={styles.infoPhoneText}>{shippingAddress.phone}</Text>
                </View>
              )}
              <View style={styles.shippingBadge}>
                <Ionicons name="time-outline" size={14} color={COLORS.success} />
                <Text style={styles.shippingText}>Standart Kargo (3-5 Gün)</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoHeaderLeft}>
              <Ionicons name="card-outline" size={20} color={COLORS.gray400} />
              <Text style={styles.infoHeaderTitle}>ÖDEME</Text>
            </View>
            <TouchableOpacity onPress={() => handleChangePayment()}>
              <Text style={styles.changeButton}>Değiştir</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoContent}>
            <View style={styles.cardIcon}>
              <Ionicons name="card-outline" size={20} color={COLORS.textMain} />
            </View>
            <View style={styles.infoDetails}>
              <Text style={styles.infoName}>
                {selectedPaymentMethod 
                  ? `${selectedPaymentMethod.cardType || 'Kart'} ****${selectedPaymentMethod.lastFour || '****'}` 
                  : paymentMethod === 'bank_transfer' 
                    ? 'Banka Havalesi'
                    : paymentMethod === 'wallet'
                      ? 'Cüzdan Bakiyesi'
                      : 'Visa ****4242'}
              </Text>
              <Text style={styles.infoAddress}>
                {selectedPaymentMethod?.expiryDate 
                  ? `Son kullanma: ${selectedPaymentMethod.expiryDate}` 
                  : paymentMethod === 'bank_transfer'
                    ? 'İş Bankası - TR33 0006 4000 0011 2345 6789 01'
                    : paymentMethod === 'wallet'
                      ? 'Cüzdan bakiyenizden ödeme'
                      : 'Son kullanma: 12/28'}
              </Text>
            </View>
            <View style={styles.secureBadge}>
              <Ionicons name="lock-closed-outline" size={12} color={COLORS.gray400} />
              <Text style={styles.secureText}>Güvenli</Text>
            </View>
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
            <Text style={styles.summaryLabel}>Kargo</Text>
            {shipping === 0 ? (
              <Text style={[styles.summaryValue, { color: COLORS.primary }]}>Ücretsiz</Text>
            ) : (
              <Text style={styles.summaryValue}>₺{shipping.toFixed(2)}</Text>
            )}
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tahmini Vergi</Text>
            <Text style={styles.summaryValue}>₺0.00</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>Toplam</Text>
            <Text style={styles.summaryTotalValue}>₺{total.toFixed(2)}</Text>
          </View>
          {shipping === 0 && subtotal >= 600 && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>🎉 Ücretsiz kargo kazandınız!</Text>
            </View>
          )}
        </View>

        {/* Trust Badge */}
        <View style={styles.trustBadge}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.gray400} />
          <Text style={styles.trustText}>%100 Güvenli Ödeme Garantisi</Text>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <Button
            title={`Siparişi Tamamla - ₺${total.toFixed(2)}`}
            onPress={() => {
              // Show success modal or navigate to success screen
              handleCreateOrder();
            }}
          />
        )}
      </SafeAreaView>

      {/* Order Success Modal */}
      <OrderSuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigation.navigate('Main');
        }}
        orderId={successModalData?.orderId}
        expGained={successModalData?.expGained}
        paymentMethod={successModalData?.paymentMethod}
        paymentInfo={successModalData?.paymentInfo}
        totalAmount={successModalData?.totalAmount}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorMessage}
      />

      {/* Address Selection Modal */}
      <Modal
        visible={showAddressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowAddressModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Teslimat Adresi Seç</Text>
              <TouchableOpacity 
                onPress={() => setShowAddressModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              {loadingAddresses ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.modalLoadingText}>Adresler yükleniyor...</Text>
                </View>
              ) : addresses.length === 0 ? (
                <View style={styles.modalEmptyContainer}>
                  <Ionicons name="location-outline" size={64} color={COLORS.gray300} />
                  <Text style={styles.modalEmptyText}>Henüz adres eklenmemiş</Text>
                  <Text style={styles.modalEmptySubtext}>Yeni adres eklemek için aşağıdaki butonu kullanın</Text>
                </View>
              ) : (
                addresses.map((address) => (
                  <TouchableOpacity
                    key={address.id}
                    style={[
                      styles.addressOptionCard,
                      shippingAddress?.id === address.id && styles.addressOptionCardSelected
                    ]}
                    onPress={() => handleSelectAddress(address)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.addressOptionContent}>
                      <View style={styles.addressOptionHeader}>
                        <View style={styles.addressOptionIcon}>
                          <Ionicons 
                            name={address.addressType === 'home' ? 'home' : address.addressType === 'office' ? 'business' : 'location'} 
                            size={20} 
                            color={shippingAddress?.id === address.id ? COLORS.primary : COLORS.gray400} 
                          />
                        </View>
                        <View style={styles.addressOptionInfo}>
                          <View style={styles.addressOptionTitleRow}>
                            <Text style={styles.addressOptionTitle}>
                              {address.label || address.addressType || 'Adres'}
                            </Text>
                            {address.isDefault && (
                              <View style={styles.defaultBadge}>
                                <Text style={styles.defaultBadgeText}>VARSayıLAN</Text>
                              </View>
                            )}
                            {shippingAddress?.id === address.id && (
                              <View style={styles.selectedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                                <Text style={styles.selectedBadgeText}>Seçili</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.addressOptionName}>
                            {address.fullName || address.customerName || ''}
                          </Text>
                          <Text style={styles.addressOptionAddress}>
                            {address.fullAddress || address.address || ''}
                          </Text>
                          <Text style={styles.addressOptionLocation}>
                            {address.city || ''}{address.district ? `, ${address.district}` : ''} {address.postalCode || ''}
                          </Text>
                          {address.phone && (
                            <View style={styles.addressOptionPhone}>
                              <Ionicons name="call-outline" size={12} color={COLORS.gray500} />
                              <Text style={styles.addressOptionPhoneText}>{address.phone}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.addAddressButton}
                onPress={handleAddNewAddress}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
                <Text style={styles.addAddressButtonText}>Yeni Adres Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Method Selection Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowPaymentModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ödeme Yöntemi Seç</Text>
              <TouchableOpacity 
                onPress={() => setShowPaymentModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              {loadingPaymentMethods ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.modalLoadingText}>Ödeme yöntemleri yükleniyor...</Text>
                </View>
              ) : paymentMethods.length === 0 ? (
                <View style={styles.modalEmptyContainer}>
                  <Ionicons name="card-outline" size={64} color={COLORS.gray300} />
                  <Text style={styles.modalEmptyText}>Henüz ödeme yöntemi eklenmemiş</Text>
                  <Text style={styles.modalEmptySubtext}>Yeni ödeme yöntemi eklemek için aşağıdaki butonu kullanın</Text>
                </View>
              ) : (
                <>
                  {paymentMethods.map((method) => {
                    const cardType = method.cardType || method.type || 'Kart';
                    const lastFour = method.lastFour || method.cardNumber?.slice(-4) || '****';
                    const expiry = method.expiryDate || method.expiry || '';
                    const isSelected = selectedPaymentMethod?.id === method.id;
                    
                    return (
                      <TouchableOpacity
                        key={method.id}
                        style={[
                          styles.paymentOptionCard,
                          isSelected && styles.paymentOptionCardSelected
                        ]}
                        onPress={() => handleSelectPaymentMethod(method)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.paymentOptionContent}>
                          <View style={styles.paymentOptionHeader}>
                            <View style={[
                              styles.paymentOptionIcon,
                              cardType.toUpperCase().includes('MASTER') && styles.mastercardIcon
                            ]}>
                              <Text style={styles.paymentOptionIconText}>
                                {cardType.toUpperCase().includes('MASTER') ? 'MC' : cardType.substring(0, 4).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.paymentOptionInfo}>
                              <View style={styles.paymentOptionTitleRow}>
                                <Text style={styles.paymentOptionTitle}>
                                  {cardType} ****{lastFour}
                                </Text>
                                {method.isDefault && (
                                  <View style={styles.defaultBadge}>
                                    <Text style={styles.defaultBadgeText}>VARSayıLAN</Text>
                                  </View>
                                )}
                                {isSelected && (
                                  <View style={styles.selectedBadge}>
                                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                                    <Text style={styles.selectedBadgeText}>Seçili</Text>
                                  </View>
                                )}
                              </View>
                              {expiry && (
                                <Text style={styles.paymentOptionExpiry}>
                                  Son kullanma: {expiry}
                                </Text>
                              )}
                              {method.cardName && (
                                <Text style={styles.paymentOptionName}>
                                  {method.cardName}
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  
                  {/* Bank Transfer Option */}
                  <TouchableOpacity
                    style={[
                      styles.paymentOptionCard,
                      paymentMethod === 'bank_transfer' && styles.paymentOptionCardSelected
                    ]}
                    onPress={() => {
                      setSelectedPaymentMethod({ id: 'bank_transfer', type: 'bank_transfer' });
                      setShowPaymentModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.paymentOptionContent}>
                      <View style={styles.paymentOptionHeader}>
                        <View style={styles.paymentOptionIcon}>
                          <Ionicons name="business-outline" size={20} color={paymentMethod === 'bank_transfer' ? COLORS.primary : COLORS.gray400} />
                        </View>
                        <View style={styles.paymentOptionInfo}>
                          <View style={styles.paymentOptionTitleRow}>
                            <Text style={styles.paymentOptionTitle}>Banka Havalesi</Text>
                            {paymentMethod === 'bank_transfer' && (
                              <View style={styles.selectedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                                <Text style={styles.selectedBadgeText}>Seçili</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.paymentOptionExpiry}>
                            İş Bankası - TR33 0006 4000 0011 2345 6789 01
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Wallet Balance Option */}
                  <TouchableOpacity
                    style={[
                      styles.paymentOptionCard,
                      paymentMethod === 'wallet' && styles.paymentOptionCardSelected
                    ]}
                    onPress={() => {
                      setSelectedPaymentMethod({ id: 'wallet', type: 'wallet' });
                      setShowPaymentModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.paymentOptionContent}>
                      <View style={styles.paymentOptionHeader}>
                        <View style={styles.paymentOptionIcon}>
                          <Ionicons name="wallet-outline" size={20} color={paymentMethod === 'wallet' ? COLORS.primary : COLORS.gray400} />
                        </View>
                        <View style={styles.paymentOptionInfo}>
                          <View style={styles.paymentOptionTitleRow}>
                            <Text style={styles.paymentOptionTitle}>Cüzdan Bakiyesi</Text>
                            {paymentMethod === 'wallet' && (
                              <View style={styles.selectedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                                <Text style={styles.selectedBadgeText}>Seçili</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.paymentOptionExpiry}>
                            Cüzdan bakiyenizden ödeme yapın
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.addAddressButton}
                onPress={handleAddNewPaymentMethod}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
                <Text style={styles.addAddressButtonText}>Yeni Ödeme Yöntemi Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  stepCompleted: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(17, 212, 33, 0.3)',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  progressLine: {
    width: 32,
    height: 2,
    backgroundColor: 'rgba(17, 212, 33, 0.3)',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  orderItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    overflow: 'hidden',
  },
  itemImageContent: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  emptyCart: {
    padding: 32,
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  itemVariant: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray600,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray500,
    letterSpacing: 1,
  },
  changeButton: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoDetails: {
    flex: 1,
  },
  infoName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  infoAddress: {
    fontSize: 14,
    color: COLORS.gray500,
    lineHeight: 20,
    marginBottom: 4,
  },
  infoPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  infoPhoneText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  shippingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  shippingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.gray100,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  secureText: {
    fontSize: 10,
    color: COLORS.gray400,
  },
  summaryCard: {
    margin: 16,
    marginTop: 0,
    padding: 24,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 20,
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
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.gray200,
    marginVertical: 12,
    borderStyle: 'dashed',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  summaryTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  savingsBadge: {
    marginTop: 12,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  trustText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  bottomBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Address Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  modalLoadingText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  modalEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray600,
    marginTop: 16,
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: COLORS.gray500,
    marginTop: 8,
    textAlign: 'center',
  },
  addressOptionCard: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  addressOptionCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  addressOptionContent: {
    flex: 1,
  },
  addressOptionHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  addressOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressOptionInfo: {
    flex: 1,
  },
  addressOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  addressOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  defaultBadge: {
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  selectedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  addressOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  addressOptionAddress: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
    marginBottom: 2,
  },
  addressOptionLocation: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 4,
  },
  addressOptionPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  addressOptionPhoneText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
  },
  addAddressButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Payment Modal Styles
  paymentOptionCard: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  paymentOptionCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  paymentOptionContent: {
    flex: 1,
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mastercardIcon: {
    backgroundColor: '#EB001B',
  },
  paymentOptionIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  paymentOptionInfo: {
    flex: 1,
  },
  paymentOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  paymentOptionExpiry: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 2,
  },
  paymentOptionName: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },
});
