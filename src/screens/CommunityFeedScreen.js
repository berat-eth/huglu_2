import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

export default function CommunityFeedScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('All');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');

  const tabs = ['All', 'Yürüyüş', 'Kamp', 'Tırmanış'];

  useEffect(() => {
    loadUserData();
    loadPosts();
  }, []);

  const loadUserData = async () => {
    try {
      const name = await AsyncStorage.getItem('userName');
      setUserName(name || 'Kullanıcı');
    } catch (error) {
      console.error('Kullanıcı bilgisi yüklenemedi:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      // Mock data - Backend hazır olduğunda API'den çekilecek
      const mockPosts = [
        {
          id: 1,
          userName: 'Ahmet Dağcı',
          userAvatar: 'https://i.pravatar.cc/150?img=12',
          location: 'Kaçkar Dağları',
          timeAgo: '2 saat önce',
          image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800',
          caption: 'Sisli patikalarda yeni ekipmanı test ediyorum. Bu sırt çantasının su geçirmezliği inanılmaz! 🎒',
          productName: 'Summit Pro Sırt Çantası 40L',
          productPrice: '₺1,299.00',
          productImage: 'https://images.unsplash.com/photo-1622260614153-03223fb72052?w=200',
          likes: 448,
          comments: 12,
          category: 'Yürüyüş',
          hashtags: ['#YürüyüşEkipmanı', '#PatikadaYaşam', '#SırtÇantası'],
        },
        {
          id: 2,
          userName: 'Ayşe Gezgin',
          userAvatar: 'https://i.pravatar.cc/150?img=45',
          location: 'Abant Gölü',
          timeAgo: '1 gün önce',
          image: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800',
          caption: 'Yıldızların altında bir hafta sonu gibisi yok. QuickPitch ile kurulum çok hızlıydı! ⛺',
          productName: 'QuickPitch Dome Çadır',
          productPrice: '₺2,499.00',
          productImage: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=200',
          likes: 324,
          comments: 84,
          category: 'Kamp',
          hashtags: ['#KampYaşamı', '#GeceyeYarısı'],
        },
        {
          id: 3,
          userName: 'Mehmet Zirve',
          userAvatar: 'https://i.pravatar.cc/150?img=33',
          location: 'Erciyes Dağı',
          timeAgo: '3 gün önce',
          image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
          caption: 'Zirve günü! Bu botlar kayalık arazide mükemmel performans gösterdi. 🏔️',
          productName: 'Alpine Explorer Botları',
          productPrice: '₺1,899.00',
          productImage: 'https://images.unsplash.com/photo-1542834281-0e5abcbdc5b4?w=200',
          likes: 567,
          comments: 23,
          category: 'Tırmanış',
          hashtags: ['#ZirveGünü', '#DağYaşamı'],
        },
        {
          id: 4,
          userName: 'Zeynep Doğa',
          userAvatar: 'https://i.pravatar.cc/150?img=20',
          location: 'Yedigöller Milli Parkı',
          timeAgo: '5 gün önce',
          image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800',
          caption: 'Sonbahar renkleri arasında harika bir kamp deneyimi. Yeni uyku tulumum çok sıcak tuttu! 🍂',
          productName: 'ThermalMax Uyku Tulumu',
          productPrice: '₺899.00',
          productImage: 'https://images.unsplash.com/photo-1520095972714-909e91b038e5?w=200',
          likes: 289,
          comments: 45,
          category: 'Kamp',
          hashtags: ['#Sonbahar', '#KampSevgisi', '#UykuTulumu'],
        },
        {
          id: 5,
          userName: 'Can Macera',
          userAvatar: 'https://i.pravatar.cc/150?img=8',
          location: 'Fırtına Deresi',
          timeAgo: '1 hafta önce',
          image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
          caption: 'Trekking botlarımla 15 km yürüdüm, ayaklarımda hiç ağrı yok! Mükemmel destek sağlıyor. 👟',
          productName: 'TrailMaster Pro Botlar',
          productPrice: '₺1,599.00',
          productImage: 'https://images.unsplash.com/photo-1542834281-0e5abcbdc5b4?w=200',
          likes: 412,
          comments: 67,
          category: 'Yürüyüş',
          hashtags: ['#Trekking', '#DoğaYürüyüşü', '#BotÖnerisi'],
        },
        {
          id: 6,
          userName: 'Elif Outdoor',
          userAvatar: 'https://i.pravatar.cc/150?img=25',
          location: 'Aladağlar',
          timeAgo: '2 hafta önce',
          image: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=800',
          caption: 'İlk solo tırmanışım! Bu kask ve emniyet ekipmanları sayesinde kendimi çok güvende hissettim. 🧗‍♀️',
          productName: 'SafeClimb Kask Seti',
          productPrice: '₺749.00',
          productImage: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=200',
          likes: 523,
          comments: 91,
          category: 'Tırmanış',
          hashtags: ['#Tırmanış', '#SoloClimb', '#GüvenlikÖncelikli'],
        },
      ];

      setPosts(mockPosts);
      console.log('✅ Mock posts yüklendi:', mockPosts.length, 'gönderi');
    } catch (error) {
      console.error('❌ Gönderiler yüklenemedi:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🔄 Loading state:', false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handlePostAdventure = async () => {
    try {
      // İzin kontrolü
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gereklidir');
        return;
      }

      // Fotoğraf seçme
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        navigation.navigate('CreatePost', { image: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu');
    }
  };

  const handleLike = (postId) => {
    setPosts(
      posts.map((post) =>
        post.id === postId ? { ...post, likes: post.likes + 1 } : post
      )
    );
  };

  const handleComment = (postId) => {
    Alert.alert('Yorum', 'Yorum özelliği yakında eklenecek!');
  };

  const handleShare = async (post) => {
    Alert.alert('Paylaş', 'Paylaşım özelliği yakında eklenecek!');
  };

  const handleProductClick = (post) => {
    Alert.alert(
      post.productName,
      `Fiyat: ${post.productPrice}\n\nÜrün detaylarına gitmek ister misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Ürüne Git', onPress: () => {} },
      ]
    );
  };

  const filteredPosts =
    activeTab === 'All' ? posts : posts.filter((post) => post.category === activeTab);

  console.log('📊 Render durumu:', {
    activeTab,
    totalPosts: posts.length,
    filteredPosts: filteredPosts.length,
    loading,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>In the Wild</Text>
          <Text style={styles.headerSubtitle}>by Huğlu</Text>
        </View>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Post Adventure Button */}
      <TouchableOpacity style={styles.postButton} onPress={handlePostAdventure}>
        <Ionicons name="camera" size={20} color={COLORS.white} />
        <Text style={styles.postButtonText}>Maceranı Paylaş</Text>
      </TouchableOpacity>

      {/* Feed */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && posts.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Yükleniyor...</Text>
          </View>
        ) : null}

        {filteredPosts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {/* User Info */}
            <View style={styles.postHeader}>
              <View style={styles.userInfo}>
                <Image source={{ uri: post.userAvatar }} style={styles.userAvatar} />
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{post.userName}</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={12} color={COLORS.gray500} />
                    <Text style={styles.location}>{post.location}</Text>
                    <Text style={styles.timeAgo}> • {post.timeAgo}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.followButton}>
                <Text style={styles.followButtonText}>Takip Et</Text>
              </TouchableOpacity>
            </View>

            {/* Post Image */}
            <Image source={{ uri: post.image }} style={styles.postImage} resizeMode="cover" />

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleLike(post.id)}
              >
                <Ionicons name="heart-outline" size={24} color={COLORS.textMain} />
                <Text style={styles.actionText}>{post.likes}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleComment(post.id)}
              >
                <Ionicons name="chatbubble-outline" size={24} color={COLORS.textMain} />
                <Text style={styles.actionText}>{post.comments}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleShare(post)}
              >
                <Ionicons name="arrow-redo-outline" size={24} color={COLORS.textMain} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.bookmarkButton}>
                <Ionicons name="bookmark-outline" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            {/* Caption */}
            <View style={styles.captionContainer}>
              <Text style={styles.caption}>
                <Text style={styles.captionUserName}>{post.userName}</Text> {post.caption}
              </Text>
              <View style={styles.hashtagsRow}>
                {post.hashtags.map((tag, index) => (
                  <Text key={index} style={styles.hashtag}>
                    {tag}{' '}
                  </Text>
                ))}
              </View>
            </View>

            {/* Product Tag */}
            <TouchableOpacity
              style={styles.productTag}
              onPress={() => handleProductClick(post)}
            >
              <Image
                source={{ uri: post.productImage }}
                style={styles.productTagImage}
                resizeMode="cover"
              />
              <View style={styles.productTagInfo}>
                <Text style={styles.productTagName} numberOfLines={1}>
                  {post.productName}
                </Text>
                <Text style={styles.productTagPrice}>{post.productPrice}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
          </View>
        ))}

        {filteredPosts.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={80} color={COLORS.gray300} />
            <Text style={styles.emptyTitle}>Henüz Gönderi Yok</Text>
            <Text style={styles.emptySubtitle}>
              İlk macera gönderisini paylaşan sen ol!
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.gray500,
    marginTop: -2,
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: COLORS.gray100,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  postButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  postCard: {
    backgroundColor: COLORS.white,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray200,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 12,
    color: COLORS.gray500,
    marginLeft: 4,
  },
  timeAgo: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  postImage: {
    width: '100%',
    height: width - 32,
    backgroundColor: COLORS.gray100,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginLeft: 4,
  },
  bookmarkButton: {
    marginLeft: 'auto',
  },
  captionContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  caption: {
    fontSize: 14,
    color: COLORS.textMain,
    lineHeight: 20,
  },
  captionUserName: {
    fontWeight: '700',
  },
  hashtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  hashtag: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  productTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  productTagImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.gray200,
    marginRight: 12,
  },
  productTagInfo: {
    flex: 1,
  },
  productTagName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  productTagPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.gray500,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: 'center',
  },
});
