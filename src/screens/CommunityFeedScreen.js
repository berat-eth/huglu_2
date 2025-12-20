import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { communityAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';
import CustomPrompt from '../components/CustomPrompt';

const { width } = Dimensions.get('window');

export default function CommunityFeedScreen({ navigation, route }) {
  const alert = useAlert();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(null);
  const [showCommentPrompt, setShowCommentPrompt] = useState(false);
  const [currentPostId, setCurrentPostId] = useState(null);
  
  // Check if we're in tab navigator mode
  const isInTabNavigator = navigation.getParent()?.getState()?.type === 'tab';
  const discoverMode = route?.params?.discoverMode || false;
  const notificationsMode = route?.params?.notificationsMode || false;

  useEffect(() => {
    loadUserData();
    loadPosts();
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

  const loadPosts = async () => {
    try {
      setLoading(true);
      
      const params = {
        page: 1,
        limit: 20,
      };

      const response = await communityAPI.getPosts(params);
      
      if (response.data && response.data.success) {
        setPosts(response.data.data || []);
        console.log('✅ Posts yüklendi:', response.data.data?.length || 0, 'gönderi');
      } else {
        console.warn('⚠️ Posts yüklenemedi:', response.data?.message || 'Bilinmeyen hata');
        setPosts([]);
      }
    } catch (error) {
      console.error('❌ Gönderiler yüklenemedi:', error);
      alert.show('Hata', 'Gönderiler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handlePostAdventure = () => {
    try {
      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.8,
          selectionLimit: 1,
        },
        (response) => {
          if (response.didCancel) {
            return;
          }
          if (response.errorMessage) {
            alert.show('Hata', response.errorMessage || 'Fotoğraf seçilirken bir hata oluştu');
            return;
          }
          if (response.assets && response.assets.length > 0) {
            navigation.navigate('CreatePost', { image: response.assets[0].uri });
          }
        }
      );
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      alert.show('Hata', 'Fotoğraf seçilirken bir hata oluştu');
    }
  };

  const handleLike = async (postId) => {
    if (!userId) {
      alert.show('Giriş Gerekli', 'Beğenmek için lütfen giriş yapın.');
      return;
    }

    try {
      const post = posts.find(p => p.id === postId);
      const isLiked = post?.isLiked;

      if (isLiked) {
        // Unlike
        const response = await communityAPI.unlikePost(postId, userId);
        if (response.data && response.data.success) {
          setPosts(
            posts.map((p) =>
              p.id === postId
                ? { ...p, likes: response.data.likes || p.likes - 1, isLiked: false }
                : p
            )
          );
        }
      } else {
        // Like
        const response = await communityAPI.likePost(postId, userId);
        if (response.data && response.data.success) {
          setPosts(
            posts.map((p) =>
              p.id === postId
                ? { ...p, likes: response.data.likes || p.likes + 1, isLiked: true }
                : p
            )
          );
        }
      }
    } catch (error) {
      console.error('❌ Like error:', error);
      alert.show('Hata', 'Beğeni işlemi sırasında bir hata oluştu.');
    }
  };

  const handleComment = async (postId) => {
    if (!userId) {
      alert.show('Giriş Gerekli', 'Yorum yapmak için lütfen giriş yapın.');
      return;
    }

    setCurrentPostId(postId);
    setShowCommentPrompt(true);
  };

  const handleCommentSubmit = async (comment) => {
    if (!comment || !comment.trim() || !currentPostId) return;

    try {
      const response = await communityAPI.addComment(currentPostId, userId, comment);
      if (response.data && response.data.success) {
        // Reload posts to get updated comment count
        loadPosts();
        alert.show('Başarılı', 'Yorumunuz eklendi!');
      }
    } catch (error) {
      console.error('❌ Comment error:', error);
      alert.show('Hata', 'Yorum eklenirken bir hata oluştu.');
    } finally {
      setShowCommentPrompt(false);
      setCurrentPostId(null);
    }
  };

  const handleShare = async (post) => {
    alert.show('Paylaş', 'Paylaşım özelliği yakında eklenecek!');
  };

  const handleProductClick = async (post) => {
    if (post.productId) {
      // Navigate with productId - ProductDetailScreen will fetch the product
      navigation.navigate('ProductDetail', { productId: post.productId });
    } else if (post.productName) {
      // Try to find product by name if productId is not available
      alert.show(
        post.productName || 'Ürün',
        `Fiyat: ${post.productPrice || 'Bilinmiyor'}\n\nÜrün detaylarına gitmek ister misiniz?`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Ürüne Git', onPress: () => {
            // You could implement a search by product name here if needed
            alert.show('Bilgi', 'Ürün ID bulunamadı. Lütfen ürünü mağazadan arayın.');
          } },
        ]
      );
    } else {
      alert.show('Bilgi', 'Bu gönderi ile ilişkili bir ürün bulunamadı.');
    }
  };

  const filteredPosts = posts;

  console.log('📊 Render durumu:', {
    totalPosts: posts.length,
    filteredPosts: filteredPosts.length,
    loading,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {!isInTabNavigator && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
        )}
        {isInTabNavigator && <View style={{ width: 40 }} />}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {discoverMode ? 'Keşfet' : notificationsMode ? 'Bildirimler' : 'In the Wild'}
          </Text>
          {!discoverMode && !notificationsMode && (
            <Text style={styles.headerSubtitle}>by Huğlu</Text>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
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
              <TouchableOpacity 
                style={styles.userInfo}
                onPress={() => navigation.navigate('CommunityProfile', { userId: post.userId })}
              >
                <Image source={{ uri: post.userAvatar }} style={styles.userAvatar} />
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{post.userName}</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={12} color={COLORS.gray500} />
                    <Text style={styles.location}>{post.location}</Text>
                    <Text style={styles.timeAgo}> • {post.timeAgo}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.followButton}
                onPress={() => {
                  // Follow functionality will be handled in profile screen
                  navigation.navigate('CommunityProfile', { userId: post.userId });
                }}
              >
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
                <Ionicons 
                  name={post.isLiked ? "heart" : "heart-outline"} 
                  size={24} 
                  color={post.isLiked ? COLORS.primary : COLORS.textMain} 
                />
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
            {post.productId && (
            <TouchableOpacity
              style={styles.productTag}
              onPress={() => handleProductClick(post)}
            >
              {post.productImage ? (
                <Image
                  source={{ uri: post.productImage }}
                  style={styles.productTagImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.productTagImage, styles.productTagImagePlaceholder]}>
                  <Ionicons name="image-outline" size={24} color={COLORS.gray400} />
                </View>
              )}
              <View style={styles.productTagInfo}>
                <Text style={styles.productTagName} numberOfLines={1}>
                  {post.productName}
                </Text>
                <Text style={styles.productTagPrice}>{post.productPrice}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
            )}
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

      {/* Custom Alert */}
      {alert.AlertComponent()}

      {/* Custom Prompt */}
      <CustomPrompt
        visible={showCommentPrompt}
        onClose={() => {
          setShowCommentPrompt(false);
          setCurrentPostId(null);
        }}
        title="Yorum Yap"
        message="Yorumunuzu yazın:"
        placeholder="Yorumunuzu buraya yazın..."
        onSubmit={handleCommentSubmit}
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
  productTagImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray200,
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
