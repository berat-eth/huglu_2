import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import secureStorage from '../utils/secureStorage';
import Input from '../components/Input';
import Button from '../components/Button';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';
import { COLORS } from '../constants/colors';
import { authAPI } from '../services/api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    // Validasyon
    if (!email || !password) {
      setErrorMessage('Lütfen tüm alanları doldurun');
      setShowErrorModal(true);
      return;
    }

    if (!email.includes('@')) {
      setErrorMessage('Geçerli bir e-posta adresi girin');
      setShowErrorModal(true);
      return;
    }

    try {
      setLoading(true);
      console.log('🔐 Logging in...', { email });

      const response = await authAPI.login(email, password);
      console.log('✅ Login response:', response.data);

      if (response.data.success) {
        const userData = response.data.data;
        
        // GÜVENLİK: Kullanıcı bilgilerini SecureStorage'da kaydet (hassas veriler)
        await secureStorage.multiSet([
          ['userId', userData.id?.toString() || ''],
          ['userName', userData.name || email.split('@')[0]],
          ['userEmail', userData.email || email],
          ['userPhone', userData.phone || ''],
          ['tenantId', userData.tenantId?.toString() || '1'],
          ['isLoggedIn', 'true'],
        ]);

        console.log('✅ Login successful, user data saved');
        setShowSuccessModal(true);
      } else {
        setErrorMessage(response.data.message || 'Giriş başarısız');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Giriş yapılamadı');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/logo.jpg')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Hoş Geldiniz</Text>
          <Text style={styles.subtitle}>Macera için hazırlanın.</Text>

          <View style={styles.form}>
            <Input
              label="E-posta Adresi"
              placeholder="ornek@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              icon="mail-outline"
            />

            <Input
              label="Şifre"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon="lock-closed-outline"
            />

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Şifremi Unuttum?</Text>
            </TouchableOpacity>

            <Button 
              title={loading ? 'Giriş yapılıyor...' : 'Giriş Yap'} 
              onPress={handleLogin} 
              style={styles.loginButton}
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
            <Text style={styles.footerText}>Hesabınız yok mu? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.footerLink}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigation.replace('Main');
        }}
        title="Başarılı"
        message="Giriş yapıldı!"
        onActionPress={() => {
          setShowSuccessModal(false);
          navigation.replace('Main');
        }}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 180,
    height: 180,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loginButton: {
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
    marginTop: 'auto',
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
