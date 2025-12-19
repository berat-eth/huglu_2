import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../components/Button';
import { COLORS } from '../constants/colors';
import { communityAPI } from '../services/api';

export default function CreatePostScreen({ navigation, route }) {
  const { image } = route.params || {};
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Yürüyüş');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [posting, setPosting] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(null);

  const categories = ['Yürüyüş', 'Kamp', 'Tırmanış', 'Diğer'];

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const name = await AsyncStorage.getItem('userName');
      const id = await AsyncStorage.getItem('userId');
      setUserName(name || 'Kullanıcı');
      setUserId(id);
    } catch (error) {
      console.error('Kullanıcı bilgisi yüklenemedi:', error);
    }
  };

  // Extract hashtags from caption
  const extractHashtags = (text) => {
    const hashtagRegex = /#[\w\u0131\u0130\u015F\u015E\u011F\u011E\u00E7\u00C7\u00F6\u00D6\u00FC\u00DC]+/g;
    const matches = text.match(hashtagRegex);
    return matches || [];
  };

  const handleSelectProduct = () => {
    Alert.alert(
      'Ürün Seç',
      'Hangi ürünü etiketlemek istersiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ürün Listesi',
          onPress: () => {
            // Mock product selection
            setSelectedProduct({
              name: 'Summit Pro Sırt Çantası 40L',
              price: '₺1,299.00',
              image: 'https://images.unsplash.com/photo-1622260614153-03223fb72052?w=200',
            });
          },
        },
      ]
    );
  };

  const handlePost = async () => {
    if (!userId) {
      Alert.alert('Giriş Gerekli', 'Gönderi paylaşmak için lütfen giriş yapın.');
      return;
    }

    if (!image) {
      Alert.alert('Hata', 'Lütfen bir fotoğraf seçin');
      return;
    }

    if (!caption.trim()) {
      Alert.alert('Hata', 'Lütfen bir açıklama yazın');
      return;
    }

    try {
      setPosting(true);

      // Extract hashtags from caption
      const hashtags = extractHashtags(caption);

      // Prepare post data
      const postData = {
        userId: parseInt(userId),
        image: image, // For now, using the URI directly. In production, upload to server first
        caption: caption.trim(),
        location: location.trim() || '',
        category: selectedCategory,
        productId: selectedProduct?.id || null,
        hashtags: hashtags,
      };

      const response = await communityAPI.createPost(postData);

      if (response.data && response.data.success) {
        Alert.alert('Başarılı! 🎉', 'Maceranız paylaşıldı!', [
          { 
            text: 'Tamam', 
            onPress: () => {
              // Navigate back and refresh the feed
              navigation.goBack();
            }
          },
        ]);
      } else {
        throw new Error(response.data?.message || 'Gönderi oluşturulamadı');
      }
    } catch (error) {
      console.error('❌ Gönderi oluşturulamadı:', error);
      Alert.alert(
        'Hata', 
        error.response?.data?.message || error.message || 'Gönderi paylaşılırken bir hata oluştu'
      );
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="close" size={28} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Yeni Gönderi</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Image Preview */}
          {image && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
            </View>
          )}

          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={24} color={COLORS.white} />
            </View>
            <Text style={styles.userName}>{userName}</Text>
          </View>

          {/* Caption */}
          <View style={styles.section}>
            <Text style={styles.label}>Açıklama</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Maceranı anlat... #hashtag kullanabilirsin"
              placeholderTextColor={COLORS.gray400}
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{caption.length}/500</Text>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.label}>Konum</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location" size={20} color={COLORS.gray400} />
              <TextInput
                style={styles.input}
                placeholder="Neredesin?"
                placeholderTextColor={COLORS.gray400}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Kategori</Text>
            <View style={styles.categoriesRow}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === category && styles.categoryChipTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tag Product */}
          <View style={styles.section}>
            <Text style={styles.label}>Ürün Etiketle (Opsiyonel)</Text>
            {selectedProduct ? (
              <View style={styles.selectedProduct}>
                <Image
                  source={{ uri: selectedProduct.image }}
                  style={styles.selectedProductImage}
                />
                <View style={styles.selectedProductInfo}>
                  <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
                  <Text style={styles.selectedProductPrice}>{selectedProduct.price}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeProductButton}
                  onPress={() => setSelectedProduct(null)}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.gray400} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.selectProductButton} onPress={handleSelectProduct}>
                <Ionicons name="pricetag-outline" size={20} color={COLORS.primary} />
                <Text style={styles.selectProductText}>Ürün Seç</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={20} color={COLORS.primary} />
              <Text style={styles.tipsTitle}>💡 İpuçları</Text>
            </View>
            <Text style={styles.tipsText}>
              • Yüksek kaliteli fotoğraflar kullanın{'\n'}
              • Deneyiminizi detaylı anlatın{'\n'}
              • İlgili hashtag'ler ekleyin{'\n'}
              • Kullandığınız ürünleri etiketleyin
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Post Button */}
        <View style={styles.footer}>
          <Button
            title={posting ? 'Paylaşılıyor...' : 'Paylaş'}
            onPress={handlePost}
            disabled={posting}
            style={styles.postButton}
          />
        </View>
      </KeyboardAvoidingView>
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
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: COLORS.gray100,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    marginTop: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  section: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  captionInput: {
    fontSize: 15,
    color: COLORS.textMain,
    minHeight: 100,
    textAlignVertical: 'top',
    padding: 12,
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.gray400,
    textAlign: 'right',
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textMain,
    paddingVertical: 12,
    marginLeft: 8,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  categoryChipTextActive: {
    color: COLORS.white,
  },
  selectProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  selectProductText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  selectedProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  selectedProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.gray200,
    marginRight: 12,
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  selectedProductPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  removeProductButton: {
    padding: 4,
  },
  tipsCard: {
    backgroundColor: 'rgba(17, 212, 33, 0.05)',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 33, 0.2)',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  tipsText: {
    fontSize: 13,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  postButton: {
    marginBottom: 0,
  },
});
