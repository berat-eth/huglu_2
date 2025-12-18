import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { productsAPI, slidersAPI, storiesAPI, flashDealsAPI } from '../services/api';
import { isServerError } from '../utils/errorHandler';
import { checkMaintenanceMode } from '../utils/maintenanceCheck';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const [loadingText, setLoadingText] = useState('Yükleniyor...');
  const [progress, setProgress] = useState(0);
  const progressAnim = useState(new Animated.Value(0))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Fade in animasyonu
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    initializeApp();
  }, []);

  useEffect(() => {
    // Progress bar animasyonu
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const initializeApp = async () => {
    try {
      // 1. Bakım modu kontrolü
      setLoadingText('Sistem kontrol ediliyor...');
      const maintenanceStatus = await checkMaintenanceMode('mobile');
      
      if (maintenanceStatus.isMaintenanceMode) {
        console.log('🔧 Bakım modu aktif, MaintenanceScreen\'e yönlendiriliyor');
        navigation.replace('Maintenance', {
          message: maintenanceStatus.message,
          estimatedEndTime: maintenanceStatus.estimatedEndTime,
        });
        return;
      }
      
      // 2. Verileri önceden yükle (opsiyonel)
      await preloadHomeData();
      
      // 3. Ana sayfaya git
      navigation.replace('Main');
    } catch (error) {
      console.error('❌ App initialization error:', error);
      
      // Sunucu hatası kontrolü
      if (isServerError(error)) {
        setLoadingText('Sunucuya bağlanılamıyor...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Hata olsa bile ana sayfaya git (bakım modu kontrolü başarısız olsa bile)
      navigation.replace('Main');
    }
  };

  const preloadHomeData = async () => {
    try {
      console.log('🚀 Preloading home data...');
      const totalSteps = 4;
      let completedSteps = 0;

      const updateProgress = () => {
        completedSteps++;
        setProgress((completedSteps / totalSteps) * 100);
      };

      // 1. Ürünleri yükle
      setLoadingText('Ürünler yükleniyor...');
      try {
        await productsAPI.getAll({ limit: 100 });
        updateProgress();
      } catch (error) {
        updateProgress();
      }

      // 2. Slider'ları yükle
      setLoadingText('Banner\'lar yükleniyor...');
      try {
        await slidersAPI.getActive();
        updateProgress();
        console.log('✅ Sliders preloaded');
      } catch (error) {
        console.warn('⚠️ Sliders preload failed:', error.message);
        updateProgress();
      }

      // 3. Hikayeleri yükle
      setLoadingText('Hikayeler yükleniyor...');
      try {
        await storiesAPI.getActive();
        updateProgress();
        console.log('✅ Stories preloaded');
      } catch (error) {
        console.warn('⚠️ Stories preload failed:', error.message);
        updateProgress();
      }

      // 4. Flash deals yükle
      setLoadingText('Kampanyalar yükleniyor...');
      try {
        await flashDealsAPI.getActive();
        updateProgress();
        console.log('✅ Flash deals preloaded');
      } catch (error) {
        console.warn('⚠️ Flash deals preload failed:', error.message);
        updateProgress();
      }

      setLoadingText('Hazırlanıyor...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('✅ All data preloaded successfully');
    } catch (error) {
      console.error('❌ Preload error:', error);
      // Hata olsa bile devam et
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Background Glow Effects */}
      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />
      
      {/* Background Pattern */}
      <View style={styles.patternOverlay} />

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Logo */}
        <Image 
          source={require('../../assets/logo.jpg')} 
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Brand Typography */}
        <View style={styles.brandContainer}>
          <Text style={styles.subtitle}>Freedom Every Step</Text>
        </View>

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <View style={styles.progressBarContainer}>
            <Animated.View 
              style={[
                styles.progressBar, 
                { width: progressWidth }
              ]} 
            />
          </View>
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  // Background Effects - Gizli
  glowTopLeft: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'transparent',
    opacity: 0,
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: '-10%',
    right: '-10%',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'transparent',
    opacity: 0,
  },
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  // Content
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  // Logo
  logo: {
    width: 180,
    height: 180,
    marginBottom: 32,
  },
  // Brand Typography
  brandContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    fontStyle: 'italic',
    color: COLORS.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  // Loading
  loadingContainer: {
    width: '100%',
    maxWidth: 160,
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  loadingText: {
    fontSize: 12,
    color: '#4e976b',
    fontWeight: '500',
    opacity: 0.8,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 11,
    color: '#4e976b',
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
});
