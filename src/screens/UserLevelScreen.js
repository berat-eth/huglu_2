import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { userLevelAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UserLevelScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [levelData, setLevelData] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadUserLevel();
  }, []);

  const loadUserLevel = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        navigation.replace('Login');
        return;
      }

      try {
        const [levelResponse, historyResponse, statsResponse] = await Promise.all([
          userLevelAPI.getLevel(userId),
          userLevelAPI.getHistory(userId),
          userLevelAPI.getStats(userId),
        ]);

        console.log('📊 Level Response:', JSON.stringify(levelResponse.data, null, 2));
        console.log('📜 History Response:', JSON.stringify(historyResponse.data, null, 2));
        console.log('📈 Stats Response:', JSON.stringify(statsResponse.data, null, 2));

        if (levelResponse.data?.success) {
          const levelData = levelResponse.data.data;
          // Backend'den gelen veriyi mobil uygulama formatına çevir
          setLevelData({
            currentLevel: levelData.currentLevel || levelData.levelProgress?.currentLevel?.id || 1,
            currentExp: levelData.currentExp || levelData.levelProgress?.currentExp || 0,
            nextLevelExp: levelData.nextLevelExp || levelData.levelProgress?.nextLevel?.minExp || 1500,
            totalPoints: levelData.totalPoints || levelData.totalExp || levelData.levelProgress?.totalExp || 0,
            levelName: levelData.levelName || levelData.levelProgress?.currentLevel?.displayName || 'Bronz',
            progressPercentage: levelData.progressPercentage || levelData.levelProgress?.progressPercentage || 0,
          });
        }

        if (historyResponse.data?.success) {
          // Backend'den gelen history formatını kontrol et
          const historyData = historyResponse.data.history || historyResponse.data.data || [];
          setHistory(Array.isArray(historyData) ? historyData : []);
          console.log('✅ History loaded:', historyData.length, 'items');
        } else {
          console.log('⚠️ History response not successful');
          setHistory([]);
        }

        if (statsResponse.data?.success) {
          setStats(statsResponse.data.data);
          console.log('✅ Stats loaded:', statsResponse.data.data);
        } else {
          console.log('⚠️ Stats response not successful');
          setStats(null);
        }
      } catch (apiError) {
        console.error('❌ API hatası:', apiError.message);
        console.error('❌ API error details:', apiError.response?.data || apiError);
        
        // Hata durumunda boş veri set et
        setLevelData({
          currentLevel: 1,
          currentExp: 0,
          nextLevelExp: 1500,
          totalPoints: 0,
          levelName: 'Bronz',
        });
        setHistory([]);
        setStats(null);
      }
    } catch (error) {
      console.error('Seviye bilgileri yüklenemedi:', error);
      setLevelData({ currentLevel: 1, currentExp: 0, nextLevelExp: 500, totalPoints: 0 });
      setHistory([]);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserLevel();
  };

  const handleClaimRewards = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId || !levelData) {
        Alert.alert('Hata', 'Kullanıcı bilgileri yüklenemedi');
        return;
      }

      // Get current level ID from level data
      const levelIds = ['bronze', 'iron', 'gold', 'platinum', 'diamond'];
      const levelId = levelIds[currentLevel - 1] || 'bronze';

      const response = await userLevelAPI.claimRewards(userId, levelId);
      
      if (response.data?.success) {
        Alert.alert(
          'Başarılı',
          `Ödüller başarıyla kullanıldı!\n\n${(response.data.rewards || []).join('\n')}`,
          [{ text: 'Tamam', onPress: () => loadUserLevel() }]
        );
      } else {
        Alert.alert('Hata', response.data?.message || 'Ödüller kullanılamadı');
      }
    } catch (error) {
      console.error('Ödül kullanma hatası:', error);
      Alert.alert('Hata', error.response?.data?.message || 'Ödüller kullanılırken bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const currentLevel = levelData?.currentLevel || 1;
  const currentExp = levelData?.currentExp || 0;
  const nextLevelExp = levelData?.nextLevelExp || 1500;
  const totalPoints = levelData?.totalPoints || 0;
  const levelName = levelData?.levelName || 'Bronz';
  const progress = nextLevelExp > 0 ? Math.min(100, (currentExp / nextLevelExp) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seviyem</Text>
        <TouchableOpacity style={styles.historyButton}>
          <Ionicons name="time-outline" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        <View style={styles.levelCard}>
          <LinearGradient colors={['#FF6B6B', '#FF8E53']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.levelGradient}>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800' }} style={styles.levelBackground} blurRadius={2} />
            <View style={styles.levelOverlay} />
            <View style={styles.levelContent}>
              <View style={styles.statusBadge}><Text style={styles.statusText}>AKTİF</Text></View>
              <Text style={styles.currentStatusLabel}>Mevcut Durum</Text>
              <Text style={styles.levelTitle}>Seviye {currentLevel}: {levelName}</Text>
              <View style={styles.pointsContainer}>
                <Text style={styles.pointsLabel}>Toplam Puan Birikimi</Text>
                <View style={styles.pointsRow}>
                  <Text style={styles.pointsValue}>{totalPoints.toLocaleString('tr-TR')}</Text>
                  <View style={styles.trendBadge}><Ionicons name="trending-up" size={16} color={COLORS.primary} /></View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

          <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              {nextLevelExp > currentExp 
                ? `Sonraki Seviye: ${nextLevelExp - currentExp} EXP kaldı` 
                : 'Maksimum Seviyeye Ulaştınız!'}
            </Text>
            <Text style={styles.progressPoints}>{currentExp} / {nextLevelExp}</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${Math.min(100, progress)}%` }]} />
            </View>
          </View>
          <Text style={styles.progressMessage}>
            {nextLevelExp > currentExp 
              ? `${nextLevelExp - currentExp} EXP daha kazanarak bir sonraki seviyeye geçin`
              : 'Tebrikler! En yüksek seviyeye ulaştınız'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kaşif Avantajlarınız</Text>
          <View style={styles.benefitsGrid}>
            <View style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: 'rgba(17, 212, 33, 0.1)' }]}>
                <Ionicons name="pricetag" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.benefitTitle}>%10 İndirim</Text>
              <Text style={styles.benefitDescription}>Tüm ekipmanlarda</Text>
            </View>
            <View style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: 'rgba(17, 212, 33, 0.1)' }]}>
                <Ionicons name="car" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.benefitTitle}>Ücretsiz Kargo</Text>
              <Text style={styles.benefitDescription}>Tüm siparişlerde</Text>
            </View>
            <View style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: 'rgba(17, 212, 33, 0.1)' }]}>
                <Ionicons name="gift" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.benefitTitle}>Doğum Günü Hediyesi</Text>
              <Text style={styles.benefitDescription}>Özel yıllık ödül</Text>
            </View>
            <View style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: 'rgba(17, 212, 33, 0.1)' }]}>
                <Ionicons name="lock-open" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.benefitTitle}>Erken Erişim</Text>
              <Text style={styles.benefitDescription}>Yeni ürünlere öncelik</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Kazanma Yolları</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>Tümünü Gör</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.earnCard} onPress={() => navigation.navigate('ProductList')}>
            <View style={styles.earnIcon}><Ionicons name="cart" size={20} color={COLORS.primary} /></View>
            <View style={styles.earnContent}>
              <Text style={styles.earnTitle}>Alışveriş Yap</Text>
              <Text style={styles.earnDescription}>Her alışverişte puan kazan</Text>
            </View>
            <View style={styles.earnPoints}><Text style={styles.earnPointsText}>+EXP</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.earnCard} onPress={() => navigation.navigate('Referral')}>
            <View style={styles.earnIcon}><Ionicons name="people" size={20} color={COLORS.primary} /></View>
            <View style={styles.earnContent}>
              <Text style={styles.earnTitle}>Arkadaş Davet Et</Text>
              <Text style={styles.earnDescription}>Davet başına bonus EXP kazan</Text>
            </View>
            <View style={styles.earnPoints}><Text style={styles.earnPointsText}>+200 EXP</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.earnCard} onPress={() => navigation.navigate('Wishlist')}>
            <View style={styles.earnIcon}><Ionicons name="share-social" size={20} color={COLORS.primary} /></View>
            <View style={styles.earnContent}>
              <Text style={styles.earnTitle}>Sosyal Medyada Paylaş</Text>
              <Text style={styles.earnDescription}>İstek listeni veya ürünleri paylaş</Text>
            </View>
            <View style={styles.earnPoints}><Text style={styles.earnPointsText}>+50 EXP</Text></View>
          </TouchableOpacity>
          <View style={styles.earnCard}>
            <View style={styles.earnIcon}><Ionicons name="create" size={20} color={COLORS.primary} /></View>
            <View style={styles.earnContent}>
              <Text style={styles.earnTitle}>Yorum Yaz</Text>
              <Text style={styles.earnDescription}>Ürün hakkında düşüncelerini paylaş</Text>
            </View>
            <View style={styles.earnPoints}><Text style={styles.earnPointsText}>+50 EXP</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aktivite Geçmişi</Text>
          {history && history.length > 0 ? (
            <View>
              {history.slice(0, 4).map((item, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={[styles.historyIcon, { backgroundColor: item.points > 0 ? 'rgba(17, 212, 33, 0.1)' : 'rgba(255, 107, 107, 0.1)' }]}>
                    <Ionicons name={item.points > 0 ? 'add-circle' : 'remove-circle'} size={20} color={item.points > 0 ? COLORS.primary : '#FF6B6B'} />
                  </View>
                  <View style={styles.historyContent}>
                    <Text style={styles.historyTitle}>{item.title || 'Aktivite'}</Text>
                    <Text style={styles.historyDate}>{item.date || 'Bugün'}</Text>
                  </View>
                  <Text style={[styles.historyPoints, { color: item.points > 0 ? COLORS.primary : '#FF6B6B' }]}>
                    {item.points > 0 ? '+' : ''}{item.points}
                  </Text>
                </View>
              ))}
              <TouchableOpacity 
                style={styles.viewHistoryButton}
                onPress={() => {
                  // Tüm geçmişi göster (şimdilik aynı ekranda göster, ileride ayrı ekran eklenebilir)
                  Alert.alert('Geçmiş', `${history.length} aktivite kaydı bulundu`);
                }}
              >
                <Text style={styles.viewHistoryText}>Tüm Geçmişi Görüntüle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyHistory}>
              <Ionicons name="time-outline" size={48} color={COLORS.gray300} />
              <Text style={styles.emptyHistoryText}>Henüz aktivite yok</Text>
              <Text style={styles.emptyHistorySubtext}>Alışveriş yaparak veya yorum yazarak puan kazanmaya başlayın</Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={styles.redeemButton}
          onPress={handleClaimRewards}
        >
          <Ionicons name="gift" size={20} color={COLORS.white} />
          <Text style={styles.redeemButtonText}>Ödülleri Kullan</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.backgroundLight },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMain },
  historyButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  levelCard: { margin: 16, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  levelGradient: { position: 'relative', minHeight: 280 },
  levelBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  levelOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  levelContent: { padding: 24, position: 'relative', zIndex: 1 },
  statusBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 16 },
  statusText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  currentStatusLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)', marginBottom: 8 },
  levelTitle: { fontSize: 28, fontWeight: '800', color: COLORS.white, marginBottom: 24 },
  pointsContainer: { backgroundColor: 'rgba(255, 255, 255, 0.15)', padding: 16, borderRadius: 16 },
  pointsLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: 8 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointsValue: { fontSize: 32, fontWeight: '800', color: COLORS.white },
  trendBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  progressCard: { marginHorizontal: 16, marginBottom: 24, padding: 20, backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.gray100 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  progressPoints: { fontSize: 14, fontWeight: '600', color: COLORS.gray600 },
  progressBarContainer: { marginBottom: 12 },
  progressBarBackground: { height: 8, backgroundColor: COLORS.gray100, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  progressMessage: { fontSize: 13, color: COLORS.gray500, lineHeight: 18 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMain, marginBottom: 16 },
  viewAllText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  benefitCard: { width: '48%', padding: 16, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.gray100 },
  benefitIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  benefitTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textMain, marginBottom: 4 },
  benefitDescription: { fontSize: 12, color: COLORS.gray500, lineHeight: 16 },
  earnCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.gray100, marginBottom: 12, gap: 12 },
  earnIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(17, 212, 33, 0.1)', justifyContent: 'center', alignItems: 'center' },
  earnContent: { flex: 1 },
  earnTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textMain, marginBottom: 4 },
  earnDescription: { fontSize: 13, color: COLORS.gray500 },
  earnPoints: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(17, 212, 33, 0.1)', borderRadius: 12 },
  earnPointsText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  historyCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.gray100, marginBottom: 12, gap: 12 },
  historyIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  historyContent: { flex: 1 },
  historyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textMain, marginBottom: 4 },
  historyDate: { fontSize: 13, color: COLORS.gray500 },
  historyPoints: { fontSize: 16, fontWeight: '700' },
  viewHistoryButton: { paddingVertical: 12, alignItems: 'center' },
  viewHistoryText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  redeemButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, paddingVertical: 16, backgroundColor: COLORS.primary, borderRadius: 12, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  redeemButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  emptyHistory: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
  emptyHistoryText: { fontSize: 16, fontWeight: '600', color: COLORS.gray600, marginTop: 16, marginBottom: 8 },
  emptyHistorySubtext: { fontSize: 14, color: COLORS.gray500, textAlign: 'center', lineHeight: 20 },
});
