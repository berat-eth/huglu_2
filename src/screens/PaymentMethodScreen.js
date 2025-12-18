import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../components/Button';
import Input from '../components/Input';
import { COLORS } from '../constants/colors';
import { cartAPI, walletAPI } from '../services/api';
import { isNFCAvailable, readContactlessCard, processContactlessPayment } from '../services/nfcPayment';

export default function PaymentMethodScreen({ navigation, route }) {
  const [selectedPayment, setSelectedPayment] = useState('new_card');
  const [loading, setLoading] = useState(true);
  const [cartTotal, setCartTotal] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [userId, setUserId] = useState(null);
  
  // Kart bilgileri
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  
  // Temassız ödeme durumları
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [isReadingCard, setIsReadingCard] = useState(false);
  const [nfcModalVisible, setNfcModalVisible] = useState(false);
  const [nfcAnimation] = useState(new Animated.Value(0));

  // Route'dan gelen parametreleri al
  const routeTotal = route?.params?.cartTotal;
  const routeSubtotal = route?.params?.subtotal;
  const routeShipping = route?.params?.shipping;
  const routeHasFreeShipping = route?.params?.hasFreeShipping;

  useEffect(() => {
    loadPaymentData();
    checkNFCAvailability();
  }, []);

  // NFC animasyonu
  useEffect(() => {
    if (isReadingCard) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(nfcAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(nfcAnimation, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      nfcAnimation.setValue(0);
    }
  }, [isReadingCard]);

  // NFC desteğini kontrol et
  const checkNFCAvailability = async () => {
    try {
      const available = await isNFCAvailable();
      setNfcAvailable(available);
    } catch (error) {
      console.log('NFC kontrolü:', error.message);
      setNfcAvailable(false);
    }
  };

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem('userId');
      
      if (!storedUserId) {
        Alert.alert('Hata', 'Lütfen giriş yapın');
        navigation.navigate('Login');
        return;
      }

      setUserId(storedUserId);

      // Önce route'dan gelen değerleri kullan
      if (routeTotal !== undefined && routeSubtotal !== undefined) {
        console.log('Route\'dan gelen değerler kullanılıyor:', {
          total: routeTotal,
          subtotal: routeSubtotal,
          shipping: routeShipping
        });
        setCartTotal(routeTotal);
        setSubtotal(routeSubtotal);
        setShipping(routeShipping || 0);
      } else {
        // Route'dan değer yoksa API'den çek
        console.log('API\'den sepet verisi çekiliyor...');
        const cartResponse = await cartAPI.get(storedUserId);
        if (cartResponse.data?.success) {
          const cartData = cartResponse.data.cart || [];
          const FREE_SHIPPING_LIMIT = 600;
          const calculatedSubtotal = cartData.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const calculatedShipping = calculatedSubtotal >= FREE_SHIPPING_LIMIT ? 0 : 30;
          const calculatedTotal = calculatedSubtotal + calculatedShipping;
          
          setSubtotal(calculatedSubtotal);
          setShipping(calculatedShipping);
          setCartTotal(calculatedTotal);
          
          console.log('API\'den hesaplanan değerler:', {
            subtotal: calculatedSubtotal,
            shipping: calculatedShipping,
            total: calculatedTotal
          });
        }
      }

      // Cüzdan bakiyesini al
      try {
        const walletResponse = await walletAPI.getBalance(storedUserId);
        if (walletResponse.data?.success) {
          setWalletBalance(walletResponse.data.balance || 0);
        }
      } catch (walletError) {
        console.log('Cüzdan bakiyesi alınamadı:', walletError);
        setWalletBalance(0);
      }
    } catch (error) {
      console.error('Ödeme verileri yükleme hatası:', error);
      Alert.alert('Hata', 'Ödeme bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Temassız ödeme işlemi
  const handleContactlessPayment = async () => {
    try {
      if (!nfcAvailable) {
        Alert.alert(
          'NFC Desteklenmiyor',
          'Bu cihaz NFC özelliğini desteklemiyor. Lütfen kart bilgilerinizi manuel olarak girin.'
        );
        return;
      }

      setIsReadingCard(true);
      setNfcModalVisible(true);

      // Kartı oku
      const cardData = await readContactlessCard();

      // Kart bilgilerini form alanlarına doldur
      setCardNumber(cardData.cardNumber);
      setCardName(cardData.cardName || 'TEMASSIZ KART');
      setExpiryDate(cardData.expiryDate);

      // Modal'ı kapat
      setNfcModalVisible(false);
      setIsReadingCard(false);

      Alert.alert(
        'Kart Okundu',
        'Kart bilgileriniz başarıyla okundu. CVV kodunu girmeniz gerekmektedir.',
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      console.error('Temassız ödeme hatası:', error);
      setNfcModalVisible(false);
      setIsReadingCard(false);
      
      Alert.alert(
        'Hata',
        error.message || 'Kart okunamadı. Lütfen tekrar deneyin veya kart bilgilerinizi manuel olarak girin.'
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ödeme Yöntemi</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
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
        <Text style={styles.headerTitle}>Ödeme Yöntemi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Credit/Debit Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kredi/Banka Kartı</Text>

          <TouchableOpacity
            style={[
              styles.paymentCard,
              selectedPayment === 'new_card' && styles.paymentCardSelected,
            ]}
            onPress={() => setSelectedPayment('new_card')}
          >
            <View style={styles.radioButton}>
              {selectedPayment === 'new_card' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.cardIcon}>
              <Ionicons name="card-outline" size={24} color={COLORS.textMain} />
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.cardType}>Kredi/Banka Kartı ile Öde</Text>
              <Text style={styles.cardExpiry}>Güvenli ödeme</Text>
            </View>
          </TouchableOpacity>

          {selectedPayment === 'new_card' && (
            <View style={styles.cardForm}>
              <View style={styles.cardFormHeader}>
                <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
                <Text style={styles.cardFormTitle}>Kart Bilgileriniz</Text>
              </View>

              {/* Kart Numarası */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kart Numarası</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={COLORS.gray400}
                  value={cardNumber}
                  onChangeText={(text) => {
                    // Sadece rakam ve boşluk
                    const formatted = text.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                    setCardNumber(formatted.slice(0, 19)); // Max 16 digit + 3 space
                  }}
                  keyboardType="numeric"
                  maxLength={19}
                />
              </View>

              {/* Kart Üzerindeki İsim */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kart Üzerindeki İsim</Text>
                <TextInput
                  style={styles.input}
                  placeholder="AD SOYAD"
                  placeholderTextColor={COLORS.gray400}
                  value={cardName}
                  onChangeText={setCardName}
                  autoCapitalize="characters"
                />
              </View>

              {/* Son Kullanma ve CVV */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Son Kullanma</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="AA/YY"
                    placeholderTextColor={COLORS.gray400}
                    value={expiryDate}
                    onChangeText={(text) => {
                      // Format: MM/YY
                      const cleaned = text.replace(/\D/g, '');
                      if (cleaned.length >= 2) {
                        setExpiryDate(cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4));
                      } else {
                        setExpiryDate(cleaned);
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    placeholderTextColor={COLORS.gray400}
                    value={cvv}
                    onChangeText={(text) => setCvv(text.replace(/\D/g, '').slice(0, 3))}
                    keyboardType="numeric"
                    maxLength={3}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Temassız Ödeme Butonu */}
              {nfcAvailable && (
                <TouchableOpacity
                  style={styles.contactlessButton}
                  onPress={handleContactlessPayment}
                  disabled={isReadingCard}
                >
                  <View style={styles.contactlessButtonContent}>
                    <Ionicons 
                      name="radio-outline" 
                      size={24} 
                      color={COLORS.primary} 
                      style={styles.contactlessIcon}
                    />
                    <View style={styles.contactlessTextContainer}>
                      <Text style={styles.contactlessButtonText}>
                        {isReadingCard ? 'Kart Okunuyor...' : 'Temassız Ödeme'}
                      </Text>
                      <Text style={styles.contactlessButtonSubtext}>
                        Kartınızı telefonun arkasına yaklaştırın
                      </Text>
                    </View>
                    {isReadingCard && (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {/* Güvenlik Bilgisi */}
              <View style={styles.securityBanner}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                <Text style={styles.securityText}>
                  Kart bilgileriniz 256-bit SSL ile şifrelenir
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Bank Transfer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Banka Havalesi / EFT</Text>

          <TouchableOpacity
            style={[
              styles.walletOption,
              selectedPayment === 'bank_transfer' && styles.paymentCardSelected,
            ]}
            onPress={() => setSelectedPayment('bank_transfer')}
          >
            <View style={styles.walletContent}>
              <View style={[styles.walletIcon, styles.bankIcon]}>
                <Ionicons name="business-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletText}>Banka Havalesi / EFT</Text>
                <Text style={styles.walletSubtext}>Huğlu Av Tüfekleri Kooperatifi</Text>
              </View>
            </View>
            <View style={styles.radioButton}>
              {selectedPayment === 'bank_transfer' && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Digital Wallets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dijital Cüzdanlar</Text>

          <TouchableOpacity
            style={[
              styles.walletOption,
              selectedPayment === 'hpay' && styles.paymentCardSelected,
            ]}
            onPress={() => setSelectedPayment('hpay')}
          >
            <View style={styles.walletContent}>
              <View style={[styles.walletIcon, styles.hpayIcon]}>
                <Text style={styles.hpayText}>H</Text>
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletText}>Hpay</Text>
                <Text style={styles.walletSubtext}>Hızlı ve güvenli ödeme</Text>
              </View>
            </View>
            <View style={styles.radioButton}>
              {selectedPayment === 'hpay' && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.walletOption,
              selectedPayment === 'wallet' && styles.paymentCardSelected,
              walletBalance < cartTotal && styles.walletOptionDisabled,
            ]}
            onPress={() => {
              if (walletBalance >= cartTotal) {
                setSelectedPayment('wallet');
              } else {
                Alert.alert('Yetersiz Bakiye', 'Cüzdan bakiyeniz bu ödeme için yeterli değil');
              }
            }}
            disabled={walletBalance < cartTotal}
          >
            <View style={styles.walletContent}>
              <View style={[styles.walletIcon, styles.walletIconBg]}>
                <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletText}>Cüzdan</Text>
                <Text style={[
                  styles.walletBalance,
                  walletBalance < cartTotal && styles.walletBalanceInsufficient
                ]}>
                  Bakiye: ₺{walletBalance.toFixed(2)}
                </Text>
              </View>
            </View>
            <View style={styles.radioButton}>
              {selectedPayment === 'wallet' && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Trust Badge */}
        <View style={styles.trustBadge}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.gray400} />
          <Text style={styles.trustText}>Ödemeler güvenli ve şifrelidir</Text>
        </View>
      </ScrollView>

      {/* NFC Okuma Modal */}
      <Modal
        visible={nfcModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setNfcModalVisible(false);
          setIsReadingCard(false);
        }}
      >
        <View style={styles.nfcModalContainer}>
          <View style={styles.nfcModalContent}>
            <Animated.View
              style={[
                styles.nfcIconContainer,
                {
                  transform: [
                    {
                      scale: nfcAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.2],
                      }),
                    },
                  ],
                  opacity: nfcAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 0.5, 1],
                  }),
                },
              ]}
            >
              <Ionicons name="radio" size={80} color={COLORS.primary} />
            </Animated.View>
            <Text style={styles.nfcModalTitle}>Kartınızı Okutun</Text>
            <Text style={styles.nfcModalText}>
              Kartınızı telefonun arkasına yaklaştırın ve bekleyin
            </Text>
            <TouchableOpacity
              style={styles.nfcCancelButton}
              onPress={() => {
                setNfcModalVisible(false);
                setIsReadingCard(false);
              }}
            >
              <Text style={styles.nfcCancelButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Bar */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Ödenecek Tutar</Text>
              <Text style={styles.totalAmount}>₺{cartTotal.toFixed(2)}</Text>
            </View>
            <Button
              title={`₺${cartTotal.toFixed(2)} Öde`}
              onPress={() => {
                // Kart ile ödeme seçiliyse kart bilgilerini kontrol et
                if (selectedPayment === 'new_card') {
                  if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
                    Alert.alert('Hata', 'Lütfen geçerli bir kart numarası girin');
                    return;
                  }
                  if (!cardName || cardName.trim().length < 3) {
                    Alert.alert('Hata', 'Lütfen kart üzerindeki ismi girin');
                    return;
                  }
                  if (!expiryDate || expiryDate.length < 5) {
                    Alert.alert('Hata', 'Lütfen son kullanma tarihini girin (AA/YY)');
                    return;
                  }
                  if (!cvv || cvv.length < 3) {
                    Alert.alert('Hata', 'Lütfen CVV kodunu girin');
                    return;
                  }
                }

                console.log('OrderConfirmation\'a gönderilen veriler:', {
                  paymentMethod: selectedPayment,
                  total: cartTotal,
                  subtotal: subtotal,
                  shipping: shipping,
                  cardInfo: selectedPayment === 'new_card' ? {
                    last4: cardNumber.replace(/\s/g, '').slice(-4),
                    cardName: cardName,
                  } : null
                });
                
                navigation.navigate('OrderConfirmation', { 
                  paymentMethod: selectedPayment,
                  total: cartTotal,
                  subtotal: subtotal,
                  shipping: shipping,
                  cardInfo: selectedPayment === 'new_card' ? {
                    last4: cardNumber.replace(/\s/g, '').slice(-4),
                    cardName: cardName,
                  } : null
                });
              }}
            />
          </>
        )}
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    gap: 16,
  },
  paymentCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDetails: {
    flex: 1,
  },
  cardType: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  cardExpiry: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  cardForm: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  cardFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardFormTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.textMain,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(17, 212, 33, 0.08)',
    borderRadius: 8,
    marginTop: 8,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  walletContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  walletIcon: {
    width: 48,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hpayIcon: {
    backgroundColor: COLORS.primary,
  },
  hpayText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  walletIconBg: {
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  bankIcon: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  walletInfo: {
    flex: 1,
  },
  walletText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  walletSubtext: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },
  walletBalance: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },
  walletBalanceInsufficient: {
    color: COLORS.error || '#EF4444',
  },
  walletOptionDisabled: {
    opacity: 0.5,
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
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  // Temassız Ödeme Stilleri
  contactlessButton: {
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  contactlessButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactlessIcon: {
    transform: [{ rotate: '45deg' }],
  },
  contactlessTextContainer: {
    flex: 1,
  },
  contactlessButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  contactlessButtonSubtext: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  // NFC Modal Stilleri
  nfcModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  nfcModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
  },
  nfcIconContainer: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 100,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  nfcModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
    textAlign: 'center',
  },
  nfcModalText: {
    fontSize: 16,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  nfcCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
  },
  nfcCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
});
