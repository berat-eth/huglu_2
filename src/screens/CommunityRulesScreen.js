import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const COMMUNITY_RULES = [
  {
    id: 1,
    title: 'Saygılı Olun',
    icon: 'heart-outline',
    description: 'Diğer kullanıcılara karşı saygılı ve nazik olun. Hakaret, ayrımcılık veya nefret söylemi kesinlikle yasaktır.',
  },
  {
    id: 2,
    title: 'Orijinal İçerik Paylaşın',
    icon: 'create-outline',
    description: 'Sadece kendi çektiğiniz fotoğrafları paylaşın. Başkalarının içeriklerini izinsiz kullanmayın.',
  },
  {
    id: 3,
    title: 'Uygunsuz İçerik Yasağı',
    icon: 'shield-outline',
    description: 'Müstehcen, şiddet içeren veya yasadışı içerik paylaşmayın. Bu tür içerikler anında silinir ve hesap kapatılabilir.',
  },
  {
    id: 4,
    title: 'Spam Yapmayın',
    icon: 'ban-outline',
    description: 'Tekrarlayan gönderiler, istenmeyen yorumlar veya reklam içerikleri paylaşmayın.',
  },
  {
    id: 5,
    title: 'Doğru Bilgi Paylaşın',
    icon: 'checkmark-circle-outline',
    description: 'Yanlış bilgi veya yanıltıcı içerik paylaşmayın. Topluluğun güvenini koruyun.',
  },
  {
    id: 6,
    title: 'Gizliliğe Saygı Gösterin',
    icon: 'lock-closed-outline',
    description: 'Başkalarının kişisel bilgilerini izinsiz paylaşmayın. Gizlilik haklarına saygı gösterin.',
  },
  {
    id: 7,
    title: 'Telif Hakları',
    icon: 'shield-checkmark-outline',
    description: 'Telif hakkı korumalı içerikleri izinsiz kullanmayın. Yasal sorumluluk size aittir.',
  },
  {
    id: 8,
    title: 'Etkileşim Kuralları',
    icon: 'chatbubbles-outline',
    description: 'Yorumlarınızda yapıcı olun. Tartışmalarda saygılı kalın ve kişisel saldırı yapmayın.',
  },
];

export default function CommunityRulesScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Topluluk Kuralları</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Introduction */}
        <View style={styles.introSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="people-outline" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.introTitle}>Hoş Geldiniz!</Text>
          <Text style={styles.introText}>
            Huğlu Outdoor topluluğuna katıldığınız için teşekkür ederiz. 
            Lütfen aşağıdaki kuralları okuyun ve uygulayın. Bu kurallar, 
            herkesin güvenli ve keyifli bir deneyim yaşaması için önemlidir.
          </Text>
        </View>

        {/* Rules List */}
        <View style={styles.rulesSection}>
          {COMMUNITY_RULES.map((rule, index) => (
            <View key={rule.id} style={styles.ruleCard}>
              <View style={styles.ruleHeader}>
                <View style={styles.ruleIconContainer}>
                  <Ionicons name={rule.icon} size={24} color={COLORS.primary} />
                </View>
                <View style={styles.ruleTitleContainer}>
                  <Text style={styles.ruleNumber}>{index + 1}</Text>
                  <Text style={styles.ruleTitle}>{rule.title}</Text>
                </View>
              </View>
              <Text style={styles.ruleDescription}>{rule.description}</Text>
            </View>
          ))}
        </View>

        {/* Important Notice */}
        <View style={styles.noticeSection}>
          <View style={styles.noticeHeader}>
            <Ionicons name="warning-outline" size={24} color={COLORS.error || '#FF3B30'} />
            <Text style={styles.noticeTitle}>Önemli Not</Text>
          </View>
          <Text style={styles.noticeText}>
            Bu kuralları ihlal eden kullanıcıların gönderileri silinebilir ve 
            hesapları geçici veya kalıcı olarak kapatılabilir. Topluluğumuzun 
            güvenliği ve refahı için bu kurallara uymanız gerekmektedir.
          </Text>
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Sorularınız mı var?</Text>
          <Text style={styles.contactText}>
            Topluluk kuralları hakkında sorularınız varsa veya bir kural ihlali 
            bildirmek istiyorsanız, lütfen destek ekibimizle iletişime geçin.
          </Text>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => navigation.navigate('LiveChatEntry')}
          >
            <Ionicons name="headset-outline" size={20} color={COLORS.white} />
            <Text style={styles.contactButtonText}>Destek Ekibiyle İletişime Geç</Text>
          </TouchableOpacity>
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
  introSection: {
    backgroundColor: COLORS.white,
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  introText: {
    fontSize: 15,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 22,
  },
  rulesSection: {
    padding: 16,
  },
  ruleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ruleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ruleTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ruleNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: 8,
    minWidth: 24,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1,
  },
  ruleDescription: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
    marginLeft: 60,
  },
  noticeSection: {
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.error || '#FF3B30',
    marginLeft: 8,
  },
  noticeText: {
    fontSize: 14,
    color: COLORS.gray700,
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});

