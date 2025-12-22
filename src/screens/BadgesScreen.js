import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { gamificationAPI } from '../services/api';

export default function BadgesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [badges, setBadges] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        navigation.replace('Login');
        return;
      }

      setUserId(storedUserId);

      try {
        const response = await gamificationAPI.getBadges(storedUserId);
        if (response.data?.success) {
          const allBadges = response.data.data?.badges || response.data.data || [];
          setBadges(allBadges);
          setEarnedBadges(allBadges.filter(b => b.earned));
        } else {
          // Fallback: Örnek rozetler
          const sampleBadges = generateSampleBadges();
          setBadges(sampleBadges);
          setEarnedBadges(sampleBadges.filter(b => b.earned));
        }
      } catch (error) {
        console.error('Rozetler yüklenemedi:', error);
        const sampleBadges = generateSampleBadges();
        setBadges(sampleBadges);
        setEarnedBadges(sampleBadges.filter(b => b.earned));
      }
    } catch (error) {
      console.error('Rozet verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleBadges = () => {
    return [
      { id: 1, name: 'İlk Adım', description: 'İlk alışverişini tamamla', icon: 'footsteps', earned: true, rarity: 'common' },
      { id: 2, name: 'Sosyal Kelebek', description: '10 ürünü paylaş', icon: 'share-social', earned: false, rarity: 'common' },
      { id: 3, name: 'Yorum Ustası', description: '20 yorum yaz', icon: 'chatbubbles', earned: false, rarity: 'rare' },
      { id: 4, name: 'Sadık Müşteri', description: '50 sipariş ver', icon: 'heart', earned: false, rarity: 'rare' },
      { id: 5, name: 'VIP Üye', description: 'Diamond seviyesine ulaş', icon: 'diamond', earned: false, rarity: 'epic' },
      { id: 6, name: 'Günlük Kahraman', description: '30 gün üst üste giriş yap', icon: 'flame', earned: false, rarity: 'epic' },
      { id: 7, name: 'Topluluk Lideri', description: '100 gönderi paylaş', icon: 'people', earned: false, rarity: 'legendary' },
      { id: 8, name: 'Efsanevi Alıcı', description: '1000 sipariş ver', icon: 'trophy', earned: false, rarity: 'legendary' },
    ];
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common':
        return COLORS.gray500;
      case 'rare':
        return '#3b82f6';
      case 'epic':
        return '#8b5cf6';
      case 'legendary':
        return '#f59e0b';
      default:
        return COLORS.gray500;
    }
  };

  const renderBadge = (badge) => {
    const isEarned = badge.earned;
    const rarityColor = getRarityColor(badge.rarity);

    return (
      <View key={badge.id} style={[styles.badgeCard, !isEarned && styles.badgeCardLocked]}>
        <View style={[styles.badgeIconContainer, { borderColor: isEarned ? rarityColor : COLORS.gray300 }]}>
          <Ionicons
            name={badge.icon}
            size={32}
            color={isEarned ? rarityColor : COLORS.gray300}
          />
        </View>
        {!isEarned && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={20} color={COLORS.gray400} />
          </View>
        )}
        <Text style={[styles.badgeName, !isEarned && styles.badgeNameLocked]}>
          {badge.name}
        </Text>
        <Text style={[styles.badgeDescription, !isEarned && styles.badgeDescriptionLocked]}>
          {badge.description}
        </Text>
        {isEarned && (
          <View style={[styles.earnedBadge, { backgroundColor: rarityColor }]}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.earnedText}>Kazanıldı</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
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
        <Text style={styles.headerTitle}>Rozetler</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{earnedBadges.length}</Text>
            <Text style={styles.statLabel}>Kazanılan</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{badges.length - earnedBadges.length}</Text>
            <Text style={styles.statLabel}>Kalan</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{badges.length}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
        </View>

        {/* Badges Grid */}
        <View style={styles.badgesGrid}>
          {badges.map(badge => renderBadge(badge))}
        </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  badgeCardLocked: {
    opacity: 0.6,
  },
  badgeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: COLORS.gray50,
  },
  lockOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 4,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: COLORS.gray500,
  },
  badgeDescription: {
    fontSize: 12,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeDescriptionLocked: {
    color: COLORS.gray400,
  },
  earnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  earnedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});




