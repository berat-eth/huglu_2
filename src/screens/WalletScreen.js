import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { walletAPI } from '../services/api';

export default function WalletScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [points, setPoints] = useState(0);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [vouchers, setVouchers] = useState([]);

  useEffect(() => {
    loadWalletData();
  }, []);

  const handleRecharge = () => {
    Alert.alert(
      'Para Yükle',
      'Cüzdanınıza ne kadar para yüklemek istersiniz?',
      [
        { text: '₺50', onPress: () => processRecharge(50) },
        { text: '₺100', onPress: () => processRecharge(100) },
        { text: '₺250', onPress: () => processRecharge(250) },
        { text: '₺500', onPress: () => processRecharge(500) },
        { text: 'İptal', style: 'cancel' },
      ]
    );
  };

  const processRecharge = async (amount) => {
    try {
      const response = await walletAPI.rechargeRequest(userId, amount, 'credit_card');
      
      if (response.data?.success) {
        Alert.alert('Başarılı', `₺${amount} yükleme talebiniz alındı.`);
        loadWalletData(); // Verileri yenile
      } else {
        Alert.alert('Hata', response.data?.message || 'Yükleme talebi oluşturulamadı');
      }
    } catch (error) {
      console.error('Yükleme hatası:', error);
      Alert.alert('Hata', 'Yükleme işlemi sırasında bir hata oluştu');
    }
  };

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem('userId');
      const storedUserName = await AsyncStorage.getItem('userName');
      
      if (!storedUserId) {
        Alert.alert('Hata', 'Lütfen giriş yapın');
        navigation.navigate('Login');
        return;
      }

      setUserId(storedUserId);
      setUserName(storedUserName || 'Kullanıcı');

      console.log('🔄 Wallet verileri yükleniyor... userId:', storedUserId);

      // 1. Bakiye al
      try {
        const balanceResponse = await walletAPI.getBalance(storedUserId);
        console.log('💰 Bakiye yanıtı:', JSON.stringify(balanceResponse.data, null, 2));
        
        if (balanceResponse.data?.success) {
          // Backend response: { success: true, data: { balance: ... } }
          const balanceValue = balanceResponse.data.data?.balance ?? 0;
          const parsedBalance = parseFloat(balanceValue) || 0;
          setBalance(parsedBalance);
          console.log('✅ Bakiye:', parsedBalance);
        }
      } catch (error) {
        console.error('❌ Bakiye alınamadı:', error.message);
        setBalance(0);
      }

      // 2. İşlem geçmişi al
      try {
        const transactionsResponse = await walletAPI.getTransactions(storedUserId);
        console.log('📜 İşlemler yanıtı:', JSON.stringify(transactionsResponse.data, null, 2));
        
        if (transactionsResponse.data?.success) {
          const transactionsData = transactionsResponse.data.transactions || transactionsResponse.data.data || [];
          setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
          console.log('✅ İşlemler:', transactionsData.length, 'adet');
        }
      } catch (error) {
        console.error('❌ İşlemler alınamadı:', error.message);
        setTransactions([]);
      }

      // 3. Sadakat puanları al (opsiyonel - backend'de yoksa hata vermez)
      try {
        const pointsResponse = await walletAPI.getPoints(storedUserId);
        console.log('⭐ Puanlar yanıtı:', JSON.stringify(pointsResponse.data, null, 2));
        
        if (pointsResponse.data?.success) {
          const pointsValue = pointsResponse.data.points || pointsResponse.data.data?.points || 0;
          setPoints(parseInt(pointsValue));
          console.log('✅ Puanlar:', pointsValue);
        }
      } catch (error) {
        console.log('⚠️ Puanlar endpoint\'i yok veya hata:', error.message);
        setPoints(0);
      }

      // 4. Ödeme yöntemleri al (opsiyonel)
      try {
        const paymentMethodsResponse = await walletAPI.getPaymentMethods(storedUserId);
        console.log('💳 Ödeme yöntemleri yanıtı:', JSON.stringify(paymentMethodsResponse.data, null, 2));
        
        if (paymentMethodsResponse.data?.success) {
          const paymentMethodsData = paymentMethodsResponse.data.paymentMethods || paymentMethodsResponse.data.data || [];
          setPaymentMethods(Array.isArray(paymentMethodsData) ? paymentMethodsData : []);
          console.log('✅ Ödeme yöntemleri:', paymentMethodsData.length, 'adet');
        }
      } catch (error) {
        console.log('⚠️ Ödeme yöntemleri endpoint\'i yok veya hata:', error.message);
        setPaymentMethods([]);
      }

      // 5. Hediye çekleri ve kuponlar al (opsiyonel)
      try {
        const vouchersResponse = await walletAPI.getVouchers(storedUserId);
        console.log('🎁 Hediye çekleri yanıtı:', JSON.stringify(vouchersResponse.data, null, 2));
        
        if (vouchersResponse.data?.success) {
          const vouchersData = vouchersResponse.data.vouchers || vouchersResponse.data.data || [];
          setVouchers(Array.isArray(vouchersData) ? vouchersData : []);
          console.log('✅ Hediye çekleri:', vouchersData.length, 'adet');
        }
      } catch (error) {
        console.log('⚠️ Hediye çekleri endpoint\'i yok veya hata:', error.message);
        setVouchers([]);
      }
    } catch (error) {
      console.error('Cüzdan verileri yükleme hatası:', error);
      Alert.alert('Hata', 'Cüzdan bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cüzdanım</Text>
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
        <Text style={styles.headerTitle}>Cüzdanım</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Loyalty Card */}
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={[COLORS.primary, '#0ea61a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loyaltyCard}
          >
            {/* Decorative circles */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
            
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <View>
                  <View style={styles.cardBrand}>
                    <Ionicons name="leaf-outline" size={16} color={COLORS.white} />
                    <Text style={styles.cardBrandText}>HUGLU PRO</Text>
                  </View>
                  <Text style={styles.pointsAmount}>{points} Puan</Text>
                  <View style={styles.rewardBadge}>
                    <Text style={styles.rewardText}>₺{(points / 100).toFixed(2)} Değer</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.cardName}>{userName}</Text>
                  <Text style={styles.cardId}>ID: {userId.slice(0, 6)}</Text>
                </View>
                <View style={styles.qrCode}>
                  <Ionicons name="qr-code" size={32} color={COLORS.textMain} />
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Wallet Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet-outline" size={24} color={COLORS.primary} />
            <Text style={styles.balanceLabel}>Cüzdan Bakiyesi</Text>
          </View>
          <Text style={styles.balanceAmount}>₺{balance.toFixed(2)}</Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity style={styles.balanceButton} onPress={handleRecharge}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.balanceButtonText}>Para Yükle</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.balanceButton}
              onPress={() => navigation.navigate('WalletTransfer')}
            >
              <Ionicons name="arrow-forward-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.balanceButtonText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ödeme Yöntemleri</Text>
          
          {paymentMethods.length > 0 ? (
            <>
              {paymentMethods.map((method) => {
                const cardType = method.cardType || method.type || 'VISA';
                const lastFour = method.lastFour || method.cardNumber?.slice(-4) || '****';
                const expiry = method.expiryDate || method.expiry || '';
                const isDefault = method.isDefault || method.default || false;
                
                return (
                  <TouchableOpacity key={method.id} style={styles.paymentItem}>
                    <View style={styles.paymentLeft}>
                      <View style={[
                        styles.cardLogo,
                        cardType.toUpperCase().includes('MASTER') && styles.mastercardLogo
                      ]}>
                        <Text style={styles.cardLogoText}>
                          {cardType.toUpperCase().includes('MASTER') ? 'MC' : cardType.substring(0, 4).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <View style={styles.paymentNameRow}>
                          <Text style={styles.paymentName}>{cardType} ****{lastFour}</Text>
                          {isDefault && (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultBadgeText}>Varsayılan</Text>
                            </View>
                          )}
                        </View>
                        {expiry && (
                          <Text style={styles.paymentExpiry}>Son kullanma: {expiry}</Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="create-outline" size={20} color={COLORS.gray400} />
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color={COLORS.gray300} />
              <Text style={styles.emptyStateText}>Kayıtlı ödeme yöntemi yok</Text>
            </View>
          )}

          {/* Add Payment Method */}
          <TouchableOpacity style={styles.addPaymentButton}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.addPaymentText}>Ödeme Yöntemi Ekle</Text>
          </TouchableOpacity>
        </View>

        {/* Vouchers & Gift Cards Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hediye Çekleri & Kuponlar</Text>
          
          {vouchers.length > 0 ? (
            <>
              {vouchers.map((voucher) => {
                const voucherType = voucher.type || 'gift';
                const isGiftCard = voucherType === 'gift' || voucherType === 'giftcard';
                const iconName = isGiftCard ? 'gift-outline' : 'pricetag-outline';
                const iconColor = isGiftCard ? '#F97316' : '#3B82F6';
                const iconBgStyle = isGiftCard ? styles.giftIcon : styles.shippingIcon;
                const isActive = voucher.status === 'active' || voucher.isActive;
                
                return (
                  <TouchableOpacity key={voucher.id} style={styles.voucherItem}>
                    <View style={styles.voucherLeft}>
                      <View style={[styles.voucherIcon, iconBgStyle]}>
                        <Ionicons name={iconName} size={20} color={iconColor} />
                      </View>
                      <View>
                        <Text style={styles.voucherName}>{voucher.name || voucher.title}</Text>
                        {voucher.balance !== undefined && (
                          <Text style={styles.voucherBalance}>
                            Bakiye: <Text style={styles.voucherBalanceAmount}>₺{parseFloat(voucher.balance).toFixed(2)}</Text>
                          </Text>
                        )}
                        {voucher.discount && (
                          <Text style={styles.voucherBalance}>
                            İndirim: <Text style={styles.voucherBalanceAmount}>{voucher.discount}</Text>
                          </Text>
                        )}
                        {voucher.expiryDate && (
                          <Text style={styles.voucherExpiry}>
                            {new Date(voucher.expiryDate) > new Date() 
                              ? `${Math.ceil((new Date(voucher.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} gün içinde sona eriyor`
                              : 'Süresi dolmuş'}
                          </Text>
                        )}
                      </View>
                    </View>
                    {isActive ? (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>AKTİF</Text>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={48} color={COLORS.gray300} />
              <Text style={styles.emptyStateText}>Hediye çeki veya kupon yok</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  cardContainer: {
    padding: 16,
  },
  loyaltyCard: {
    borderRadius: 16,
    padding: 20,
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    left: -30,
    bottom: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTop: {
    gap: 8,
  },
  cardBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardBrandText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  pointsAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
  },
  rewardBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  cardId: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  qrCode: {
    backgroundColor: COLORS.white,
    padding: 8,
    borderRadius: 8,
  },
  balanceCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  balanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  balanceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardLogo: {
    width: 56,
    height: 40,
    backgroundColor: '#1434CB',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mastercardLogo: {
    backgroundColor: '#EB001B',
  },
  cardLogoText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  paymentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  defaultBadge: {
    backgroundColor: 'rgba(17, 212, 33, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
  },
  paymentExpiry: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.gray300,
  },
  addPaymentText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  voucherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  voucherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  voucherIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  giftIcon: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  shippingIcon: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  voucherName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  voucherBalance: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  voucherBalanceAmount: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  voucherExpiry: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
});
