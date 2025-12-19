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
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../components/Button';
import { COLORS } from '../constants/colors';
import { communityAPI, productsAPI } from '../services/api';

import * as ImagePicker from 'expo-image-picker';

export default function CreatePostScreen({ navigation, route }) {
  const { image: initialImage } = route.params || {};
  const [image, setImage] = useState(initialImage || null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [posting, setPosting] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await productsAPI.getAll({ page: 1, limit: 100 });
      
      if (response.data?.success) {
        const productsData = response.data.data?.products || response.data.data || [];
        setProducts(productsData);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('❌ Ürünler yüklenemedi:', error);
      Alert.alert('Hata', 'Ürünler yüklenirken bir hata oluştu');
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSelectProduct = () => {
    setShowProductModal(true);
    if (products.length === 0) {
      loadProducts();
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct({
      id: product.id || product._id,
      name: product.name || product.title || 'Ürün',
      price: product.price ? `₺${parseFloat(product.price).toFixed(2)}` : 'Fiyat bilgisi yok',
      image: product.image || product.images?.[0] || product.imageUrl || 'https://via.placeholder.com/200',
    });
    setShowProductModal(false);
    setSearchQuery('');
  };

  const filteredProducts = products.filter(product => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = (product.name || product.title || '').toLowerCase();
    return name.includes(query);
  });

  const handleSelectImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gereklidir');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square or 9:16 will be handled by server
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu');
    }
  };

  const handleRemoveImage = () => {
    Alert.alert(
      'Görseli Kaldır',
      'Görseli kaldırmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => setImage(null),
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
        category: 'All', // Default category
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
              const isInTabNavigator = navigation.getParent()?.getState()?.type === 'tab';
              if (isInTabNavigator) {
                navigation.navigate('CommunityFeed');
              } else {
                navigation.goBack();
              }
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
          <TouchableOpacity 
            onPress={() => {
              // If in tab navigator, navigate to feed, otherwise go back
              const isInTabNavigator = navigation.getParent()?.getState()?.type === 'tab';
              if (isInTabNavigator) {
                navigation.navigate('CommunityFeed');
              } else {
                navigation.goBack();
              }
            }} 
            style={styles.backButton}
          >
            <Ionicons name="close" size={28} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Yeni Gönderi</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={24} color={COLORS.white} />
            </View>
            <Text style={styles.userName}>{userName}</Text>
          </View>

          {/* Image Upload/Preview Section - Enhanced */}
          <View style={styles.imageSection}>
            {image ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                >
                  <Ionicons name="close-circle" size={32} color={COLORS.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={handleSelectImage}
                >
                  <Ionicons name="camera" size={22} color={COLORS.white} />
                  <Text style={styles.changeImageText}>Değiştir</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={handleSelectImage}
              >
                <View style={styles.imageUploadIconContainer}>
                  <Ionicons name="camera-outline" size={64} color={COLORS.primary} />
                </View>
                <Text style={styles.imageUploadText}>Fotoğraf Seç</Text>
                <Text style={styles.imageUploadSubtext}>9:16 veya 1:1 formatında</Text>
                <View style={styles.imageUploadHint}>
                  <Ionicons name="image-outline" size={16} color={COLORS.gray500} />
                  <Text style={styles.imageUploadHintText}>Galeriden seç veya çek</Text>
                </View>
              </TouchableOpacity>
            )}
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

      {/* Product Selection Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowProductModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowProductModal(false);
                setSearchQuery('');
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={28} color={COLORS.textMain} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ürün Seç</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.gray400} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ürün ara..."
              placeholderTextColor={COLORS.gray400}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.gray400} />
              </TouchableOpacity>
            )}
          </View>

          {/* Products List */}
          {loadingProducts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Ürünler yükleniyor...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color={COLORS.gray300} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Aradığınız ürün bulunamadı' : 'Henüz ürün yok'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => String(item.id || item._id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productItem}
                  onPress={() => handleProductSelect(item)}
                >
                  <Image
                    source={{
                      uri: item.image || item.images?.[0] || item.imageUrl || 'https://via.placeholder.com/100',
                    }}
                    style={styles.productItemImage}
                    resizeMode="cover"
                  />
                  <View style={styles.productItemInfo}>
                    <Text style={styles.productItemName} numberOfLines={2}>
                      {item.name || item.title || 'Ürün'}
                    </Text>
                    <Text style={styles.productItemPrice}>
                      {item.price ? `₺${parseFloat(item.price).toFixed(2)}` : 'Fiyat bilgisi yok'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={COLORS.gray400} />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.productsList}
            />
          )}
        </SafeAreaView>
      </Modal>
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
  imageSection: {
    padding: 16,
    backgroundColor: COLORS.white,
    marginTop: 16,
  },
  imageUploadButton: {
    width: '100%',
    minHeight: 300,
    backgroundColor: COLORS.gray50,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  imageUploadIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageUploadText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 8,
  },
  imageUploadSubtext: {
    fontSize: 14,
    color: COLORS.gray500,
    marginTop: 4,
  },
  imageUploadHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderRadius: 20,
  },
  imageUploadHintText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  imagePreviewContainer: {
    width: '100%',
    minHeight: 300,
    aspectRatio: 1,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
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
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textMain,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray500,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray500,
  },
  productsList: {
    padding: 16,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.gray200,
    marginRight: 12,
  },
  productItemInfo: {
    flex: 1,
  },
  productItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  productItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
