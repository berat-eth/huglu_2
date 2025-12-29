import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { liveSupportAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LiveChatScreen({ navigation, route }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState(null);
  const scrollViewRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Kullanıcı ID'sini al
  useEffect(() => {
    loadUserId();
  }, []);

  // Mesaj geçmişini yükle
  useEffect(() => {
    if (userId) {
      loadMessages();
      // İlk mesaj varsa gönder
      const initialMessage = route?.params?.initialMessage;
      if (initialMessage && initialMessage.trim()) {
        setTimeout(() => {
          sendInitialMessage(initialMessage);
        }, 1000);
      }
      // Her 5 saniyede bir yeni mesajları kontrol et (sadece aktif konuşmalar için)
      const conversationDate = route?.params?.conversationDate;
      if (!conversationDate) {
        // Sadece aktif konuşmalar için otomatik yenileme
        const interval = setInterval(() => {
          loadMessages();
        }, 5000);
        return () => clearInterval(interval);
      }
    }
  }, [userId, route?.params?.conversationDate]);

  const loadUserId = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        setUserId(parseInt(storedUserId));
      } else {
        // Eğer userId yoksa, route'dan al veya varsayılan olarak 1 kullan
        const routeUserId = route?.params?.userId;
        if (routeUserId) {
          setUserId(routeUserId);
        } else {
          // Misafir kullanıcı için
          setUserId(1);
        }
      }
    } catch (error) {
      console.error('User ID yükleme hatası:', error);
      setUserId(1); // Varsayılan olarak misafir kullanıcı
    }
  };

  const loadMessages = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      // Eğer conversationDate varsa, o tarihteki mesajları filtrele
      const conversationDate = route?.params?.conversationDate;
      const response = await liveSupportAPI.getHistory(userId);
      
      if (response && response.success && response.data) {
        // Backend'den gelen mesajları formatla
        let filteredMessages = response.data;
        
        // Eğer belirli bir tarih seçildiyse, o tarihteki mesajları filtrele
        if (conversationDate) {
          const targetDate = new Date(conversationDate).toISOString().split('T')[0];
          filteredMessages = response.data.filter(msg => {
            if (!msg.timestamp) return false;
            const msgDate = new Date(msg.timestamp).toISOString().split('T')[0];
            return msgDate === targetDate;
          });
        }
        
        // Mesajları formatla ve duplicate kontrolü yap
        const messageMap = new Map();
        filteredMessages.forEach((msg, index) => {
          const isUser = msg.intent === 'live_support';
          const isAdmin = msg.intent === 'admin_message';
          
          // Mesaj ID'si ve timestamp kombinasyonu ile unique key oluştur
          const messageKey = `${msg.id || index}-${msg.timestamp || Date.now()}`;
          
          if (!messageMap.has(messageKey)) {
            messageMap.set(messageKey, {
              id: msg.id || Date.now() + index,
              text: msg.message || '',
              isUser: isUser,
              isAdmin: isAdmin,
              time: msg.timestamp 
                ? new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
              timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()
            });
          }
        });

        // Map'ten array'e çevir ve timestamp'e göre sırala
        const formattedMessages = Array.from(messageMap.values());
        formattedMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        setMessages(formattedMessages);
        
        // Scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('[LiveChat] Mesaj geçmişi yükleme hatası:', error);
      if (__DEV__) {
        console.error('[LiveChat] Hata detayları:', error);
      }
      // İlk yüklemede hata varsa hoş geldin mesajı göster
      if (messages.length === 0) {
        setMessages([{
          id: 1,
          text: 'Merhaba! Size nasıl yardımcı olabilirim?',
          isUser: false,
          isAdmin: false,
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendInitialMessage = async (messageText) => {
    if (!messageText.trim() || !userId || sending) return;

    setSending(true);

    try {
      const response = await liveSupportAPI.sendMessage(userId, messageText);
      
      if (response && response.success) {
        // Mesaj başarıyla gönderildi, geçmişi yenile
        setTimeout(() => {
          loadMessages();
        }, 500);
      }
    } catch (error) {
      console.error('İlk mesaj gönderme hatası:', error);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !userId || sending) return;

    const messageText = message.trim();
    setMessage('');
    setSending(true);

    // Optimistic update - mesajı hemen göster
    const tempMessage = {
      id: Date.now(),
      text: messageText,
      isUser: true,
      isAdmin: false,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, tempMessage]);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await liveSupportAPI.sendMessage(userId, messageText);
      
      if (response && response.success) {
        // Mesaj başarıyla gönderildi, hemen geçmişi yenile
        // Optimistic update zaten yapıldı, şimdi backend'den gerçek mesajı al
        setTimeout(() => {
          loadMessages();
        }, 300); // 300ms sonra yenile (mesajın kaydedilmesi için yeterli süre)
      } else {
        // Hata durumunda mesajı geri al
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        Alert.alert('Hata', 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('[LiveChat] Mesaj gönderme hatası:', error);
      if (__DEV__) {
        console.error('[LiveChat] Hata detayları:', error);
      }
      // Hata durumunda mesajı geri al
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      Alert.alert('Hata', 'Mesaj gönderilemedi. Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.agentAvatar}>
            <Ionicons name="headset" size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Canlı Destek</Text>
            <View style={styles.onlineStatus}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Çevrimiçi</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => navigation.navigate('ChatHistory')}
        >
          <Ionicons name="time-outline" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
          </View>
        ) : (
          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }}
          >
            {/* Date Separator */}
            {messages.length > 0 && (
              <View style={styles.dateSeparator}>
                <View style={styles.dateLine} />
                <Text style={styles.dateText}>Bugün</Text>
                <View style={styles.dateLine} />
              </View>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  msg.isUser ? styles.messageRowUser : styles.messageRowAgent,
                ]}
              >
                {!msg.isUser && (
                  <View style={styles.messageAvatar}>
                    <Ionicons 
                      name={msg.isAdmin ? "person" : "headset"} 
                      size={16} 
                      color={msg.isAdmin ? COLORS.primary : COLORS.success} 
                    />
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    msg.isUser ? styles.messageBubbleUser : styles.messageBubbleAgent,
                    msg.isAdmin && styles.messageBubbleAdmin,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.isUser ? styles.messageTextUser : styles.messageTextAgent,
                    ]}
                  >
                    {msg.text}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      msg.isUser ? styles.messageTimeUser : styles.messageTimeAgent,
                    ]}
                  >
                    {msg.time}
                  </Text>
                </View>
              </View>
            ))}

            {/* Typing Indicator - Admin yazıyor göstergesi */}
            {sending && (
              <View style={styles.typingIndicator}>
                <View style={styles.messageAvatar}>
                  <Ionicons name="headset" size={16} color={COLORS.primary} />
                </View>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDots}>
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle-outline" size={24} color={COLORS.gray400} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor={COLORS.gray400}
            value={message}
            onChangeText={setMessage}
            multiline
            editable={!sending && !loading}
          />
          <TouchableOpacity 
            style={[styles.sendButton, message.trim() && styles.sendButtonActive]}
            onPress={sendMessage}
            disabled={!message.trim() || sending || loading}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons 
                name="send" 
                size={20} 
                color={message.trim() ? COLORS.white : COLORS.gray400} 
              />
            )}
          </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  onlineText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray500,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray200,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.gray400,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAgent: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(17, 212, 33, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleAgent: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  messageBubbleAdmin: {
    backgroundColor: '#E3F2FD',
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTextUser: {
    color: COLORS.white,
  },
  messageTextAgent: {
    color: COLORS.textMain,
  },
  messageTime: {
    fontSize: 11,
  },
  messageTimeUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeAgent: {
    color: COLORS.gray400,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  typingBubble: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gray400,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    fontSize: 15,
    color: COLORS.textMain,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: COLORS.primary,
  },
});
