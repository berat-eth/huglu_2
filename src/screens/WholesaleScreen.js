import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import Button from '../components/Button';
import LoginRequiredModal from '../components/LoginRequiredModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BENEFITS = [
  {
    id: 1,
    icon: 'pricetag',
    title: 'Özel Fiyatlar',
    description: 'Toptan alımlarda özel indirimli fiyatlar',
  },
  {
    id: 2,
    icon: 'cube',
    title: 'Minimum Sipariş',
    description: 'Minimum 50 adet sipariş ile başlayın',
  },
  {
    id: 3,
    icon: 'truck',
    title: 'Ücretsiz Kargo',
    description: 'Belirli tutar üzeri ücretsiz kargo',
  },
  {
    id: 4,
    icon: 'business',
    title: 'Kurumsal Çözümler',
    description: 'Kurumsal ihtiyaçlarınıza özel çözümler',
  },
  {
    id: 5,
    icon: 'card',
    title: 'Esnek Ödeme',
    description: 'Vadeli ödeme seçenekleri',
  },
  {
    id: 6,
    icon: 'headset',
    title: 'Özel Destek',
    description: '7/24 özel müşteri temsilcisi desteği',
  },
];

export default function WholesaleScreen({ navigation }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    taxNumber: '',
    address: '',
    minOrderQuantity: '',
    productInterest: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const isLoggedInValue = await AsyncStorage.getItem('isLoggedIn');
      setIsLoggedIn(isLoggedInValue === 'true');
    } catch (error) {
      console.error('Login durumu kontrol edilemedi:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.companyName.trim()) {
      Alert.alert('Hata', 'Lütfen şirket adını girin');
      return false;
    }
    if (!formData.contactName.trim()) {
      Alert.alert('Hata', 'Lütfen iletişim kişisi adını girin');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Hata', 'Lütfen e-posta adresini girin');
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Hata', 'Lütfen telefon numarasını girin');
      return false;
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Hata', 'Lütfen geçerli bir e-posta adresi girin');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    try {
      setSubmitting(true);
      
      // TODO: API çağrısı yapılacak
      // const response = await wholesaleAPI.submitRequest(formData);
      
      // Simüle edilmiş başarı
      setTimeout(() => {
        setSubmitting(false);
        Alert.alert(
          'Başarılı',
          'Toptan satış talebiniz alındı. En kısa sürede sizinle iletişime geçeceğiz.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                // Formu temizle
                setFormData({
                  companyName: '',
                  contactName: '',
                  email: '',
                  phone: '',
                  taxNumber: '',
                  address: '',
                  minOrderQuantity: '',
                  productInterest: '',
                  message: '',
                });
                navigation.goBack();
              },
            },
          ]
        );
      }, 1500);
    } catch (error) {
      setSubmitting(false);
      Alert.alert('Hata', 'Talebiniz gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Toptan Satış</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="storefront" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>Toptan Satış Çözümleri</Text>
          <Text style={styles.heroSubtitle}>
            İşletmeniz için özel fiyatlar ve avantajlı koşullarla toptan alışveriş yapın
          </Text>
        </View>

        {/* Benefits Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avantajlarımız</Text>
          <View style={styles.benefitsGrid}>
            {BENEFITS.map((benefit) => (
              <View key={benefit.id} style={styles.benefitCard}>
                <View style={styles.benefitIconContainer}>
                  <Ionicons name={benefit.icon} size={28} color={COLORS.primary} />
                </View>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="information-circle" size={24} color={COLORS.primary} />
              <Text style={styles.infoCardTitle}>Minimum Sipariş</Text>
            </View>
            <Text style={styles.infoCardText}>
              Toptan satış için minimum sipariş miktarı 50 adettir. Daha fazla adet için özel fiyat teklifi alabilirsiniz.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="time" size={24} color={COLORS.primary} />
              <Text style={styles.infoCardTitle}>Teslimat Süresi</Text>
            </View>
            <Text style={styles.infoCardText}>
              Stokta bulunan ürünler için 3-5 iş günü içinde teslimat. Özel üretimler için süre değişkenlik gösterebilir.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="call" size={24} color={COLORS.primary} />
              <Text style={styles.infoCardTitle}>İletişim</Text>
            </View>
            <Text style={styles.infoCardText}>
              Toptan satış ekibimizle iletişime geçmek için formu doldurun veya doğrudan bizi arayın.
            </Text>
          </View>
        </View>

        {/* Contact Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Toptan Satış Talebi</Text>
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Şirket Adı *</Text>
              <TextInput
                style={styles.input}
                placeholder="Şirket adınızı girin"
                value={formData.companyName}
                onChangeText={(value) => handleInputChange('companyName', value)}
                placeholderTextColor={COLORS.gray400}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>İletişim Kişisi *</Text>
              <TextInput
                style={styles.input}
                placeholder="Adınız ve soyadınız"
                value={formData.contactName}
                onChangeText={(value) => handleInputChange('contactName', value)}
                placeholderTextColor={COLORS.gray400}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>E-posta *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ornek@email.com"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={COLORS.gray400}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Telefon *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="05XX XXX XX XX"
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  keyboardType="phone-pad"
                  placeholderTextColor={COLORS.gray400}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vergi No / TC No</Text>
              <TextInput
                style={styles.input}
                placeholder="Vergi numaranızı girin"
                value={formData.taxNumber}
                onChangeText={(value) => handleInputChange('taxNumber', value)}
                placeholderTextColor={COLORS.gray400}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adres</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Şirket adresinizi girin"
                value={formData.address}
                onChangeText={(value) => handleInputChange('address', value)}
                multiline
                numberOfLines={3}
                placeholderTextColor={COLORS.gray400}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Minimum Sipariş Miktarı</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: 100 adet"
                value={formData.minOrderQuantity}
                onChangeText={(value) => handleInputChange('minOrderQuantity', value)}
                keyboardType="numeric"
                placeholderTextColor={COLORS.gray400}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>İlgilendiğiniz Ürünler</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Hangi ürünlerle ilgilendiğinizi belirtin"
                value={formData.productInterest}
                onChangeText={(value) => handleInputChange('productInterest', value)}
                multiline
                numberOfLines={3}
                placeholderTextColor={COLORS.gray400}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mesaj</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Eklemek istediğiniz notlar..."
                value={formData.message}
                onChangeText={(value) => handleInputChange('message', value)}
                multiline
                numberOfLines={4}
                placeholderTextColor={COLORS.gray400}
              />
            </View>

            <Button
              title={submitting ? 'Gönderiliyor...' : 'Talebi Gönder'}
              onPress={handleSubmit}
              disabled={submitting}
              style={styles.submitButton}
            />
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={20} color={COLORS.primary} />
              <Text style={styles.contactText}>0850 XXX XX XX</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
              <Text style={styles.contactText}>toptan@hugluoutdoor.com</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              <Text style={styles.contactText}>Pazartesi - Cuma: 09:00 - 18:00</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Login Required Modal */}
      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => {
          setShowLoginModal(false);
          navigation.navigate('Login');
        }}
        message="Toptan satış talebi göndermek için lütfen giriş yapın"
      />
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 32,
    backgroundColor: COLORS.white,
  },
  heroIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  benefitCard: {
    width: '48%',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    alignItems: 'center',
  },
  benefitIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
    textAlign: 'center',
  },
  benefitDescription: {
    fontSize: 12,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 16,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: 16,
    marginBottom: 12,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  infoCardText: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textMain,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 8,
  },
  contactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: 20,
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.gray600,
    flex: 1,
  },
});

