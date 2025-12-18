import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ScrollView, Modal, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarCodeScanner } from 'expo-barcode-scanner';
import ProductCard from '../components/ProductCard';
import { COLORS } from '../constants/colors';
import { productsAPI } from '../services/api';
import { getCategoryIcon, getIoniconName } from '../utils/categoryIcons';
import voiceRecognitionService from '../services/voiceRecognition';

const RECENT_SEARCHES = ['Çadır', 'Kamp Ekipmanı', 'Trekking Bot', 'Sırt Çantası'];

const POPULAR_SEARCHES = [
  'Kamp Çadırı',
  'Uyku Tulumu',
  'Outdoor Ayakkabı',
  'Trekking Botu',
  'Sırt Çantası',
  'Kamp Sobası',
];

const TRENDING_SEARCHES = [
  { emoji: '🔥', text: 'Waterproof jackets' },
  { emoji: '⛺', text: '4-season tents' },
  { emoji: '🎒', text: 'Ultralight gear' },
  { emoji: '🥾', text: 'Trail runners' },
  { emoji: '🧗', text: 'Climbing ropes' },
];

const SAMPLE_PRODUCTS = [
  { id: 1, name: 'Apex Ultra-Light Tent', brand: 'Tents', price: 249, image: 'https://via.placeholder.com/300', rating: 4.8, isFavorite: false },
  { id: 2, name: 'Trailblazer Boots', brand: 'Footwear', price: 129, image: 'https://via.placeholder.com/300', rating: 4.5, isFavorite: false },
];

