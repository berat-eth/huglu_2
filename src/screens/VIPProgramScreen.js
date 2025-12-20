import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { vipAPI } from '../services/api';

export default function VIPProgramScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [vipStatus, setVipStatus] = useState(null);
  const [benefits, setBenefits] = useState([]);
  const [exclusiveProducts, setExclusiveProducts] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    loadVIPData();
  }, []);

  const loadVIPData = async () => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        navigation.replace('Login');
        return;
      }

      setUserId(storedUserId);

      try {
        const [statusResponse, benefitsResponse, productsResponse, eventsResponse] = await Promise.all([
          vipAPI.getVIPStatus(storedUserId),
          vipAPI.getVIPBenefits(storedUserId),
          vipAPI.getExclusiveProducts(storedUserId),
          vipAPI.getUpcomingEvents(storedUserId),
        ]);

        if (statusResponse.data?.success) {
          setVipStatus(statusResponse.data.data);
        }

        if (benefitsResponse.data?.success) {
          setBenefits(benefitsResponse.data.data?.benefits || benefitsResponse.data.data || []);
        } else {
          setBenefits(generateSampleBenefits());
        }

        if (productsResponse.data?.success) {
          setExclusiveProducts(productsResponse.data.data?.products || productsResponse.data.data || []);
        }

        if (eventsResponse.data?.success) {
          setUpcomingEvents(eventsResponse.data.data?.events || eventsResponse.data.data || []);
        }
      } catch (error) {
        console.error('VIP verileri yüklenemedi:', error);
        setBenefits(generateSampleBenefits());
      }
    } catch (error) {
      console.error('VIP verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleBenefits = () => {
    return [
      { id: 1, title: 'Özel Ürün Erken Erişim', description: 'Yeni koleksiyonlara önce sen eriş', icon: 'star', active: true },
      { id: 2, title: 'Kişisel Alışveriş Danışmanı', description: '7/24 özel danışman desteği', icon: 'person', active: true },
      { id: 3, title: 'Özel Etkinliklere Davet', description: 'VIP etkinliklere özel davet', icon: 'calendar', active: true },
      { id: 4, title: '%30 İndirim', description: 'Tüm ürünlerde özel indirim', icon: 'pricetag', active: true },
      { id: 5, title: 'Ücretsiz Kargo', description: 'Tüm siparişlerde ücretsiz kargo', icon: 'car', active: true },
      { id: 6, title: 'Öncelikli Müşteri Hizmetleri', description: 'Hızlı ve öncelikli destek', icon: 'headset', active: true },
    ];
  };

  const convertExpToCoupon = async (expAmount) => {
    if (!userId) return;

    try {
      const response = await vipAPI.convertExpToCoupon(userId, expAmount);
      if (response.data?.success) {
        Alert.alert('Başarılı', `${expAmount} EXP, indirim kuponuna çevrildi!`);
      } else {
        Alert.alert('Hata', response.data?.message || 'Dönüşüm yapılamadı');
      }
    } catch (error) {
      console.error('EXP dönüşüm hatası:', error);
      Alert.alert('Hata', 'Dönüşüm yapılırken bir hata oluştu');
    }
  };

  const isVIP = vipStatus?.isVIP || false;
  const currentLevel = vipStatus?.level || 'Bronze';

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
        <Text style={styles.headerTitle}>VIP Program</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* VIP Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="diamond" size={32} color={isVIP ? '#f59e0b' : COLORS.gray400} />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>{isVIP ? 'VIP Üye' : 'VIP Değilsin'}</Text>
              <Text style={styles.statusSubtitle}>
                {isVIP ? 'Tüm avantajlardan yararlanıyorsun!' : `${currentLevel} seviyesindesin`}
              </Text>
            </View>
          </View>
          {!isVIP && (
            <View style={styles.upgradePrompt}>
              <Text style={styles.upgradeText}>
                Diamond seviyesine ulaşarak VIP üye olabilirsin!
              </Text>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => navigation.navigate('UserLevel')}
              >
                <Text style={styles.upgradeButtonText}>Seviyeyi Gör</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VIP Avantajları</Text>
          {benefits.map((benefit) => (
            <View key={benefit.id} style={styles.benefitCard}>
              <View style={[styles.benefitIcon, !benefit.active && styles.benefitIconInactive]}>
                <Ionicons
                  name={benefit.icon}
                  size={24}
                  color={benefit.active ? COLORS.primary : COLORS.gray400}
                />
              </View>
              <View style={styles.benefitInfo}>
                <Text style={[styles.benefitTitle, !benefit.active && styles.benefitTitleInactive]}>
                  {benefit.title}
                </Text>
                <Text style={[styles.benefitDescription, !benefit.active && styles.benefitDescriptionInactive]}>
                  {benefit.description}
                </Text>
              </View>
              {benefit.active && (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              )}
            </View>
          ))}
        </View>

        {/* EXP to Coupon Conversion */}
        {isVIP && (
          <View style={styles.convertSection}>
            <Text style={styles.sectionTitle}>EXP'yi Kupon'a Çevir</Text>
            <View style={styles.convertCard}>
              <Text style={styles.convertDescription}>
                Biriktirdiğin EXP'leri indirim kuponuna çevirebilirsin
              </Text>
              <View style={styles.convertOptions}>
                <TouchableOpacity
                  style={styles.convertOption}
                  onPress={() => convertExpToCoupon(1000)}
                >
                  <Text style={styles.convertOptionText}>1000 EXP → %10 Kupon</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.convertOption}
                  onPress={() => convertExpToCoupon(2500)}
                >
                  <Text style={styles.convertOptionText}>2500 EXP → %20 Kupon</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.convertOption}
                  onPress={() => convertExpToCoupon(5000)}
                >
                  <Text style={styles.convertOptionText}>5000 EXP → %30 Kupon</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Exclusive Products */}
        {isVIP && exclusiveProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Özel Ürünler</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {exclusiveProducts.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
                >
                  <View style={styles.productImage}>
                    <Ionicons name="cube" size={32} color={COLORS.primary} />
                  </View>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.productPrice}>{product.price} TL</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Upcoming Events */}
        {isVIP && upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yaklaşan Etkinlikler</Text>
            {upcomingEvents.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventIcon}>
                  <Ionicons name="calendar" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDate}>{event.date}</Text>
                  <Text style={styles.eventDescription}>{event.description}</Text>
                </View>
              </View>
            ))}
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
  statusCard: {
    margin: 16,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: COLORS.gray600,
  },
  upgradePrompt: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
  },
  upgradeText: {
    fontSize: 14,
    color: COLORS.textMain,
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  benefitCard: {
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
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitIconInactive: {
    backgroundColor: COLORS.gray100,
  },
  benefitInfo: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  benefitTitleInactive: {
    color: COLORS.gray500,
  },
  benefitDescription: {
    fontSize: 14,
    color: COLORS.gray600,
  },
  benefitDescriptionInactive: {
    color: COLORS.gray400,
  },
  convertSection: {
    padding: 16,
    paddingTop: 0,
  },
  convertCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  convertDescription: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 16,
  },
  convertOptions: {
    gap: 8,
  },
  convertOption: {
    backgroundColor: COLORS.gray50,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  convertOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  productCard: {
    width: 140,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 100,
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  eventCard: {
    flexDirection: 'row',
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
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: COLORS.gray600,
  },
});



