import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Input from '../components/Input';
import Button from '../components/Button';
import { COLORS } from '../constants/colors';
import { authAPI, userLevelAPI } from '../services/api';

export default function SignUpScreen({ navigation, route }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(route?.params?.referralCode || '');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatDateInput = (text) => {
    // Sadece rakamları al
    const numbers = text.replace(/[^\d]/g, '');
    
    // Otomatik format: GG/AA/YYYY
    if (numbers.length <= 2) {
      setDateOfBirth(numbers);
    } else if (numbers.length <= 4) {
      setDateOfBirth(`${numbers.slice(0, 2)}/${numbers.slice(2)}`);
    } else {
      setDateOfBirth(`${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`);
    }
  };

  const handleSignUp = async () => {
    // Validasyon
    if (!fullName || !email || !dateOfBirth || !password || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi girin');
      return;
    }

    // Doğum tarihi formatı kontrolü
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(dateOfBirth)) {
      Alert.alert('Hata', 'Doğum tarihi formatı GG/AA/YYYY olmalıdır (örn: 15/08/1994)');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    if (!agreeTerms) {
      Alert.alert('Hata', 'Kullanım koşullarını kabul etmelisiniz');
      return;
    }

    try {
      setLoading(true);
      console.log('📝 Signing up...', { fullName, email, dateOfBirth });

      const userData = {
        name: fullName,
        email: email,
        password: password,
        dateOfBirth: dateOfBirth,
        referralCode: referralCode || undefined,
      };

      const response = await authAPI.register(userData);
      console.log('✅ Register response:', response.data);

      if (response.data.success) {
        const user = response.data.data;
        const newUserId = user.id?.toString() || '';
        
        // Kullanıcı bilgilerini kaydet
        await AsyncStorage.multiSet([
          ['userId', newUserId],
          ['userName', user.name || fullName],
          ['userEmail', user.email || email],
          ['userPhone', user.phone || ''],
          ['userDateOfBirth', dateOfBirth],
          ['tenantId', '1'],
          ['isLoggedIn', 'true'],
        ]);

        // Referral kodu varsa, davet eden kullanıcıya EXP ekle
        if (referralCode) {
          try {
            // Referral kodundan userId'yi çıkar (örn: HUGLU123 -> 123)
            const referrerIdMatch = referralCode.match(/\d+$/);
            if (referrerIdMatch) {
              const referrerId = referrerIdMatch[0];
              await userLevelAPI.addInvitationExp(referrerId, newUserId);
              console.log('✅ Davet EXP eklendi, referrer:', referrerId);
            }
          } catch (expError) {
            console.log('⚠️ Davet EXP eklenemedi:', expError.message);
          }
        }

        console.log('✅ Registration successful, user data saved');
        const welcomeMessage = referralCode 
          ? 'Hesabınız oluşturuldu! Sizi davet eden arkadaşınız bonus EXP kazandı! 🎉'
          : 'Hesabınız oluşturuldu!';
        
        Alert.alert('Başarılı', welcomeMessage, [
          { text: 'Tamam', onPress: () => navigation.replace('Main') }
        ]);
      } else {
        Alert.alert('Hata', response.data.message || 'Kayıt başarısız');
      }
    } catch (error) {
      console.error('❌ Register error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Kayıt yapılamadı';
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hesap Oluştur</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Maceraya Katıl</Text>
          <Text style={styles.subtitle}>Bugün outdoor yolculuğunuza başlayın.</Text>

          <View style={styles.form}>
            <Input
              label="Ad Soyad"
              placeholder="Adınızı girin"
              value={fullName}
              onChangeText={setFullName}
              icon="person-outline"
            />

            <Input
              label="E-posta Adresi"
              placeholder="ornek@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              icon="mail-outline"
            />

            <Input
              label="Doğum Tarihi"
              placeholder="GG/AA/YYYY (örn: 15/08/1994)"
              value={dateOfBirth}
              onChangeText={formatDateInput}
              keyboardType="numeric"
              icon="calendar-outline"
              maxLength={10}
            />

            <Input
              label="Referans Kodu (Opsiyonel)"
              placeholder="Arkadaşınızın kodunu girin"
              value={referralCode}
              onChangeText={setReferralCode}
              icon="gift-outline"
              autoCapitalize="characters"
            />

            <Input
              label="Şifre"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon="lock-closed-outline"
            />

            <Input
              label="Şifre Tekrar"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              icon="lock-closed-outline"
            />

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreeTerms(!agreeTerms)}
            >
              <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                {agreeTerms && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
              </View>
              <Text style={styles.checkboxText}>
                <Pressable onPress={() => navigation.navigate('TermsOfService')}>
                  <Text style={styles.termsLink}>Kullanım Koşulları</Text>
                </Pressable>
                {' '}ve{' '}
                <Pressable onPress={() => navigation.navigate('PrivacyPolicy')}>
                  <Text style={styles.termsLink}>Gizlilik Politikası</Text>
                </Pressable>
                'nı kabul ediyorum
              </Text>
            </TouchableOpacity>

            <Button 
              title={loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'} 
              onPress={handleSignUp} 
              style={styles.signUpButton}
              disabled={loading}
            />
            {loading && (
              <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
            )}
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>veya devam et</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialButtons}>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-google" size={20} color={COLORS.textMain} />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-apple" size={20} color={COLORS.textMain} />
              <Text style={styles.socialButtonText}>Apple</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Zaten hesabınız var mı? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.footerLink}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    textAlign: 'center',
    marginRight: 40,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray500,
    marginBottom: 32,
  },
  form: {
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMain,
    lineHeight: 20,
  },
  termsLink: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  signUpButton: {
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray200,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: COLORS.gray400,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  loader: {
    marginTop: 12,
  },
});
