import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { COLORS } from '../constants/colors';
import { getApiUrl } from '../config/api.config';

export default function Stories({ stories, onStoryPress }) {
  const [imageErrors, setImageErrors] = useState({});

  if (!stories || stories.length === 0) return null;

  // Debug: Story verilerini logla
  console.log('📸 Stories component - story data:', stories.map(s => ({
    id: s.id,
    title: s.title,
    imageUrl: s.imageUrl,
    image_url: s.image_url,
    image: s.image
  })));

  const handleImageError = (storyId) => {
    console.warn(`❌ Story image error for ID: ${storyId}`);
    setImageErrors(prev => ({ ...prev, [storyId]: true }));
  };

  const getImageSource = (story) => {
    let imageUrl = story.imageUrl || story.image_url || story.image;
    
    // Debug: Her story için URL kontrolü
    console.log(`🔍 Story ${story.id} (${story.title}) - imageUrl: ${imageUrl ? (imageUrl.startsWith('data:') ? 'BASE64_DATA (REJECTED)' : imageUrl) : 'NULL'}`);
    
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
    const API_BASE_URL = getApiUrl().replace('/api', ''); // Base URL'i al (API path'ini kaldır)
    if (imageUrl.startsWith('/uploads/') || (imageUrl.startsWith('/') && !imageUrl.startsWith('//') && !imageUrl.startsWith('http'))) {
      imageUrl = `${API_BASE_URL}${imageUrl}`;
      console.log('🔗 Story relative URL düzeltildi:', story.imageUrl || story.image_url || story.image, '->', imageUrl);
    }
    
    // Eğer URL hala http veya https ile başlamıyorsa geçersiz say
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      console.warn('⚠️ Story geçersiz görsel URL (http/https yok):', imageUrl);
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
                    onLoad={() => {
                      console.log(`✅ Story image loaded successfully for story ${story.id}`);
                    }}
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