import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../components/Button';
import { COLORS } from '../constants/colors';
import { userAPI } from '../services/api';

export default function PersonalInfoScreen({ navigation }) {
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      setLoading(true);
      const [userName, userEmail, userPhone, userDOB, userHeight, userWeight, userHomeAddr, userWorkAddr] = await AsyncStorage.multiGet([
        'userName',
        'userEmail',
        'userPhone',
        'userDateOfBirth',
        'userHeight',
        'userWeight',
        'userHomeAddress',
        'userWorkAddress',
      ]);

      setName(userName[1] || '');
      setEmail(userEmail[1] || '');
      setPhone(userPhone[1] || '');
      setDateOfBirth(userDOB[1] || '');
      setHeight(userHeight[1] || '');
      setWeight(userWeight[1] || '');
      setHomeAddress(userHomeAddr[1] || '');
      setWorkAddress(userWorkAddr[1] || '');
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenemedi:', error);
      Alert.alert('Hata', 'Bilgiler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validasyon
    if (!name.trim()) {
      Alert.alert('Hata', 'Lütfen adınızı girin');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Hata', 'Lütfen geçerli bir e-posta adresi girin');
      return;
    }

    try {
      setSaving(true);

      // Bilgileri local storage'a kaydet (boy ve kilo kaydedilmez)
      await AsyncStorage.multiSet([
        ['userName', name.trim()],
        ['userEmail', email.trim()],
        ['userPhone', phone.trim()],
        ['userDateOfBirth', dateOfBirth.trim()],
        ['userHomeAddress', homeAddress.trim()],
        ['userWorkAddress', workAddress.trim()],
      ]);

      // API'ye gönder (boy ve kilo gönderilmez)
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          const userData = {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            dateOfBirth: dateOfBirth.trim(),
          };

          await userAPI.updateProfile(userId, userData);
          console.log('✅ Profil API\'ye güncellendi');
        }
      } catch (apiError) {
        console.log('⚠️ API güncellemesi başarısız:', apiError.message);
        // Local storage'a kaydedildi, API hatası kullanıcıya gösterilmez
      }

      Alert.alert('Başarılı', 'Bilgileriniz güncellendi', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Bilgiler kaydedilemedi:', error);
      Alert.alert('Hata', 'Bilgiler kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };


  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              Alert.alert('Hata', 'Hesap silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kişisel Bilgiler</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kişisel Bilgilerim</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={50} color="#fff" />
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="pencil" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{name || 'Kullanıcı Adı'}</Text>
          <Text style={styles.profileMemberSince}>2021'den beri üye</Text>
        </View>

        {/* Identity Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Kimlik Bilgileri</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>AD SOYAD</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Adınız Soyadınız"
                placeholderTextColor={COLORS.gray400}
              />
              <Ionicons name="person-outline" size={20} color={COLORS.gray400} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>DOĞUM TARİHİ</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="15/08/1994"
                placeholderTextColor={COLORS.gray400}
              />
              <Ionicons name="calendar-outline" size={20} color={COLORS.gray400} />
            </View>
          </View>

          <View style={styles.twoColumnRow}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>BOY (cm)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="175"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.gray400}
                  maxLength={3}
                />
                <Ionicons name="resize-outline" size={20} color={COLORS.gray400} />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>KİLO (kg)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="70"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.gray400}
                  maxLength={3}
                />
                <Ionicons name="fitness-outline" size={20} color={COLORS.gray400} />
              </View>
            </View>
          </View>
        </View>

        {/* Contact Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>E-POSTA ADRESİ</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                keyboardType="email-address"
                placeholderTextColor={COLORS.gray400}
              />
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                <Text style={styles.verifiedText}>DOĞRULANDI</Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>TELEFON NUMARASI</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="0555 123 45 67"
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.gray400}
              />
              <Ionicons name="call-outline" size={20} color={COLORS.gray400} />
            </View>
          </View>
        </View>

        {/* Addresses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithAction}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Adresler</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.addNewText}>Yeni Ekle</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.addressCard}>
            <View style={styles.addressIconContainer}>
              <Ionicons name="home" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.addressInfo}>
              <View style={styles.addressHeader}>
                <Text style={styles.addressType}>Ev</Text>
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>VARSAYILAN</Text>
                </View>
              </View>
              <Text style={styles.addressText}>Örnek Mahallesi, Örnek Sokak No:42</Text>
              <Text style={styles.addressText}>İstanbul, Türkiye</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.addressCard}>
            <View style={styles.addressIconContainer}>
              <Ionicons name="briefcase" size={24} color={COLORS.gray500} />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressType}>İş</Text>
              <Text style={styles.addressText}>İş Merkezi, Kat:4 No:400</Text>
              <Text style={styles.addressText}>Ankara, Türkiye</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
          </TouchableOpacity>
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Ionicons name="lock-closed" size={16} color={COLORS.gray500} />
          <Text style={styles.securityText}>Verileriniz güvenli şekilde şifrelenmektedir</Text>
        </View>

        {/* Save Button */}
        <Button
          title={saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          onPress={handleSave}
          disabled={saving}
          style={styles.saveButton}
        />

        {/* Delete Account */}
        <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Hesabı Sil</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
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
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.gray500,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#5DADE2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  profileMemberSince: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    marginTop: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginLeft: 8,
  },
  addNewText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  twoColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#000',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 4,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  addressIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressInfo: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginHorizontal: 16,
  },
  securityText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 6,
  },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  deleteButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
