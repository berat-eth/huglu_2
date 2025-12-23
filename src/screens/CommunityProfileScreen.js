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
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { communityAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';

const { width } = Dimensions.get('window');

export default function CommunityProfileScreen({ navigation, route }) {
  const alert = useAlert();
  const { userId: profileUserId } = route.params || {};
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    followers: 0,
    following: 0,
  });
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Edit modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editCaption, setEditCaption] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [pressedPostId, setPressedPostId] = useState(null);

  // Check if we're in tab navigator mode
  const isInTabNavigator = navigation.getParent()?.getState()?.type === 'tab';
  const targetUserId = profileUserId || currentUserId;

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (targetUserId) {
      loadProfileData();
      loadPosts();
      loadStats();
      checkFollowingStatus();
    }
  }, [targetUserId]);

  const loadUserData = async () => {
    try {
      const id = await AsyncStorage.getItem('userId');
      const name = await AsyncStorage.getItem('userName');
      setCurrentUserId(id);
      setUserName(name || 'Kullanıcı');
      
      if (!profileUserId || profileUserId === id) {
        setIsOwnProfile(true);
      }
    } catch (error) {
      console.error('Kullanıcı bilgisi yüklenemedi:', error);
    }
  };

  const loadProfileData = async () => {
    try {
      // Get user info from posts or user API
      // For now, we'll get it from the first post
    } catch (error) {
      console.error('Profil bilgisi yüklenemedi:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await communityAPI.getUserPosts(targetUserId, { page: 1, limit: 50 });
      
      if (response.data && response.data.success) {
        setPosts(response.data.data || []);
        
        // Get user info from first post if available
        if (response.data.data && response.data.data.length > 0) {
          const firstPost = response.data.data[0];
          if (!userName) setUserName(firstPost.userName || 'Kullanıcı');
          if (!userAvatar) setUserAvatar(firstPost.userAvatar || '');
        }
      }
    } catch (error) {
      console.error('❌ Paylaşımlar yüklenemedi:', error);
      alert.show('Hata', 'Paylaşımlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      // Calculate stats from posts
      let totalLikes = 0;
      let totalComments = 0;
      
      posts.forEach(post => {
        totalLikes += post.likes || 0;
        totalComments += post.comments || 0;
      });
      
      // Load followers and following counts
      let followersCount = 0;
      let followingCount = 0;
      
      try {
        const followersResponse = await communityAPI.getFollowers(targetUserId);
        if (followersResponse.data && followersResponse.data.success) {
          followersCount = followersResponse.data.data?.length || 0;
        }
        
        const followingResponse = await communityAPI.getFollowing(targetUserId);
        if (followingResponse.data && followingResponse.data.success) {
          followingCount = followingResponse.data.data?.length || 0;
        }
      } catch (error) {
        console.warn('Takipçi/takip sayıları yüklenemedi:', error);
      }
      
      setStats({
        totalPosts: posts.length,
        totalLikes,
        totalComments,
        followers: followersCount,
        following: followingCount,
      });
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  const checkFollowingStatus = async () => {
    if (!currentUserId || !targetUserId || isOwnProfile) return;
    
    try {
      const response = await communityAPI.getFollowing(currentUserId);
      if (response.data && response.data.success) {
        const following = response.data.data || [];
        const isFollowingUser = following.some(f => f.followUserId === parseInt(targetUserId));
        setIsFollowing(isFollowingUser);
      }
    } catch (error) {
      console.error('Takip durumu kontrol edilemedi:', error);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId) {
      alert.show('Giriş Gerekli', 'Takip etmek için lütfen giriş yapın.');
      return;
    }

    try {
      if (isFollowing) {
        await communityAPI.unfollowUser(currentUserId, targetUserId);
        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      } else {
        await communityAPI.followUser(currentUserId, targetUserId);
        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error) {
      console.error('Takip işlemi hatası:', error);
      alert.show('Hata', 'Takip işlemi sırasında bir hata oluştu');
    }
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setEditCaption(post.caption || '');
    setEditLocation(post.location || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;

    try {
      setSaving(true);
      const response = await communityAPI.updatePost(editingPost.id, {
        caption: editCaption,
        location: editLocation,
      });

      if (response.data && response.data.success) {
        // Update post in list
        setPosts(posts.map(p => 
          p.id === editingPost.id 
            ? { ...p, caption: editCaption, location: editLocation }
            : p
        ));
        setEditModalVisible(false);
        alert.show('Başarılı', 'Paylaşım güncellendi');
      } else {
        throw new Error(response.data?.message || 'Güncelleme başarısız');
      }
    } catch (error) {
      console.error('❌ Güncelleme hatası:', error);
      alert.show('Hata', 'Paylaşım güncellenirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = (postId) => {
    alert.show(
      'Paylaşımı Sil',
      'Bu paylaşımı silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await communityAPI.deletePost(postId);
              if (response.data && response.data.success) {
                setPosts(posts.filter(p => p.id !== postId));
                setStats(prev => ({ ...prev, totalPosts: prev.totalPosts - 1 }));
                alert.show('Başarılı', 'Paylaşım silindi');
              }
            } catch (error) {
              console.error('❌ Silme hatası:', error);
              alert.show('Hata', 'Paylaşım silinirken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
    loadStats();
  };

  useEffect(() => {
    loadStats();
  }, [posts]);

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
        <Text style={styles.headerTitle}>Profil</Text>
        {isOwnProfile && (
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            <Ionicons 
              name={viewMode === 'grid' ? 'list' : 'grid'} 
              size={24} 
              color={COLORS.textMain} 
            />
          </TouchableOpacity>
        )}
        {!isOwnProfile && !isInTabNavigator && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
        )}
        {!isOwnProfile && isInTabNavigator && <View style={{ width: 40 }} />}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: userAvatar || `https://i.pravatar.cc/150?img=${targetUserId || 1}` }}
              style={styles.avatar}
            />
            {isOwnProfile && (
              <TouchableOpacity style={styles.editAvatarButton}>
                <Ionicons name="camera" size={16} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.userName}>{userName}</Text>
          
          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalPosts}</Text>
              <Text style={styles.statLabel}>Paylaşım</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.followers}</Text>
              <Text style={styles.statLabel}>Takipçi</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.following}</Text>
              <Text style={styles.statLabel}>Takip</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalLikes}</Text>
              <Text style={styles.statLabel}>Beğeni</Text>
            </View>
          </View>

          {/* Action Buttons */}
          {isOwnProfile ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('CreatePost')}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.editButtonText}>Yeni Paylaşım</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollow}
            >
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Community Rules Button */}
        <View style={styles.communityRulesSection}>
          <TouchableOpacity 
            style={styles.communityRulesButton}
            onPress={() => navigation.navigate('CommunityRules')}
          >
            <View style={styles.communityRulesIconContainer}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.communityRulesContent}>
              <Text style={styles.communityRulesTitle}>Topluluk Kuralları</Text>
              <Text style={styles.communityRulesSubtitle}>Topluluk kurallarını okuyun ve uygulayın</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
          </TouchableOpacity>
        </View>

        {/* Posts Section */}
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Paylaşımlar</Text>
          
          {loading && posts.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={64} color={COLORS.gray300} />
              <Text style={styles.emptyTitle}>Henüz Paylaşım Yok</Text>
              <Text style={styles.emptySubtitle}>
                {isOwnProfile ? 'İlk paylaşımınızı yapın!' : 'Bu kullanıcının henüz paylaşımı yok'}
              </Text>
            </View>
          ) : viewMode === 'grid' ? (
            <View style={styles.gridContainer}>
              {posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.gridItem}
                  onPressIn={() => isOwnProfile && setPressedPostId(post.id)}
                  onPressOut={() => setPressedPostId(null)}
                  onPress={() => {
                    if (isOwnProfile && pressedPostId === post.id) {
                      // Show actions on short press for own posts
                      setPressedPostId(null);
                    }
                  }}
                  onLongPress={() => isOwnProfile && handleEditPost(post)}
                >
                  <Image source={{ uri: post.image }} style={styles.gridImage} resizeMode="cover" />
                  {isOwnProfile && pressedPostId === post.id && (
                    <View style={styles.gridOverlay}>
                      <TouchableOpacity
                        style={styles.gridActionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          setPressedPostId(null);
                          handleEditPost(post);
                        }}
                      >
                        <Ionicons name="create-outline" size={18} color={COLORS.white} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.gridActionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          setPressedPostId(null);
                          handleDeletePost(post.id);
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.listContainer}>
              {posts.map((post) => (
                <View key={post.id} style={styles.listItem}>
                  <Image source={{ uri: post.image }} style={styles.listImage} resizeMode="cover" />
                  <View style={styles.listContent}>
                    <Text style={styles.listCaption} numberOfLines={2}>
                      {post.caption || 'Açıklama yok'}
                    </Text>
                    <View style={styles.listMeta}>
                      <Ionicons name="heart" size={14} color={COLORS.gray500} />
                      <Text style={styles.listMetaText}>{post.likes || 0}</Text>
                      <Ionicons name="chatbubble" size={14} color={COLORS.gray500} style={styles.listMetaIcon} />
                      <Text style={styles.listMetaText}>{post.comments || 0}</Text>
                      <Text style={styles.listTime}>{post.timeAgo}</Text>
                    </View>
                  </View>
                  {isOwnProfile && (
                    <View style={styles.listActions}>
                      <TouchableOpacity onPress={() => handleEditPost(post)}>
                        <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeletePost(post.id)}>
                        <Ionicons name="trash-outline" size={20} color={COLORS.error || '#FF3B30'} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Paylaşımı Düzenle</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Açıklama</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Açıklama yazın..."
                  placeholderTextColor={COLORS.gray400}
                  value={editCaption}
                  onChangeText={setEditCaption}
                  multiline
                  maxLength={500}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Konum</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Konum..."
                  placeholderTextColor={COLORS.gray400}
                  value={editLocation}
                  onChangeText={setEditLocation}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert */}
      {alert.AlertComponent()}
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
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.gray200,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    width: '100%',
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  followButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: COLORS.gray200,
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  followingButtonText: {
    color: COLORS.textMain,
  },
  postsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray500,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridItem: {
    width: (width - 32 - 4) / 3,
    aspectRatio: 1,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.gray100,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  gridActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listImage: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.gray100,
  },
  listContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  listCaption: {
    fontSize: 14,
    color: COLORS.textMain,
    marginBottom: 8,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listMetaIcon: {
    marginLeft: 12,
  },
  listMetaText: {
    fontSize: 12,
    color: COLORS.gray500,
    marginLeft: 4,
  },
  listTime: {
    fontSize: 12,
    color: COLORS.gray400,
    marginLeft: 'auto',
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  modalBody: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORS.textMain,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.gray100,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  communityRulesSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.backgroundLight,
  },
  communityRulesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  communityRulesIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  communityRulesContent: {
    flex: 1,
  },
  communityRulesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  communityRulesSubtitle: {
    fontSize: 13,
    color: COLORS.gray500,
  },
});

