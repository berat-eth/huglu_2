import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { userAPI, ordersAPI, wishlistAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import ErrorModal from '../components/ErrorModal';
import LoginRequiredModal from '../components/LoginRequiredModal';

const MENU_ITEMS = [
  { id: 1, icon: 'person-outline', title: 'Kişisel Bilgiler', screen: 'PersonalInfo' },
  { id: 2, icon: 'trophy-outline', title: 'Seviyem', screen: 'UserLevel', badge: true },
  { id: 3, icon: 'wallet-outline', title: 'Cüzdanım', screen: 'Wallet' },
  { id: 4, icon: 'receipt-outline', title: 'Faturalarım', screen: 'Invoices' },
  { id: 5, icon: 'location-outline', title: 'Teslimat Adresleri', screen: 'MyAddresses' },
  { id: 6, icon: 'card-outline', title: 'Ödeme Yöntemleri', screen: 'PaymentMethod' },
  { id: 7, icon: 'return-down-back-outline', title: 'İade Taleplerim', screen: 'ReturnRequests' },
];

const APP_SETTINGS = [
  { id: 1, icon: 'gift-outline', title: 'Arkadaşını Davet Et', screen: 'Referral' },
  { id: 2, icon: 'settings-outline', title: 'Ayarlar', screen: 'Settings' },
  { id: 3, icon: 'storefront-outline', title: 'Mağazalarımız', screen: 'PhysicalStores' },
];

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Misafir');
  const [userEmail, setUserEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);
  
  // Dashboard stats
  const [activeOrders, setActiveOrders] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  
  // Modals
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [loginRequiredMessage, setLoginRequiredMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [name, email, loggedIn, storedUserId] = await AsyncStorage.multiGet([
        'userName', 
        'userEmail', 
        'isLoggedIn',
        'userId'
      ]);
      
      const isUserLoggedIn = loggedIn[1] === 'true';
      const currentUserId = storedUserId[1];
      
      setUserName(name[1] || 'Misafir');
      setUserEmail(email[1] || '');
      setIsLoggedIn(isUserLoggedIn);
      setUserId(currentUserId);

      // Eğer kullanıcı giriş yapmışsa istatistikleri yükle
      if (isUserLoggedIn && currentUserId) {
        await loadDashboardStats(currentUserId);
      }
    } catch (error) {
      console.error('Kullanıcı verileri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async (userId) => {
    try {
      // Aktif siparişleri al
      try {
        const ordersResponse = await ordersAPI.getByUser(userId);
        if (ordersResponse.data?.success) {
          const orders = ordersResponse.data.orders || [];
          const active = orders.filter(order => 
            order.status !== 'delivered' && order.status !== 'cancelled'
          ).length;
          setActiveOrders(active);
        }
      } catch (error) {
        console.log('Siparişler yüklenemedi:', error);
      }

      // Favori ürün sayısını al
      try {
        const wishlistResponse = await wishlistAPI.get(userId);
        if (wishlistResponse.data?.success) {
          const wishlist = wishlistResponse.data.wishlist || [];
          setWishlistCount(wishlist.length);
        }
      } catch (error) {
        console.log('Favoriler yüklenemedi:', error);
      }


    } catch (error) {
      console.error('Dashboard istatistikleri yükleme hatası:', error);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['userId', 'userName', 'userEmail', 'userPhone', 'isLoggedIn']);
      setShowLogoutModal(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      setShowLogoutModal(false);
      setErrorMessage('Çıkış yapılırken bir hata oluştu');
      setShowErrorModal(true);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color={COLORS.primary} />
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="pencil" size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          {userEmail ? <Text style={styles.userEmail}>{userEmail}</Text> : null}
          <View style={styles.membershipBadge}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
            <Text style={styles.membershipText}>Üye</Text>
          </View>
          <TouchableOpacity style={styles.editProfileButton}>
            <Ionicons name="settings-outline" size={16} color={COLORS.textMain} />
            <Text style={styles.editProfileText}>Profili Düzenle</Text>
          </TouchableOpacity>
        </View>

        {/* Dashboard Grid */}
        <View style={styles.dashboardGrid}>
          <TouchableOpacity 
            style={styles.dashboardCard} 
            onPress={() => {
              if (!isLoggedIn) {
                setLoginRequiredMessage('Siparişlerinizi görmek için lütfen giriş yapın');
                setShowLoginRequiredModal(true);
              } else {
                navigation.navigate('OrderTracking');
              }
            }}
          >
            <View style={styles.dashboardIcon}>
              <Ionicons name="cube-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>Siparişlerim</Text>
            <Text style={styles.dashboardSubtitle}>
              {isLoggedIn ? (activeOrders > 0 ? `${activeOrders} Aktif` : 'Sipariş Yok') : 'Giriş Yapın'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dashboardCard} 
            onPress={() => {
              if (!isLoggedIn) {
                setLoginRequiredMessage('Mağazadan teslim al siparişlerinizi görmek için lütfen giriş yapın');
                setShowLoginRequiredModal(true);
              } else {
                navigation.navigate('PickupOrders');
              }
            }}
          >
            <View style={styles.dashboardIcon}>
              <Ionicons name="storefront-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>Mağazadan Teslim Al</Text>
            <Text style={styles.dashboardSubtitle}>
              {isLoggedIn ? 'Siparişlerim' : 'Giriş Yapın'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dashboardCard} 
            onPress={() => {
              if (!isLoggedIn) {
                setLoginRequiredMessage('Favorilerinizi görmek için lütfen giriş yapın');
                setShowLoginRequiredModal(true);
              } else {
                navigation.navigate('Wishlist');
              }
            }}
          >
            <View style={styles.dashboardIcon}>
              <Ionicons name="heart-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>Favoriler</Text>
            <Text style={styles.dashboardSubtitle}>
              {isLoggedIn ? (wishlistCount > 0 ? `${wishlistCount} Ürün` : 'Ürün Yok') : 'Giriş Yapın'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dashboardCard} onPress={() => navigation.navigate('Campaigns')}>
            <View style={styles.dashboardIcon}>
              <Ionicons name="pricetag-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>Kampanyalar</Text>
            <Text style={styles.dashboardSubtitle}>Fırsatlar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dashboardCard} onPress={() => navigation.navigate('LiveChatEntry')}>
            <View style={styles.dashboardIcon}>
              <Ionicons name="headset-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>Destek</Text>
            <Text style={styles.dashboardSubtitle}>7/24 Yardım</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dashboardCard} 
            onPress={() => {
              if (!isLoggedIn) {
                setLoginRequiredMessage('Topluluk özelliklerini kullanmak için lütfen giriş yapın');
                setShowLoginRequiredModal(true);
              } else {
                // Navigate to Community tabs
                navigation.navigate('Community');
              }
            }}
          >
            <View style={styles.dashboardIcon}>
              <Ionicons name="images-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>In the Wild</Text>
            <Text style={styles.dashboardSubtitle}>Topluluk</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dashboardCard} 
            onPress={() => {
              if (!isLoggedIn) {
                setLoginRequiredMessage('Günlük ödüller için lütfen giriş yapın');
                setShowLoginRequiredModal(true);
              } else {
                navigation.navigate('DailyReward');
              }
            }}
          >
            <View style={styles.dashboardIcon}>
              <Ionicons name="gift-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>Günlük Ödül</Text>
            <Text style={styles.dashboardSubtitle}>Her Gün Kazan</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>YENİ</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dashboardCard} 
            onPress={() => {
              if (!isLoggedIn) {
                setLoginRequiredMessage('Görevler için lütfen giriş yapın');
                setShowLoginRequiredModal(true);
              } else {
                navigation.navigate('Quest');
              }
            }}
          >
            <View style={styles.dashboardIcon}>
              <Ionicons name="trophy-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>Görevler</Text>
            <Text style={styles.dashboardSubtitle}>Puan Kazan</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>YENİ</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dashboardCard} 
            onPress={() => {
              if (!isLoggedIn) {
                setLoginRequiredMessage('Rozetler için lütfen giriş yapın');
                setShowLoginRequiredModal(true);
              } else {
                navigation.navigate('Badges');
              }
            }}
          >
            <View style={styles.dashboardIcon}>
              <Ionicons name="medal-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>Rozetler</Text>
            <Text style={styles.dashboardSubtitle}>Başarılar</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>YENİ</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dashboardCard} 
            onPress={() => {
              if (!isLoggedIn) {
                setLoginRequiredMessage('VIP programı için lütfen giriş yapın');
                setShowLoginRequiredModal(true);
              } else {
                navigation.navigate('VIPProgram');
              }
            }}
          >
            <View style={styles.dashboardIcon}>
              <Ionicons name="diamond-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>VIP Program</Text>
            <Text style={styles.dashboardSubtitle}>Özel Avantajlar</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>YENİ</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dashboardCard} 
            onPress={() => {
              if (!isLoggedIn) {
                setLoginRequiredMessage('Abonelikler için lütfen giriş yapın');
                setShowLoginRequiredModal(true);
              } else {
                navigation.navigate('Subscription');
              }
            }}
          >
            <View style={styles.dashboardIcon}>
              <Ionicons name="repeat-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.dashboardTitle}>Abonelikler</Text>
            <Text style={styles.dashboardSubtitle}>Otomatik Sipariş</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>YENİ</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Ayarları</Text>
          <View style={styles.menuCard}>
            {MENU_ITEMS.map((item, index) => (
              <View key={item.id}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => item.screen && navigation.navigate(item.screen)}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name={item.icon} size={22} color={COLORS.gray600} />
                  </View>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
                </TouchableOpacity>
                {index < MENU_ITEMS.length - 1 && <View style={styles.menuDivider} />}
              </View>
            ))}
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uygulama Ayarları</Text>
          <View style={styles.menuCard}>
            {APP_SETTINGS.map((item, index) => (
              <View key={item.id}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => item.screen && navigation.navigate(item.screen)}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name={item.icon} size={22} color={COLORS.gray600} />
                  </View>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  {item.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
                </TouchableOpacity>
                {index < APP_SETTINGS.length - 1 && <View style={styles.menuDivider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          {isLoggedIn ? (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.logoutButton, { borderColor: COLORS.primary, backgroundColor: 'rgba(17, 212, 33, 0.05)' }]}
              onPress={() => navigation.navigate('Login')}
            >
              <Ionicons name="log-in-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.logoutText, { color: COLORS.primary }]}>Giriş Yap</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.version}>Huglu Tekstil App v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Logout Confirm Modal */}
      <ConfirmModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="Çıkış Yap"
        message="Çıkış yapmak istediğinize emin misiniz?"
        confirmText="Çıkış Yap"
        cancelText="İptal"
        confirmColor={COLORS.error}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorMessage}
      />

      {/* Login Required Modal */}
      <LoginRequiredModal
        visible={showLoginRequiredModal}
        onClose={() => setShowLoginRequiredModal(false)}
        onLogin={() => {
          setShowLoginRequiredModal(false);
          navigation.navigate('Login');
        }}
        message={loginRequiredMessage}
      />
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
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },

  editAvatarButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.gray500,
    marginBottom: 8,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  membershipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  memberSince: {
    fontSize: 14,
    color: COLORS.gray500,
    marginBottom: 16,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  dashboardCard: {
    width: '48%',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    alignItems: 'flex-start',
    position: 'relative',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  dashboardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  dashboardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  menuValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuValueText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginLeft: 72,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.error,
  },
  version: {
    fontSize: 12,
    color: COLORS.gray400,
    textAlign: 'center',
    marginTop: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    marginLeft: 'auto',
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
});
