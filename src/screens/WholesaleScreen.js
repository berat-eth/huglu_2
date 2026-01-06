import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Input from '../components/Input';
import { COLORS } from '../constants/colors';
import { wholesaleAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

export default function WholesaleScreen({ navigation }) {
  const alert = useAlert();
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBusinessTypeDropdown, setShowBusinessTypeDropdown] = useState(false);

  const businessTypes = [
    { value: 'retail', label: 'Perakende Mağaza' },
    { value: 'ecommerce', label: 'E-Ticaret' },
    { value: 'distributor', label: 'Distribütör' },
    { value: 'other', label: 'Diğer' },
  ];

  const handleSubmit = async () => {
    // Validasyon
    if (!companyName || !contactPerson || !email || !phone || !businessType) {
      alert.show('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (!email.includes('@')) {
      alert.show('Hata', 'Geçerli bir e-posta adresi girin');
      return;
    }

    // Telefon formatı kontrolü (basit)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phone) || phone.length < 10) {
      alert.show('Hata', 'Geçerli bir telefon numarası girin');
      return;
    }

    try {
      setLoading(true);

      const formData = {
        companyName,
        contactPerson,
        email,
        phone,
        businessType,
      };

      // API isteği gönder
      const response = await wholesaleAPI.apply(formData);

      if (response.data?.success) {
        // Başvuru verilerini durum sayfasına gönder
        const applicationData = {
          companyName,
          businessType,
          email,
          applicationId: response.data?.data?.applicationId || `WS-${Date.now().toString().slice(-6)}`,
        };
        
        // Durum sayfasına yönlendir
        navigation.replace('WholesaleStatus', { applicationData });
      } else {
        alert.show('Hata', response.data?.message || 'Başvuru gönderilemedi');
      }
    } catch (error) {
      console.error('Wholesale application error:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Başvuru gönderilemedi. Lütfen tekrar deneyin.';
      alert.show('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:toptan@hugluoutdoor.com');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Toptan Satış Programı</Text>
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="storefront-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.heroTitle}>Bizimle Ortak Olun</Text>
            <Text style={styles.heroSubtitle}>
              Premium perakende ağımıza katılın. İşletmenizin büyümesine yardımcı olmak için rekabetçi toptan fiyatlarla yüksek kaliteli outdoor ürünleri sunuyoruz.
            </Text>
          </View>

          {/* Program Benefits */}
          <View style={styles.benefitsSection}>
            <Text style={styles.sectionTitle}>Program Avantajları</Text>
            <View style={styles.benefitsGrid}>
              <View style={styles.benefitCard}>
                <Ionicons name="pricetag-outline" size={24} color={COLORS.primary} />
                <Text style={styles.benefitTitle}>Toplu İndirimler</Text>
                <Text style={styles.benefitDescription}>
                  Büyük siparişler için kademeli fiyatlandırma.
                </Text>
              </View>

              <View style={styles.benefitCard}>
                <Ionicons name="cube-outline" size={24} color={COLORS.primary} />
                <Text style={styles.benefitTitle}>Öncelikli Kargo</Text>
                <Text style={styles.benefitDescription}>
                  Ortaklarımız için hızlı işleme.
                </Text>
              </View>

              <View style={[styles.benefitCard, styles.benefitCardWide]}>
                <View style={styles.supportIconContainer}>
                  <Ionicons name="headset-outline" size={28} color={COLORS.primary} />
                </View>
                <View style={styles.supportContent}>
                  <Text style={styles.benefitTitle}>Özel Destek</Text>
                  <Text style={styles.benefitDescription}>
                    B2B ekibimizle doğrudan iletişim hattı.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Application Form */}
          <View style={styles.formSection}>
            <View style={styles.formHeader}>
              <Text style={styles.sectionTitle}>Başvuru Formu</Text>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>Ücretsiz başvuru</Text>
              </View>
            </View>

            <View style={styles.form}>
              <Input
                label="Şirket Adı"
                placeholder="Ticaret Şirketi"
                value={companyName}
                onChangeText={setCompanyName}
                icon="business-outline"
              />

              <Input
                label="İletişim Kişisi"
                placeholder="Ad Soyad"
                value={contactPerson}
                onChangeText={setContactPerson}
                icon="person-outline"
              />

              <Input
                label="E-posta"
                placeholder="isim@sirket.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                icon="mail-outline"
              />

              <Input
                label="Telefon Numarası"
                placeholder="+90 (555) 000-0000"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                icon="call-outline"
              />

              {/* Business Type Dropdown */}
              <View style={styles.dropdownContainer}>
                <Text style={styles.label}>İş Tipi</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdown,
                    showBusinessTypeDropdown && styles.dropdownFocused,
                  ]}
                  onPress={() => setShowBusinessTypeDropdown(!showBusinessTypeDropdown)}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !businessType && styles.dropdownPlaceholder,
                    ]}
                  >
                    {businessType
                      ? businessTypes.find((t) => t.value === businessType)?.label
                      : 'Tip seçin'}
                  </Text>
                  <Ionicons
                    name={showBusinessTypeDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={COLORS.gray400}
                  />
                </TouchableOpacity>

                {showBusinessTypeDropdown && (
                  <View style={styles.dropdownOptions}>
                    {businessTypes.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setBusinessType(type.value);
                          setShowBusinessTypeDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownOptionText}>{type.label}</Text>
                        {businessType === type.value && (
                          <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Başvuruyu Gönder</Text>
                    <Ionicons name="send-outline" size={20} color={COLORS.white} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Contact Section */}
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>Sorularınız mı var?</Text>
            <Text style={styles.contactDescription}>
              Ekibimiz sorularınızı yanıtlamak için burada.
            </Text>
            <TouchableOpacity
              style={styles.emailButton}
              onPress={handleEmailPress}
            >
              <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
              <Text style={styles.emailText}>toptan@hugluoutdoor.com</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    backgroundColor: COLORS.backgroundLight,
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
    flex: 1,
    textAlign: 'center',
  },
  infoButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroSection: {
    padding: 24,
    paddingBottom: 32,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  benefitsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
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
    width: '47%',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  benefitCardWide: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 0,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 8,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 12,
    color: COLORS.gray600,
    lineHeight: 16,
  },
  supportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  supportContent: {
    flex: 1,
  },
  formSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  freeBadge: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  form: {
    gap: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 4,
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
  },
  dropdownFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textMain,
  },
  dropdownPlaceholder: {
    color: COLORS.gray400,
  },
  dropdownOptions: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: COLORS.textMain,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  contactSection: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 12,
    textAlign: 'center',
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

