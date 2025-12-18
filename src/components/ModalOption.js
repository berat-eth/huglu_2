import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

/**
 * Modal içinde kullanılacak standart seçenek kartı
 */
export default function ModalOption({
  icon,
  iconColor = COLORS.primary,
  iconBackground,
  title,
  description,
  onPress,
  showChevron = true,
}) {
  return (
    <TouchableOpacity
      style={styles.option}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.optionIcon, 
        { backgroundColor: iconBackground || `${iconColor}15` }
      ]}>
        <Ionicons name={icon} size={28} color={iconColor} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        {description && (
          <Text style={styles.optionDescription}>{description}</Text>
        )}
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    gap: 16,
    marginBottom: 12,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  optionDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray500,
  },
});
