import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert, Clipboard, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { campaignsAPI } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH * 0.85;

export default function CampaignsScreen({ navigation }) {
  const alert = useAlert();
  const [selectedTab, setSelectedTab] = useState('all'); // 'all' or 'available'
  const [campaigns, setCampaigns] = useState([]);
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [totalSavings, setTotalSavings] = useState(0);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      
      // Kullanıcı ID'sini al
      const storedUserId = await AsyncStorage.getItem('userId');
      setUserId(storedUserId);

      console.log('🎁 Kampanyalar yükleniyor...');

      // Tüm kampanyaları yükle
      const allResponse = await campaignsAPI.getAll();
      console.log('📦 Tüm kampanyalar yanıtı:', JSON.stringify(allResponse.data, null, 2));
      
      if (allResponse.data?.success) {
        const allCampaignsData = allResponse.data.campaigns || allResponse.data.data || [];
        setCampaigns(allCampaignsData);
        console.log('✅ Tüm kampanyalar yüklendi:', allCampaignsData.length, 'adet');
      } else {
        console.warn('⚠️ Kampanyalar API başarısız yanıt döndü');
        setCampaigns([]);
      }

      // Kullanıcıya özel kampanyaları yükle (eğer giriş yapmışsa)
      if (storedUserId) {
        try {
          const availableResponse = await campaignsAPI.getAvailable(storedUserId);
          console.log('📦 Kullanıcıya özel kampanyalar yanıtı:', JSON.stringify(availableResponse.data, null, 2));
          
          if (availableResponse.data?.success) {
            const availableData = availableResponse.data.campaigns || availableResponse.data.data || [];
            setAvailableCampaigns(availableData);
            console.log('✅ Kullanıcıya özel kampanyalar yüklendi:', availableData.length, 'adet');
          }
        } catch (error) {
          console.error('❌ Kullanıcıya özel kampanyalar yüklenemedi:', error);
          setAvailableCampaigns([]);
        }
      }
    } catch (error) {
      console.error('❌ Kampanyalar yükleme hatası:', {
        message: error.message,
        response: error.response?.data,
      });
      setCampaigns([]);
      setAvailableCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
    setRefreshing(false);
  };

  const copyCode = (code) => {
    Clipboard.setString(code);
    alert.show('Kopyalandı', `${code} kodu panoya kopyalandı`);
  };

  const handleApplyCampaign = async (campaignId) => {
    if (!userId) {
      setShowLoginRequiredModal(true);
      return;
    }

    try {
      const response = await campaignsAPI.apply(userId, campaignId);
      if (response.data?.success) {
        alert.show('Başarılı', 'Kampanya başarıyla uygulandı');
        loadCampaigns(); // Kampanyaları yeniden yükle
      } else {
        alert.show('Hata', response.data?.message || 'Kampanya uygulanamadı');
      }
    } catch (error) {
      console.error('Kampanya uygulama hatası:', error);
      alert.show('Hata', 'Kampanya uygulanırken bir hata oluştu');
    }
  };

  // Gösterilecek kampanyaları belirle
  const displayCampaigns = selectedTab === 'all' ? campaigns : availableCampaigns;

  // Kampanyaları kategorilere ayır
  const featuredCampaigns = displayCampaigns.filter(c => 
    c.type === 'featured' || c.isFeatured || c.featured
  );
  const activeCampaigns = displayCampaigns.filter(c => 
    (c.status === 'active' || c.isActive || !c.status) && 
    c.type !== 'featured' && 
    !c.isFeatured && 
    !c.featured &&
    !c.isUsed &&
    !c.used
  );
  const redeemedCampaigns = displayCampaigns.filter(c => 
    c.status === 'redeemed' || c.isUsed || c.used
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ödüller</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.textMain} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Kampanyalar yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        >
        {/* Empty State */}
        {displayCampaigns.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="pricetag-outline" size={64} color={COLORS.gray300} />
            </View>
            <Text style={styles.emptyTitle}>Kampanya Bulunamadı</Text>
            <Text style={styles.emptySubtitle}>
              Şu anda aktif kampanya bulunmamaktadır.
            </Text>
          </View>
        )}

        {/* Hero Carousel */}
        {featuredCampaigns.length > 0 && (
          <View style={styles.carouselSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CAROUSEL_WIDTH + 16}
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContainer}
            >
              {featuredCampaigns.map((campaign) => {
                const campaignImage = campaign.image || campaign.imageUrl || campaign.bannerImage || 'https://via.placeholder.com/800x400?text=Kampanya';
                const campaignBadge = campaign.badge || campaign.label || 'Öne Çıkan';
                const campaignTitle = campaign.title || campaign.name || 'Kampanya';
                const campaignDesc = campaign.description || campaign.shortDescription || '';
                
                return (
                  <TouchableOpacity
                    key={campaign.id || campaign._id}
                    style={[styles.heroCard, { width: CAROUSEL_WIDTH }]}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: campaignImage }}
                      style={styles.heroImage}
                      resizeMode="cover"
                    />
                    <View style={styles.heroOverlay} />
                    <View style={styles.heroContent}>
                      <View style={styles.heroBadge}>
                        <Text style={styles.heroBadgeText}>{campaignBadge}</Text>
                      </View>
                      <Text style={styles.heroTitle}>{campaignTitle}</Text>
                      <Text style={styles.heroDescription}>{campaignDesc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabsSection}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
              onPress={() => setSelectedTab('all')}
            >
              <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
                Tüm Kampanyalar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'available' && styles.tabActive]}
              onPress={() => setSelectedTab('available')}
              disabled={!userId}
            >
              <Text style={[styles.tabText, selectedTab === 'available' && styles.tabTextActive, !userId && styles.tabTextDisabled]}>
                Bana Özel
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aktif Promosyonlar</Text>
          <TouchableOpacity>
            <Text style={styles.filterText}>Filtrele</Text>
          </TouchableOpacity>
        </View>

        {/* Campaign Cards */}
        <View style={styles.cardsContainer}>
          {activeCampaigns.map((campaign) => {
            // Backend'den gelen veriyi normalize et
            const campaignType = campaign.type || campaign.campaignType || 'discount';
            const campaignId = campaign.id || campaign._id;
            const campaignTitle = campaign.title || campaign.name || 'Kampanya';
            const campaignDesc = campaign.description || campaign.shortDescription || '';
            const campaignCode = campaign.code || campaign.couponCode || campaign.promoCode;
            const campaignDiscount = campaign.discount || campaign.discountText || campaign.discountAmount;
            const campaignBadge = campaign.badge || campaign.label;
            const campaignImage = campaign.image || campaign.imageUrl || campaign.productImage;
            
            if (campaignType === 'discount' || campaignType === 'coupon') {
              return (
                <View key={campaignId} style={styles.discountCard}>
                  <View style={styles.discountCardBar} />
                  <View style={styles.discountCardContent}>
                    <View style={styles.discountCardTop}>
                      {campaignBadge && (
                        <View style={[styles.statusBadge, { backgroundColor: campaign.badgeColor ? `${campaign.badgeColor}20` : 'rgba(249, 115, 22, 0.1)' }]}>
                          <Text style={[styles.statusBadgeText, { color: campaign.badgeColor || '#f97316' }]}>
                            {campaignBadge}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.discountAmount}>{campaignDiscount}</Text>
                      <Text style={styles.discountTitle}>{campaignTitle}</Text>
                      <Text style={styles.discountDescription}>{campaignDesc}</Text>
                    </View>
                    
                    {campaignCode && (
                      <View style={styles.discountCardBottom}>
                        <View style={styles.codeBox}>
                          <Text style={styles.codeBoxText}>{campaignCode}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => copyCode(campaignCode)}
                        >
                          <Ionicons name="copy-outline" size={18} color={COLORS.white} />
                          <Text style={styles.copyButtonText}>Kopyala</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            }

            if (campaignType === 'shipping' || campaignType === 'free_shipping') {
              return (
                <View key={campaignId} style={styles.shippingCard}>
                  <View style={[styles.discountCardBar, { backgroundColor: '#3b82f6' }]} />
                  <View style={styles.shippingCardContent}>
                    <View style={styles.shippingIcon}>
                      <Ionicons name={campaign.icon || 'car-outline'} size={32} color="#3b82f6" />
                    </View>
                    <View style={styles.shippingInfo}>
                      <Text style={styles.shippingTitle}>{campaignTitle}</Text>
                      <Text style={styles.shippingDescription}>{campaignDesc}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.applyButton}
                      onPress={() => handleApplyCampaign(campaignId)}
                    >
                      <Text style={styles.applyButtonText}>Uygula</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            if (campaignType === 'product' || campaignType === 'bundle') {
              const expiryDate = campaign.expiresAt || campaign.endDate || campaign.validUntil;
              const expiryText = expiryDate 
                ? `${Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} gün`
                : campaign.expires || '30 gün';
              
              return (
                <View key={campaignId} style={styles.productCard}>
                  {campaignImage && (
                    <View style={styles.productImageContainer}>
                      <Image
                        source={{ uri: campaignImage }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  <View style={styles.productCardContent}>
                    <View style={styles.productCardTop}>
                      {campaignBadge && <Text style={styles.productBadge}>{campaignBadge}</Text>}
                      <Text style={styles.productTitle}>{campaignTitle}</Text>
                      <Text style={styles.productDescription}>{campaignDesc}</Text>
                    </View>
                    <View style={styles.productCardBottom}>
                      <Text style={styles.productExpires}>{expiryText} içinde sona eriyor</Text>
                      <TouchableOpacity 
                        style={styles.viewDetailsButton}
                        onPress={() => handleApplyCampaign(campaignId)}
                      >
                        <Text style={styles.viewDetailsText}>Detayları Gör</Text>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }

            return null;
          })}

          {/* Redeemed Campaigns */}
          {redeemedCampaigns.map((campaign) => {
            const campaignId = campaign.id || campaign._id;
            const campaignTitle = campaign.title || campaign.name || 'Kampanya';
            const campaignDiscount = campaign.discount || campaign.discountText || campaign.discountAmount;
            const campaignDesc = campaign.description || campaign.shortDescription || 'Kullanıldı';
            
            return (
              <View key={campaignId} style={styles.redeemedCard}>
                <View style={[styles.discountCardBar, { backgroundColor: COLORS.gray400 }]} />
                <View style={styles.redeemedCardContent}>
                  <View style={styles.redeemedInfo}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>Kullanıldı</Text>
                    </View>
                    <Text style={styles.redeemedTitle}>{campaignDiscount}</Text>
                    <Text style={styles.redeemedDescription}>{campaignDesc}</Text>
                  </View>
                  <View style={styles.redeemedCheck}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.gray400} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      )}

      {/* Floating Bottom Bar */}
      {totalSavings > 0 && (
        <View style={styles.floatingBar}>
          <View style={styles.floatingBarContent}>
            <View>
              <Text style={styles.floatingBarLabel}>Toplam Tasarruf</Text>
              <Text style={styles.floatingBarAmount}>₺{totalSavings.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutButton}>
              <Text style={styles.checkoutButtonText}>Ödemeye Git</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.textMain} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <alert.AlertComponent />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(246, 248, 246, 0.95)',
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
    flex: 1,
    textAlign: 'center',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.backgroundLight,
  },
  scrollView: {
    flex: 1,
  },
  carouselSection: {
    marginTop: 16,
  },
  carouselContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  heroCard: {
    height: 192,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    marginBottom: 8,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
    lineHeight: 24,
  },
  heroDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tabsSection: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.backgroundLight,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: COLORS.gray200,
    borderRadius: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  tabTextActive: {
    fontWeight: '700',
    color: COLORS.textMain,
  },
  tabTextDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  // Discount Card
  discountCard: {
    position: 'relative',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  discountCardBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: COLORS.primary,
  },
  discountCardContent: {
    padding: 16,
    paddingLeft: 22,
  },
  discountCardTop: {
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f97316',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  discountAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  discountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginTop: 4,
    marginBottom: 4,
  },
  discountDescription: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  discountCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  codeBox: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderStyle: 'dashed',
  },
  codeBoxText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Shipping Card
  shippingCard: {
    position: 'relative',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  shippingCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 22,
    gap: 16,
  },
  shippingIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shippingInfo: {
    flex: 1,
  },
  shippingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  shippingDescription: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  applyButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  // Product Card
  productCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  productImageContainer: {
    width: 128,
    height: 128,
    backgroundColor: COLORS.gray200,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productCardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  productCardTop: {
    marginBottom: 8,
  },
  productBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    lineHeight: 22,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  productCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  productExpires: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // Redeemed Card
  redeemedCard: {
    position: 'relative',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    opacity: 0.6,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  redeemedCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 22,
    gap: 16,
  },
  redeemedInfo: {
    flex: 1,
  },
  redeemedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    textDecorationColor: COLORS.gray400,
    marginBottom: 4,
  },
  redeemedDescription: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  redeemedCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Floating Bar
  floatingBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 50,
  },
  floatingBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.textMain,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  floatingBarAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkoutButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
});
