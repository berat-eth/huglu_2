import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { subscriptionAPI } from '../services/api';

export default function SubscriptionScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [frequentOrders, setFrequentOrders] = useState([]);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        navigation.replace('Login');
        return;
      }

      setUserId(storedUserId);

      try {
        const [subscriptionsResponse, frequentResponse] = await Promise.all([
          subscriptionAPI.getSubscriptions(storedUserId),
          subscriptionAPI.getFrequentOrders(storedUserId),
        ]);

        if (subscriptionsResponse.data?.success) {
          setSubscriptions(subscriptionsResponse.data.data?.subscriptions || subscriptionsResponse.data.data || []);
        }

        if (frequentResponse.data?.success) {
          setFrequentOrders(frequentResponse.data.data?.orders || frequentResponse.data.data || []);
        }
      } catch (error) {
        console.error('Abonelikler yüklenemedi:', error);
      }
    } catch (error) {
      console.error('Abonelik verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubscription = async (subscriptionId, isActive) => {
    try {
      if (isActive) {
        const response = await subscriptionAPI.pauseSubscription(subscriptionId);
        if (response.data?.success) {
          Alert.alert('Başarılı', 'Abonelik duraklatıldı');
          loadSubscriptions();
        }
      } else {
        const response = await subscriptionAPI.resumeSubscription(subscriptionId);
        if (response.data?.success) {
          Alert.alert('Başarılı', 'Abonelik devam ettirildi');
          loadSubscriptions();
        }
      }
    } catch (error) {
      console.error('Abonelik güncelleme hatası:', error);
      Alert.alert('Hata', 'Abonelik güncellenirken bir hata oluştu');
    }
  };

  const cancelSubscription = async (subscriptionId) => {
    Alert.alert(
      'Aboneliği İptal Et',
      'Bu aboneliği iptal etmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await subscriptionAPI.cancelSubscription(subscriptionId);
              if (response.data?.success) {
                Alert.alert('Başarılı', 'Abonelik iptal edildi');
                loadSubscriptions();
              }
            } catch (error) {
              console.error('Abonelik iptal hatası:', error);
              Alert.alert('Hata', 'Abonelik iptal edilirken bir hata oluştu');
            }
          },
        },
      ]
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
        <Text style={styles.headerTitle}>Abonelikler</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Abonelik ile sevdiğin ürünleri otomatik olarak sipariş edebilir, %10-15 indirim ve ücretsiz kargo kazanabilirsin!
          </Text>
        </View>

        {/* Active Subscriptions */}
        {subscriptions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aktif Abonelikler</Text>
            {subscriptions.map((subscription) => (
              <View key={subscription.id} style={styles.subscriptionCard}>
                <View style={styles.subscriptionHeader}>
                  <View style={styles.productImage}>
                    <Ionicons name="cube" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.subscriptionInfo}>
                    <Text style={styles.productName}>{subscription.productName}</Text>
                    <Text style={styles.subscriptionDetails}>
                      {subscription.frequency} • {subscription.quantity} adet
                    </Text>
                    <View style={styles.benefitsRow}>
                      <View style={styles.benefitTag}>
                        <Text style={styles.benefitText}>%{subscription.discount} İndirim</Text>
                      </View>
                      {subscription.freeShipping && (
                        <View style={styles.benefitTag}>
                          <Text style={styles.benefitText}>Ücretsiz Kargo</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.subscriptionActions}>
                  <Switch
                    value={subscription.active}
                    onValueChange={(value) => toggleSubscription(subscription.id, value)}
                    trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                    thumbColor={COLORS.white}
                  />
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => cancelSubscription(subscription.id)}
                  >
                    <Ionicons name="trash" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.nextDelivery}>
                  Sonraki Teslimat: {subscription.nextDelivery || 'Belirlenmedi'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Frequent Orders */}
        {frequentOrders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sık Sipariş Verilenler</Text>
            <Text style={styles.sectionSubtitle}>
              Bu ürünleri aboneliğe çevirerek otomatik sipariş verebilirsin
            </Text>
            {frequentOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.frequentOrderCard}
                onPress={() => {
                  Alert.alert(
                    'Abonelik Oluştur',
                    `${order.productName} için abonelik oluşturmak ister misin?`,
                    [
                      { text: 'İptal', style: 'cancel' },
                      {
                        text: 'Oluştur',
                        onPress: () => {
                          // Navigate to create subscription
                          navigation.navigate('ProductDetail', { productId: order.productId });
                        },
                      },
                    ]
                  );
                }}
              >
                <View style={styles.productImage}>
                  <Ionicons name="cube" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.frequentOrderInfo}>
                  <Text style={styles.productName}>{order.productName}</Text>
                  <Text style={styles.orderCount}>{order.orderCount} kez sipariş verildi</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {subscriptions.length === 0 && frequentOrders.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="repeat" size={64} color={COLORS.gray400} />
            <Text style={styles.emptyStateText}>Henüz aboneliğin yok</Text>
            <Text style={styles.emptyStateSubtext}>
              Sık kullandığın ürünleri aboneliğe çevirerek otomatik sipariş verebilirsin
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('Shop')}
            >
              <Text style={styles.browseButtonText}>Ürünlere Göz At</Text>
            </TouchableOpacity>
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
  infoCard: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 16,
  },
  subscriptionCard: {
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
  subscriptionHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subscriptionInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  subscriptionDetails: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 8,
  },
  benefitsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  benefitTag: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  benefitText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  subscriptionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelButton: {
    padding: 8,
  },
  nextDelivery: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 8,
  },
  frequentOrderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  frequentOrderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  orderCount: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
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
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  browseButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});