export default function SearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await productsAPI.getCategories();
      if (response.data?.success) {
        const categoriesData = response.data.data?.categories || response.data.data || [];
        const categoryList = categoriesData.map(cat => {
          if (typeof cat === 'string') return cat;
          return cat.name || cat.categoryName || cat.category || '';
        }).filter(Boolean);
        setCategories(categoryList.slice(0, 4)); // İlk 4 kategoriyi al
      }
    } catch (error) {
      console.error('Kategoriler yüklenemedi:', error);
      setCategories(['Çadırlar', 'Botlar', 'Çantalar', 'Kıyafetler']); // Fallback
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length > 0) {
      setIsSearching(true);
      try {
        console.log('🔍 Arama yapılıyor:', query);
        
        // Normal arama yap
        const response = await productsAPI.search(query);
        
        console.log('📦 Arama yanıtı (TAM):', JSON.stringify(response.data, null, 2));
        
        if (response.data?.success) {
          // Farklı API yanıt formatlarını destekle
          let products = response.data.data?.products || 
                        response.data.products || 
                        response.data.data || 
                        [];
          
          // Array değilse array'e çevir
          if (!Array.isArray(products)) {
            products = products ? [products] : [];
          }
          
          // Eğer backend search endpoint'i çalışmıyorsa, tüm ürünleri çek ve filtrele
          if (products.length === 0) {
            console.log('⚠️ Search endpoint boş döndü, fallback: Tüm ürünleri çekip filtreleme yapılıyor...');
            try {
              const allProductsResponse = await productsAPI.getAll({ limit: 100 });
              if (allProductsResponse.data?.success) {
                const allProducts = allProductsResponse.data.data?.products || 
                                  allProductsResponse.data.products || 
                                  allProductsResponse.data.data || 
                                  [];
                
                // Client-side filtreleme
                const searchLower = query.toLowerCase().trim();
                products = allProducts.filter(p => {
                  const name = (p.name || '').toLowerCase();
                  const category = (p.category || '').toLowerCase();
                  const description = (p.description || '').toLowerCase();
                  const sku = (p.sku || p.stockCode || p.barkod || '').toLowerCase();
                  
                  return name.includes(searchLower) || 
                         category.includes(searchLower) || 
                         description.includes(searchLower) ||
                         sku.includes(searchLower);
                });
              }
            } catch (fallbackError) {
              console.log('❌ Fallback arama da başarısız:', fallbackError.message);
            }
          }
          
          // Eğer sonuç yoksa ve query sayısal/alfanumerik ise stok kodu araması yap
          if (products.length === 0 && /^[a-zA-Z0-9-_]+$/.test(query.trim())) {
            console.log('🔍 Stok kodu ile arama deneniyor:', query);
            try {
              const barcodeResponse = await productsAPI.searchByBarcode(query.trim());
              if (barcodeResponse.data?.success && barcodeResponse.data.data) {
                // Tek ürün döndüyse array'e çevir
                const barcodeProduct = barcodeResponse.data.data;
                products = Array.isArray(barcodeProduct) ? barcodeProduct : [barcodeProduct];
              }
            } catch (barcodeError) {
              console.log('ℹ️ Stok kodu araması sonuç vermedi:', barcodeError.message);
            }
          }
          
          setSearchResults(products);
        } else {
          console.log('❌ Arama başarısız:', response.data?.message);
          setSearchResults([]);
        }
      } catch (error) {
        console.error('❌ Arama hatası:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        setSearchResults([]);
      }
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setSearchResults([]);
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
          // Kısmi sonuçları göster (opsiyonel)
          console.log('Kısmi sonuç:', transcript);
        }
      },
      (transcript) => {
        // Final sonuç
        console.log('✅ Ses tanıma tamamlandı:', transcript);
        setIsListening(false);
        
        if (transcript && transcript.trim().length > 0) {
          handleSearch(transcript.trim());
        } else {
          Alert.alert('Uyarı', 'Ses tanınamadı. Lütfen tekrar deneyin.');
        }
      },
      (error) => {
        // Hata
        console.log('ℹ️ Ses tanıma hatası:', error);
        setIsListening(false);
        
        // Sadece kullanıcı hataları için alert göster
        if (error === 'İzin verilmedi') {
          Alert.alert(
            'Mikrofon İzni',
            'Sesli arama kullanmak için mikrofon iznine ihtiyacımız var.',
            [{ text: 'Tamam' }]
          );
        } else if (error === 'Desteklenmiyor') {
          // Sessizce logla, kullanıcıya gösterme
          console.log('ℹ️ Ses tanıma bu cihazda desteklenmiyor');
        }
      }
    );

    if (!success) {
      setIsListening(false);
    }
  };

  const openBarcodeScanner = () => {
    if (hasPermission === null) {
      Alert.alert('İzin Bekleniyor', 'Kamera izni kontrol ediliyor...');
      return;
    }
    if (hasPermission === false) {
      Alert.alert('İzin Gerekli', 'Barkod okutmak için kamera izni gereklidir.', [
        { text: 'Tamam' }
      ]);
      return;
    }
    setScanned(false);
    setShowScanner(true);
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    
    setScanned(true);
    setShowScanner(false);
    
    console.log(`Barkod okundu: ${data} (Tip: ${type})`);
    
    // Barkod ile ürün ara
    try {
      const response = await productsAPI.searchByBarcode(data);
      if (response.data?.success && response.data.data) {
        const product = response.data.data;
        // Ürün bulundu, detay sayfasına git
        navigation.navigate('ProductDetail', { product });
      } else {
        Alert.alert('Ürün Bulunamadı', `Barkod: ${data}\n\nBu barkoda ait ürün bulunamadı.`, [
          { text: 'Tekrar Dene', onPress: () => openBarcodeScanner() },
          { text: 'Tamam' }
        ]);
      }
    } catch (error) {
      console.error('Barkod arama hatası:', error);
      Alert.alert('Hata', 'Barkod aranırken bir hata oluştu.', [
        { text: 'Tekrar Dene', onPress: () => openBarcodeScanner() },
        { text: 'Tamam' }
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ürün, kategori, marka veya stok kodu ara..."
            placeholderTextColor={COLORS.gray400}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
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
        {isListening && (
          <View style={styles.listeningBanner}>
            <View style={styles.listeningDot} />
            <Text style={styles.listeningText}>Dinleniyor...</Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.barcodeButton} 
          onPress={openBarcodeScanner}
          activeOpacity={0.7}
        >
          <Ionicons name="barcode-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Barcode Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <SafeAreaView style={styles.scannerSafeArea} edges={['top']}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowScanner(false)}
              >
                <Ionicons name="close" size={28} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Barkod Okut</Text>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>
          
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
          
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <Text style={styles.scannerInstruction}>
              Barkodu çerçeve içine yerleştirin
            </Text>
          </View>
        </View>
      </Modal>

      {!isSearching ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          {RECENT_SEARCHES.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Son Aramalar</Text>
                <TouchableOpacity>
                  <Text style={styles.clearButton}>Temizle</Text>
                </TouchableOpacity>
              </View>
              {RECENT_SEARCHES.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.searchItem}
                  onPress={() => handleSearch(search)}
                >
                  <Ionicons name="time-outline" size={20} color={COLORS.gray400} />
                  <Text style={styles.searchItemText}>{search}</Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.gray300} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Popular Searches */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popüler Aramalar</Text>
            <View style={styles.tagsContainer}>
              {POPULAR_SEARCHES.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.tag}
                  onPress={() => handleSearch(search)}
                >
                  <Text style={styles.tagText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories Quick Access */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kategoriler</Text>
              <View style={styles.categoriesGrid}>
                {categories.map((category, index) => {
                  const categoryIconSource = getCategoryIcon(category);
                  return (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.categoryCard}
                      onPress={() => {
                        navigation.navigate('Shop');
                        // Kategori filtrelemesi için navigation params eklenebilir
                      }}
                    >
                      <View style={styles.categoryIcon}>
                        {categoryIconSource ? (
                          <Image 
                            source={categoryIconSource} 
                            style={styles.categoryIconImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <Ionicons 
                            name={getIoniconName(category)} 
                            size={24} 
                            color={COLORS.primary} 
                          />
                        )}
                      </View>
                      <Text style={styles.categoryName}>{category}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Trending Searches */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trend Aramalar</Text>
            <View style={styles.tagsContainer}>
              {TRENDING_SEARCHES.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.trendingTag}
                  onPress={() => handleSearch(search.text)}
                >
                  <Text style={styles.trendingEmoji}>{search.emoji}</Text>
                  <Text style={styles.tagText}>{search.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.resultsContainer}>
          {searchResults.length > 0 ? (
            <>
              <Text style={styles.resultsCount}>
                {searchResults.length} sonuç bulundu
              </Text>
              <FlatList
                data={searchResults}
                keyExtractor={(item, index) => `${item.id || item._id || index}`}
                numColumns={2}
                contentContainerStyle={styles.productsList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.productWrapper}>
                    <ProductCard
                      product={item}
                      onPress={() => navigation.navigate('ProductDetail', { product: item })}
                      onFavorite={() => {}}
                    />
                  </View>
                )}
              />
            </>
          ) : searchQuery.length > 0 ? (
            <View style={styles.noResults}>
              <View style={styles.noResultsIcon}>
                <Ionicons name="search-outline" size={64} color={COLORS.gray300} />
              </View>
              <Text style={styles.noResultsTitle}>Sonuç Bulunamadı</Text>
              <Text style={styles.noResultsMessage}>
                "{searchQuery}" için sonuç bulunamadı.{'\n'}Farklı bir arama terimi deneyin.
              </Text>
            </View>
          ) : (
            <View style={styles.noResults}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Aranıyor...</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    flex: 1,
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
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
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
    zIndex: 1000,
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
  barcodeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: COLORS.textMain,
  },
  scannerSafeArea: {
    zIndex: 10,
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scannerInstruction: {
    marginTop: 40,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  searchItemText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textMain,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  trendingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    gap: 6,
  },
  trendingEmoji: {
    fontSize: 16,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    alignItems: 'center',
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  categoryIconImage: {
    width: 24,
    height: 24,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  productsList: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  productWrapper: {
    width: '50%',
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noResultsIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  noResultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  noResultsMessage: {
    fontSize: 16,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray600,
    marginTop: 16,
  },
});
