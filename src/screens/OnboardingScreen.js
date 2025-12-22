import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: 1,
    title: 'Hoş Geldiniz!',
    description: 'Huglu ile outdoor dünyasının kapılarını keşfedin. En kaliteli ürünler ve kampanyalar sizi bekliyor.',
    icon: '🌲',
    image: require('../../assets/logo.jpg'),
    color: '#11d421',
  },
  {
    id: 2,
    title: 'Kolay Alışveriş',
    description: 'Binlerce ürün arasından kolayca arama yapın, favorilerinize ekleyin ve hızlıca sipariş verin.',
    icon: '🛒',
    image: require('../../assets/sepetim.png'),
    color: '#11d421',
  },
  {
    id: 3,
    title: 'Canlı Destek',
    description: '7/24 canlı destek hattımızla sorularınıza anında yanıt alın. Size yardımcı olmaktan mutluluk duyarız.',
    icon: '💬',
    image: require('../../assets/iletişim.png'),
    color: '#11d421',
  },
  {
    id: 4,
    title: 'Hazır mısınız?',
    description: 'Maceraya başlamaya hazır mısınız? Hemen keşfetmeye başlayın!',
    icon: '🚀',
    image: require('../../assets/logo.jpg'),
    color: '#11d421',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    if (currentPage < onboardingData.length - 1) {
      const nextPage = currentPage + 1;
      scrollViewRef.current?.scrollTo({
        x: nextPage * width,
        animated: true,
      });
      setCurrentPage(nextPage);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      const prevPage = currentPage - 1;
      scrollViewRef.current?.scrollTo({
        x: prevPage * width,
        animated: true,
      });
      setCurrentPage(prevPage);
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    navigation.replace('Main');
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    navigation.replace('Main');
  };

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / width);
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const renderPage = (item, index) => {
    const isLastPage = index === onboardingData.length - 1;
    
    return (
      <View key={item.id} style={styles.pageContainer}>
        {/* Background Gradient Effect */}
        <View style={[styles.gradientCircle, { backgroundColor: `${item.color}15` }]} />
        
        {/* Content */}
        <View style={styles.content}>
          {/* Icon/Image */}
          <View style={styles.imageContainer}>
            {item.image ? (
              <Image 
                source={item.image} 
                style={styles.image}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.iconEmoji}>{item.icon}</Text>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{item.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{item.description}</Text>

          {/* Last Page Special Content */}
          {isLastPage && (
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Hızlı Teslimat</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Güvenli Ödeme</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Kampanyalar</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      {currentPage < onboardingData.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Atla</Text>
        </TouchableOpacity>
      )}

      {/* ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {onboardingData.map((item, index) => renderPage(item, index))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {onboardingData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              currentPage === index && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        {currentPage > 0 && (
          <TouchableOpacity
            style={styles.prevButton}
            onPress={handlePrevious}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
            <Text style={styles.prevButtonText}>Geri</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            currentPage === 0 && styles.nextButtonFullWidth,
          ]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentPage === onboardingData.length - 1 ? 'Başla' : 'İleri'}
          </Text>
          {currentPage < onboardingData.length - 1 && (
            <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    color: COLORS.gray600,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  pageContainer: {
    width: width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    position: 'relative',
  },
  gradientCircle: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    top: -width * 0.3,
    right: -width * 0.2,
    opacity: 0.3,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  imageContainer: {
    width: 140,
    height: 140,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  iconEmoji: {
    fontSize: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textMain,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    marginTop: 40,
    width: '100%',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: COLORS.textMain,
    marginLeft: 12,
    fontWeight: '500',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray300,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 20,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
  },
  nextButtonFullWidth: {
    marginLeft: 0,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginRight: 4,
  },
});

