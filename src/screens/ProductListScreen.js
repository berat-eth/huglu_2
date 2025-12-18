import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProductCard from '../components/ProductCard';
import { COLORS } from '../constants/colors';
import { productsAPI, wishlistAPI } from '../services/api';
import voiceRecognitionService from '../services/voiceRecognition';
import LoginRequiredModal from '../components/LoginRequiredModal';

const SORT_OPTIONS = [
  { id: 'default', label: 'Varsayılan', icon: 'list-outline' },
  { id: 'price-asc', label: 'Fiyat: Düşükten Yükseğe', icon: 'arrow-up-outline' },
  { id: 'price-desc', label: 'Fiyat: Yüksekten Düşüğe', icon: 'arrow-down-outline' },
  { id: 'name-asc', label: 'İsim: A-Z', icon: 'text-outline' },
  { id: 'name-desc', label: 'İsim: Z-A', icon: 'text-outline' },
  { id: 'newest', label: 'En Yeni', icon: 'time-outline' },
];

export default function ProductListScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState(['Tümü']);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState('default');
  const [isListening, setIsListening] = useState(false);
  const [userId, setUserId] = useState('');
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);

  useEffect(() => {
    loadInitialData();
    loadUserId();
  }, []);

  const loadUserId = async () => {
    const storedUserId = await AsyncStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  };

  const loadInitialData = async () => {
    await Promise.all([loadCategories(), loadProducts()]);
  };

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await productsAPI.getCategories();
      if (response.data?.success) {
        const categoriesData = response.data.data?.categories || response.data.data || [];
        const names = categoriesData.map((cat) => {
          if (typeof cat === 'string') return cat;
          return cat.name || cat.categoryName || cat.category || '';
        }).filter(Boolean);
        const uniq = Array.from(new Set(names));
        setCategories(['Tümü', ...uniq]);
        if (!['Tümü', ...uniq].includes(selectedCategory)) {
          setSelectedCategory('Tümü');
        }
      } else {
        console.warn('Categories response not successful:', response.data);
        setCategories(['Tümü']);
        setSelectedCategory('Tümü');
      }
    } catch (error) {
      console.error('❌ Kategoriler yüklenemedi:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      setCategories(['Tümü']);
      setSelectedCategory('Tümü');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);

      const pageSize = 100;
      let page = 1;
      let all = [];
      let hasMore = true;
      let safety = 0;

      while (hasMore && safety < 10) {
        const response = await productsAPI.getAll({ page, limit: pageSize });

        if (!response.data?.success) {
          break;
        }

        const payload = response.data.data ?? response.data ?? {};
        let productsData = [];

        if (Array.isArray(payload)) {
          productsData = payload;
        } else if (Array.isArray(payload.products)) {
          productsData = payload.products;
        } else if (Array.isArray(payload.items)) {
          productsData = payload.items;
        } else if (Array.isArray(payload.rows)) {
          productsData = payload.rows;
        } else if (Array.isArray(payload.data)) {
          productsData = payload.data;
        }

        // concat unique by id/_id
        const existingIds = new Set(all.map((p) => p.id || p._id));
        const merged = [
          ...all,
          ...productsData.filter((p) => {
            const pid = p.id || p._id;
            if (!pid) return true;
            if (existingIds.has(pid)) return false;
            existingIds.add(pid);
            return true;
          }),
        ];
        all = merged;

        // hasMore / total kontrolü
        const total = Number(payload.total || payload.count || payload.totalCount || 0);
        const backendHasMore = payload.hasMore ?? payload.has_next ?? payload.hasNext;
        if (backendHasMore === false) {
          hasMore = false;
        } else if (total && all.length >= total) {
          hasMore = false;
        } else if (productsData.length < pageSize) {
          hasMore = false;
        } else {
          hasMore = true;
        }

        page += 1;
        safety += 1;
      }

      setProducts(all);
      console.log('✅ Tüm ürünler yüklendi:', all.length, 'ürün');
    } catch (error) {
      console.error('❌ Ürünler yüklenemedi:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCategories(), loadProducts()]);
    setRefreshing(false);
  };

  // GÜVENLİK: products undefined olabilir, array kontrolü ekle
  const filteredProducts = Array.isArray(products) ? products.filter((product) => {
    const matchesCategory = selectedCategory === 'Tümü' || product.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }) : [];

  // Sıralama uygula
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (selectedSort) {
      case 'price-asc':
        return parseFloat(a.price || 0) - parseFloat(b.price || 0);
      case 'price-desc':
        return parseFloat(b.price || 0) - parseFloat(a.price || 0);
      case 'name-asc':
        return (a.name || '').localeCompare(b.name || '', 'tr');
      case 'name-desc':
        return (b.name || '').localeCompare(a.name || '', 'tr');
      case 'newest':
        return (b.id || 0) - (a.id || 0);
      default:
        return 0;
    }
  });

  const handleSortSelect = (sortId) => {
    setSelectedSort(sortId);
    setSortModalVisible(false);
  };

  const toggleFavorite = async (product) => {
    if (!userId) {
      Alert.alert('Giriş Gerekli', 'Favorilere eklemek için lütfen giriş yapın');
      return;
    }

    try {
      await wishlistAPI.toggle(userId, product.id || product._id);
      
      // Local state'i güncelle
      setProducts(products.map(p => 
        (p.id || p._id) === (product.id || product._id)
          ? { ...p, isFavorite: !p.isFavorite }
          : p
      ));
    } catch (error) {
      console.error('Favori toggle hatası:', error);
    }
  };

  const handleVoiceSearch = async () => {
    if (isListening) {
      // Dinleme aktifse durdur
      await voiceRecognitionService.stopListening();
      setIsListening(false);
      return;
    }

    setIsListening(true);

    const success = await voiceRecognitionService.startListening(
      {
        lang: 'tr-TR',
        interimResults: true,
        onPartialResult: (transcript) => {
          console.log('Kısmi sonuç:', transcript);
        }
      },
      (transcript) => {
        // Final sonuç
        console.log('✅ Ses tanıma tamamlandı:', transcript);
        setIsListening(false);
        
        if (transcript && transcript.trim().length > 0) {
          setSearchQuery(transcript.trim());
        } else {
          Alert.alert('Uyarı', 'Ses tanınamadı. Lütfen tekrar deneyin.');
        }
      },
      (error) => {
        // Hata
        console.error('❌ Ses tanıma hatası:', error);
        setIsListening(false);
        
        if (error !== 'İzin verilmedi' && error !== 'Desteklenmiyor') {
          Alert.alert(
            'Ses Tanıma Hatası',
            'Ses tanıma sırasında bir hata oluştu. Lütfen tekrar deneyin.',
            [{ text: 'Tamam' }]
          );
        }
      }
    );

    if (!success) {
      setIsListening(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tüm Ürünler</Text>
        <TouchableOpacity style={styles.cartButton} onPress={() => navigation.navigate('Cart')}>
          <Ionicons name="cart-outline" size={24} color={COLORS.textMain} />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray400} />
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
          <TouchableOpacity 
            onPress={handleVoiceSearch}
            style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
            activeOpacity={0.7}
          >
            {isListening ? (
              <View style={styles.listeningIndicator}>
                <Ionicons name="mic" size={20} color={COLORS.white} />
              </View>
            ) : (
              <Ionicons name="mic-outline" size={20} color={COLORS.gray400} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {isListening && (
        <View style={styles.listeningBanner}>
          <View style={styles.listeningDot} />
          <Text style={styles.listeningText}>Dinleniyor...</Text>
        </View>
      )}

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}
              disabled={categoriesLoading}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {sortedProducts.length} Ürün
        </Text>
        <TouchableOpacity style={styles.sortButton} onPress={() => setSortModalVisible(true)}>
          <Text style={styles.sortText}>Sırala</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Products Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Ürünler yükleniyor...</Text>
        </View>
      ) : sortedProducts.length > 0 ? (
        <FlatList
          data={sortedProducts}
          keyExtractor={(item) => (item.id ?? item._id ?? Math.random()).toString()}
          numColumns={2}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          renderItem={({ item }) => (
            <View style={styles.productWrapper}>
              <ProductCard
                product={item}
                onPress={() => navigation.navigate('ProductDetail', { product: item })}
                onFavorite={() => toggleFavorite(item)}
              />
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={COLORS.gray400} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'Arama sonucu bulunamadı' : 'Bu kategoride ürün bulunamadı'}
          </Text>
        </View>
      )}

      {/* Sort Modal */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sıralama</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>
            <View style={styles.sortOptions}>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.sortOption,
                    selectedSort === option.id && styles.sortOptionActive,
                  ]}
                  onPress={() => handleSortSelect(option.id)}
                >
                  <View style={styles.sortOptionLeft}>
                    <Ionicons 
                      name={option.icon} 
                      size={20} 
                      color={selectedSort === option.id ? COLORS.primary : COLORS.gray500} 
                    />
                    <Text
                      style={[
                        styles.sortOptionText,
                        selectedSort === option.id && styles.sortOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {selectedSort === option.id && (
                    <Ionicons name="checkmark" size={24} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Login Required Modal */}
      <LoginRequiredModal
        visible={showLoginRequiredModal}
        onClose={() => setShowLoginRequiredModal(false)}
        onLogin={() => {
          setShowLoginRequiredModal(false);
          navigation.navigate('Login');
        }}
        message="Favorilere eklemek için lütfen giriş yapın"
      />
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    textAlign: 'center',
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textMain,
  },
  voiceButton: {
    padding: 4,
  },
  voiceButtonActive: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 6,
  },
  listeningIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listeningBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  listeningText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  categoriesContainer: {
    paddingVertical: 12,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryChip: {
    height: 36,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray500,
    textTransform: 'uppercase',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray400,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray400,
    textAlign: 'center',
  },
  productsList: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  productWrapper: {
    width: '50%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  sortOptions: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMain,
  },
  sortOptionTextActive: {
    fontWeight: '700',
    color: COLORS.primary,
  },
});
