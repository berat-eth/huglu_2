import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../components/Button';
import Input from '../components/Input';
import { COLORS } from '../constants/colors';
import { userAPI } from '../services/api';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';

export default function TwoFactorAuthScreen({ navigation }) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  React.useEffect(() => {
    loadTwoFactorStatus();
  }, []);

  const loadTwoFactorStatus = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      // API'den 2FA durumunu yükle
      try {
        const response = await userAPI.getTwoFactorStatus(userId);
        if (response.data?.success) {
          setTwoFactorEnabled(response.data.enabled || false);
          setPhoneNumber(response.data.phoneNumber || '');
        }
      } catch (error) {
        console.log('2FA durumu yüklenemedi:', error);
        // Local storage'dan yükle
        const stored = await AsyncStorage.getItem('twoFactorEnabled');
        setTwoFactorEnabled(stored === 'true');
      }
    } catch (error) {
      console.error('2FA durumu yükleme hatası:', error);
    }
  };

  const handleToggleTwoFactor = async () => {
    if (!twoFactorEnabled) {
      // 2FA'yı etkinleştirmek için telefon numarası gerekli
      if (!phoneNumber.trim()) {
        Alert.alert('Telefon Numarası Gerekli', 'İki faktörlü doğrulamayı etkinleştirmek için telefon numaranızı girin');
        return;
      }

      // Telefon numarası doğrulama
      const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
      if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
        setErrorMessage('Geçerli bir telefon numarası girin (örn: 05551234567)');
        setShowErrorModal(true);
        return;
      }

      try {
        setLoading(true);
        const userId = await AsyncStorage.getItem('userId');
        
        // Doğrulama kodu gönder
        await userAPI.sendTwoFactorCode(userId, phoneNumber.trim());
        setShowVerification(true);
      } catch (error) {
        console.error('Doğrulama kodu gönderme hatası:', error);
        setErrorMessage(error.response?.data?.message || 'Doğrulama kodu gönderilemedi');
        setShowErrorModal(true);
      } finally {
        setLoading(false);
      }
    } else {
      // 2FA'yı devre dışı bırak
      Alert.alert(
        'İki Faktörlü Doğrulamayı Devre Dışı Bırak',
        'İki faktörlü doğrulamayı devre dışı bırakmak istediğinize emin misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Devre Dışı Bırak',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                const userId = await AsyncStorage.getItem('userId');
                await userAPI.disableTwoFactor(userId);
                setTwoFactorEnabled(false);
                await AsyncStorage.setItem('twoFactorEnabled', 'false');
                setShowSuccessModal(true);
              } catch (error) {
                setErrorMessage('İki faktörlü doğrulama devre dışı bırakılamadı');
                setShowErrorModal(true);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setErrorMessage('Lütfen 6 haneli doğrulama kodunu girin');
      setShowErrorModal(true);
      return;
    }

    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('userId');
      
      await userAPI.verifyTwoFactorCode(userId, verificationCode.trim());
      setTwoFactorEnabled(true);
      await AsyncStorage.setItem('twoFactorEnabled', 'true');
      setShowVerification(false);
      setVerificationCode('');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Doğrulama hatası:', error);
      setErrorMessage(error.response?.data?.message || 'Doğrulama kodu hatalı');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İki Faktörlü Doğrulama</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="shield-checkmark-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.infoTitle}>Hesabınızı Koruyun</Text>
          <Text style={styles.infoText}>
            İki faktörlü doğrulama ile hesabınıza ekstra bir güvenlik katmanı ekleyin. Giriş yaparken telefonunuza gönderilen doğrulama kodunu girmeniz gerekecektir.
          </Text>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusLeft}>
              <View style={[
                styles.statusIcon,
                twoFactorEnabled && styles.statusIconActive
              ]}>
                <Ionicons 
                  name={twoFactorEnabled ? 'shield-checkmark' : 'shield-outline'} 
                  size={24} 
                  color={twoFactorEnabled ? COLORS.primary : COLORS.gray400} 
                />
              </View>
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>
                  {twoFactorEnabled ? 'Etkin' : 'Devre Dışı'}
                </Text>
                <Text style={styles.statusDescription}>
                  {twoFactorEnabled 
                    ? 'İki faktörlü doğrulama aktif' 
                    : 'İki faktörlü doğrulama kapalı'}
                </Text>
              </View>
            </View>
            <Switch
              value={twoFactorEnabled}
              onValueChange={handleToggleTwoFactor}
              trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
              thumbColor={COLORS.white}
              disabled={loading}
            />
          </View>
        </View>

        {/* Phone Number Input */}
        {!twoFactorEnabled && (
          <View style={styles.form}>
            <Input
              label="Telefon Numarası *"
              placeholder="05551234567"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              icon="call-outline"
              maxLength={15}
            />
            <Text style={styles.helpText}>
              Telefon numaranıza SMS ile doğrulama kodu gönderilecektir.
            </Text>
          </View>
        )}

        {/* Verification Code Input */}
        {showVerification && !twoFactorEnabled && (
          <View style={styles.form}>
            <Input
              label="Doğrulama Kodu *"
              placeholder="6 haneli kod"
              value={verificationCode}
              onChangeText={(text) => setVerificationCode(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="numeric"
              icon="keypad-outline"
              maxLength={6}
            />
            <TouchableOpacity 
              style={styles.resendButton}
              onPress={() => {
                const userId = AsyncStorage.getItem('userId');
                if (userId) {
                  userAPI.sendTwoFactorCode(userId, phoneNumber.trim());
                  Alert.alert('Başarılı', 'Doğrulama kodu tekrar gönderildi');
                }
              }}
            >
              <Text style={styles.resendButtonText}>Kodu Tekrar Gönder</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Benefits */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Avantajlar:</Text>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            <Text style={styles.benefitText}>Hesap güvenliğiniz artar</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            <Text style={styles.benefitText}>Yetkisiz erişimleri önler</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            <Text style={styles.benefitText}>Şifre çalınması durumunda koruma sağlar</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      {showVerification && !twoFactorEnabled && (
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <Button
            title="Doğrula"
            onPress={handleVerifyCode}
            loading={loading}
          />
        </SafeAreaView>
      )}

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          if (twoFactorEnabled) {
            navigation.goBack();
          }
        }}
        title="Başarılı"
        message={twoFactorEnabled 
          ? 'İki faktörlü doğrulama başarıyla etkinleştirildi' 
          : 'İki faktörlü doğrulama devre dışı bırakıldı'}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  },
  scrollContent: {
    paddingBottom: 24,
  },
  infoCard: {
    margin: 16,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    alignItems: 'center',
  },
  infoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 20,
  },
  statusCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconActive: {
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 13,
    color: COLORS.gray600,
  },
  form: {
    padding: 16,
    paddingTop: 0,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  resendButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  benefitsCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.gray700,
    flex: 1,
  },
  bottomBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
});


