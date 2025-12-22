import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { gamificationAPI } from '../services/api';

export default function QuestScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [quests, setQuests] = useState([]);
  const [activeQuests, setActiveQuests] = useState([]);
  const [completedQuests, setCompletedQuests] = useState([]);

  useEffect(() => {
    loadQuests();
  }, []);

  const loadQuests = async () => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        navigation.replace('Login');
        return;
      }

      setUserId(storedUserId);

      try {
        const response = await gamificationAPI.getQuests(storedUserId);
        if (response.data?.success) {
          const allQuests = response.data.data?.quests || response.data.data || [];
          setQuests(allQuests);
          setActiveQuests(allQuests.filter(q => !q.completed && q.progress < q.target));
          setCompletedQuests(allQuests.filter(q => q.completed));
        } else {
          // Fallback: Örnek görevler
          const sampleQuests = generateSampleQuests();
          setQuests(sampleQuests);
          setActiveQuests(sampleQuests.filter(q => !q.completed));
          setCompletedQuests(sampleQuests.filter(q => q.completed));
        }
      } catch (error) {
        console.error('Görevler yüklenemedi:', error);
        const sampleQuests = generateSampleQuests();
        setQuests(sampleQuests);
        setActiveQuests(sampleQuests.filter(q => !q.completed));
        setCompletedQuests([]);
      }
    } catch (error) {
      console.error('Görev verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateSampleQuests = () => {
    return [
      {
        id: 1,
        title: '3 Ürün Görüntüle',
        description: '3 farklı ürün detay sayfasını ziyaret et',
        type: 'view_products',
        progress: 0,
        target: 3,
        reward: { type: 'exp', amount: 50 },
        completed: false,
        icon: 'eye',
      },
      {
        id: 2,
        title: 'İlk Yorumunu Yap',
        description: 'Bir ürüne ilk yorumunu yaz',
        type: 'write_review',
        progress: 0,
        target: 1,
        reward: { type: 'exp', amount: 100 },
        completed: false,
        icon: 'chatbubble',
      },
      {
        id: 3,
        title: '5 Arkadaş Davet Et',
        description: '5 arkadaşını uygulamaya davet et',
        type: 'invite_friends',
        progress: 0,
        target: 5,
        reward: { type: 'exp', amount: 500 },
        completed: false,
        icon: 'people',
      },
      {
        id: 4,
        title: 'Sepete Ürün Ekle',
        description: 'Sepetine en az 1 ürün ekle',
        type: 'add_to_cart',
        progress: 0,
        target: 1,
        reward: { type: 'exp', amount: 25 },
        completed: false,
        icon: 'cart',
      },
      {
        id: 5,
        title: 'Favorilere Ekle',
        description: '3 ürünü favorilerine ekle',
        type: 'add_favorite',
        progress: 0,
        target: 3,
        reward: { type: 'exp', amount: 75 },
        completed: false,
        icon: 'heart',
      },
    ];
  };

  const claimQuestReward = async (questId) => {
    if (!userId) return;

    try {
      const response = await gamificationAPI.claimQuestReward(questId, userId);
      if (response.data?.success) {
        Alert.alert(
          'Tebrikler! 🎉',
          `Görev tamamlandı! Ödülünüzü kazandınız.`,
          [{ text: 'Tamam', onPress: () => loadQuests() }]
        );
      } else {
        Alert.alert('Hata', response.data?.message || 'Ödül alınamadı');
      }
    } catch (error) {
      console.error('Ödül alma hatası:', error);
      Alert.alert('Hata', 'Ödül alınırken bir hata oluştu');
    }
  };

  const getProgressPercentage = (progress, target) => {
    return Math.min((progress / target) * 100, 100);
  };

  const renderQuestCard = (quest) => {
    const progressPercentage = getProgressPercentage(quest.progress, quest.target);
    const canClaim = quest.progress >= quest.target && !quest.completed;

    return (
      <View key={quest.id} style={styles.questCard}>
        <View style={styles.questHeader}>
          <View style={styles.questIconContainer}>
            <Ionicons name={quest.icon} size={24} color={COLORS.primary} />
          </View>
          <View style={styles.questInfo}>
            <Text style={styles.questTitle}>{quest.title}</Text>
            <Text style={styles.questDescription}>{quest.description}</Text>
          </View>
          {quest.completed && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            </View>
          )}
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {quest.progress} / {quest.target}
          </Text>
        </View>

        <View style={styles.questFooter}>
          <View style={styles.rewardContainer}>
            <Ionicons
              name={quest.reward.type === 'exp' ? 'star' : 'ticket'}
              size={16}
              color={quest.reward.type === 'exp' ? COLORS.primary : '#f59e0b'}
            />
            <Text style={styles.rewardText}>
              {quest.reward.type === 'exp' ? `+${quest.reward.amount} EXP` : `%${quest.reward.amount} İndirim`}
            </Text>
          </View>
          {canClaim && (
            <TouchableOpacity
              style={styles.claimButton}
              onPress={() => claimQuestReward(quest.id)}
            >
              <Text style={styles.claimButtonText}>Ödülü Al</Text>
            </TouchableOpacity>
          )}
        </View>
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
        <Text style={styles.headerTitle}>Görevler</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadQuests} />}
      >
        {/* Active Quests */}
        {activeQuests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aktif Görevler</Text>
            {activeQuests.map(quest => renderQuestCard(quest))}
          </View>
        )}

        {/* Completed Quests */}
        {completedQuests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tamamlanan Görevler</Text>
            {completedQuests.map(quest => renderQuestCard(quest))}
          </View>
        )}

        {/* Empty State */}
        {activeQuests.length === 0 && completedQuests.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={COLORS.gray400} />
            <Text style={styles.emptyStateText}>Henüz görev yok</Text>
            <Text style={styles.emptyStateSubtext}>Yeni görevler yakında eklenecek!</Text>
          </View>
        )}
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  questCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  questIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  questDescription: {
    fontSize: 14,
    color: COLORS.gray600,
  },
  completedBadge: {
    marginLeft: 'auto',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.gray200,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.gray600,
    textAlign: 'right',
  },
  questFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginLeft: 6,
  },
  claimButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  claimButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.gray600,
  },
});




