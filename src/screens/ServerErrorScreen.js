import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const ServerErrorScreen = ({ onRetry, onClose, onContactSupport }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-offline-outline" size={120} color={COLORS.primary} />
        </View>

        {/* Error Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.title}>Bağlantı Hatası</Text>
          <Text style={styles.description}>
            Sunucularımıza şu anda bağlanamıyoruz. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {/* Retry Button */}
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#0e1b13" />
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>

          {/* Contact Support Button */}
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={onContactSupport}
            activeOpacity={0.7}
          >
            <Text style={styles.supportButtonText}>Yardıma mı ihtiyacınız var? Destek ile iletişime geçin</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: -40,
  },
  iconContainer: {
    marginBottom: 32,
    opacity: 0.9,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#0e1b13',
    fontSize: 16,
    fontWeight: 'bold',
  },
  supportButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  supportButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ServerErrorScreen;
