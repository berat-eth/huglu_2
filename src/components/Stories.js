import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { COLORS } from '../constants/colors';

export default function Stories({ stories, onStoryPress }) {
  if (!stories || stories.length === 0) return null;

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
                <Image
                  source={{ uri: story.image_url || story.imageUrl || 'https://via.placeholder.com/100' }}
                  style={styles.storyImage}
                />
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
  },
  storyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
    textAlign: 'center',
  },
});
