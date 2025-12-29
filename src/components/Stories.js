import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { COLORS } from '../constants/colors';
import { getApiUrl } from '../config/api.config';

export default function Stories({ stories, onStoryPress }) {
  const [imageErrors, setImageErrors] = useState({});

  if (!stories || stories.length === 0) return null;

  const handleImageError = (storyId) => {
    setImageErrors(prev => ({ ...prev, [storyId]: true }));
  };

  const getImageSource = (story) => {
    let imageUrl = story.imageUrl || story.image_url || story.image;
    
    // Görsel URL kontrolü - Base64 görselleri reddet
    if (!imageUrl || 
        imageUrl.startsWith('data:') || // Base64 görselleri reddet
        imageErrors[story.id] ||
        imageUrl.trim() === '' ||
        imageUrl === 'null' ||
        imageUrl === 'undefined') {
      return null; // Placeholder gösterilecek
    }
    
    // URL'yi temizle ve normalize et
    imageUrl = imageUrl.trim();
    
    // Relative URL kontrolü - /uploads/ veya / ile başlıyorsa base URL ekle
    // Base URL'i al - sonundaki /api'yi güvenli şekilde kaldır
    let API_BASE_URL = getApiUrl();
    if (API_BASE_URL.endsWith('/api')) {
      API_BASE_URL = API_BASE_URL.slice(0, -4); // Son 4 karakteri (/api) kaldır
    } else if (API_BASE_URL.endsWith('/api/')) {
      API_BASE_URL = API_BASE_URL.slice(0, -5); // Son 5 karakteri (/api/) kaldır
    }
    
    if (imageUrl.startsWith('/uploads/') || (imageUrl.startsWith('/') && !imageUrl.startsWith('//') && !imageUrl.startsWith('http'))) {
      imageUrl = `${API_BASE_URL}${imageUrl}`;
    }
    
    // Eğer URL hala http veya https ile başlamıyorsa geçersiz say
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return null;
    }
    
    return { uri: imageUrl };
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stories.map((story) => (
          <TouchableOpacity
            key={story.id}
            style={styles.storyItem}
            onPress={() => onStoryPress(story)}
            activeOpacity={0.8}
          >
            {/* Gradient border simülasyonu - CSS gradient yerine border kullan */}
            <View style={styles.gradientBorder}>
              <View style={styles.imageContainer}>
                {getImageSource(story) ? (
                  <Image
                    source={{
                      ...getImageSource(story),
                      cache: 'force-cache'
                    }}
                    style={styles.storyImage}
                    resizeMode="cover"
                    onError={() => handleImageError(story.id)}
                    defaultSource={require('../../assets/icon.png')}
                  />
                ) : (
                  <View style={styles.storyImagePlaceholder}>
                    <Text style={styles.storyImagePlaceholderText}>📷</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.storyTitle} numberOfLines={1}>
              {story.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  storyItem: {
    alignItems: 'center',
    width: 80,
  },
  gradientBorder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    marginBottom: 6,
    backgroundColor: COLORS.primary, // Gradient yerine solid color
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  storyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: COLORS.lightGray,
  },
  storyImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  storyImagePlaceholderText: {
    fontSize: 24,
    opacity: 0.5,
  },
  storyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
    textAlign: 'center',
  },
});