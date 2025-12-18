import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';

const MOCK_CHATS = [
  {
    id: 1,
    title: 'Climbing Gear Inquiry',
    lastMessage: 'Is this carabiner suitable for heavy loading?',
    timestamp: '12:30 PM',
    icon: 'fitness-outline',
    iconBg: 'rgba(17, 212, 33, 0.1)',
    iconColor: COLORS.primary,
    isActive: true,
    unreadCount: 2,
  },
  {
    id: 2,
    title: 'Order #4921 - Sleeping Bag',
    lastMessage: 'Hi, thanks for reaching out! The temperature...',
    timestamp: 'Oct 12',
    icon: 'cube-outline',
    iconBg: 'rgba(255, 149, 0, 0.1)',
    iconColor: '#FF9500',
    isActive: false,
    unreadCount: 0,
  },
  {
    id: 3,
    title: 'Return Policy Question',
    lastMessage: "Can I return the boots if I've worn them...",
    timestamp: 'Sep 28',
    icon: 'return-down-back-outline',
    iconBg: 'rgba(0, 122, 255, 0.1)',
    iconColor: '#007AFF',
    isActive: false,
    isResolved: true,
  },
  {
    id: 4,
    title: 'Tent Setup Guide',
    lastMessage: 'Here is the PDF manual for the 4-person...',
    timestamp: 'Aug 15',
    icon: 'home-outline',
    iconBg: COLORS.gray100,
    iconColor: COLORS.gray600,
    isActive: false,
    isResolved: true,
  },
  {
    id: 5,
    title: 'Membership Renewal',
    lastMessage: 'Your points have been successfully added...',
    timestamp: 'Jul 02',
    icon: 'person-circle-outline',
    iconBg: 'rgba(175, 82, 222, 0.1)',
    iconColor: '#AF52DE',
    isActive: false,
    isResolved: true,
  },
];

export default function ChatHistoryScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      setLoading(true);
      // Gerçek API çağrısı yerine mock data kullanıyoruz
      // const response = await chatAPI.getHistory();
      await new Promise(resolve => setTimeout(resolve, 500)); // Simüle edilmiş yükleme
      setChats(MOCK_CHATS);
    } catch (error) {
      console.error('Chat history yükleme hatası:', error);
      setChats(MOCK_CHATS); // Fallback to mock data
    } finally {
      setLoading(false);
    }
  };

  const handleChatPress = (chat) => {
    navigation.navigate('LiveChat', { chatId: chat.id, chatTitle: chat.title });
  };

  const handleNewChat = () => {
    navigation.navigate('LiveChat', { isNew: true });
  };

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentChats = filteredChats.filter(chat => !chat.isResolved);
  const previousChats = filteredChats.filter(chat => chat.isResolved);

  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.chatItem,
        item.isActive && styles.chatItemActive,
      ]}
      onPress={() => handleChatPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.chatIconContainer}>
        <View style={[styles.chatIcon, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon} size={24} color={item.iconColor} />
        </View>
        {item.isActive && <View style={styles.activeIndicator} />}
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[
            styles.chatTimestamp,
            item.isActive && styles.chatTimestampActive
          ]}>
            {item.timestamp}
          </Text>
        </View>
        <Text style={styles.chatMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>

      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount}</Text>
        </View>
      )}

      {item.isResolved && (
        <View style={styles.resolvedIcon}>
          <Ionicons name="checkmark" size={16} color={COLORS.gray400} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSectionHeader = (title, showClear = false) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {showClear && (
        <TouchableOpacity>
          <Text style={styles.clearButton}>Clear all</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Support History</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support History</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={COLORS.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Chat List */}
      <FlatList
        data={[]}
        keyExtractor={(item) => item.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {recentChats.length > 0 && (
              <>
                {renderSectionHeader('RECENT', true)}
                {recentChats.map(chat => (
                  <View key={chat.id}>
                    {renderChatItem({ item: chat })}
                  </View>
                ))}
              </>
            )}
            {previousChats.length > 0 && (
              <>
                {renderSectionHeader('PREVIOUS')}
                {previousChats.map(chat => (
                  <View key={chat.id}>
                    {renderChatItem({ item: chat })}
                  </View>
                ))}
              </>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={64} color={COLORS.gray300} />
            </View>
            <Text style={styles.emptyTitle}>No conversation history yet</Text>
            <Text style={styles.emptySubtitle}>
              Start a conversation with our support team
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewChat}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={24} color={COLORS.white} />
        <Text style={styles.fabText}>New Chat</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
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
    fontSize: 14,
    color: COLORS.textMain,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray500,
    letterSpacing: 0.5,
  },
  clearButton: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chatItemActive: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  chatIconContainer: {
    position: 'relative',
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  chatContent: {
    flex: 1,
    gap: 4,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginRight: 8,
  },
  chatTimestamp: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray400,
  },
  chatTimestampActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  chatMessage: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  resolvedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.gray500,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
