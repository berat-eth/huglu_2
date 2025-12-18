import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const MESSAGES = [
  { id: 1, text: 'Merhaba! Size nasıl yardımcı olabilirim?', isUser: false, time: '14:30' },
  { id: 2, text: 'Merhaba, siparişim hakkında bilgi almak istiyorum', isUser: true, time: '14:31' },
  { id: 3, text: 'Tabii ki! Sipariş numaranızı paylaşabilir misiniz?', isUser: false, time: '14:31' },
  { id: 4, text: '#48291', isUser: true, time: '14:32' },
  { id: 5, text: 'Siparişiniz kargoya verildi. Tahmini teslimat tarihi 18 Aralık.', isUser: false, time: '14:32' },
];

export default function LiveChatScreen({ navigation }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(MESSAGES);

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        text: message,
        isUser: true,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
      setMessage('');
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
        <ScrollView 
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Date Separator */}
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>Bugün</Text>
            <View style={styles.dateLine} />
          </View>

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
                  <Ionicons name="person" size={16} color={COLORS.primary} />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  msg.isUser ? styles.messageBubbleUser : styles.messageBubbleAgent,
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

          {/* Typing Indicator */}
          <View style={styles.typingIndicator}>
            <View style={styles.messageAvatar}>
              <Ionicons name="person" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.typingBubble}>
              <View style={styles.typingDots}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            </View>
          </View>
        </ScrollView>

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
          />
          <TouchableOpacity 
            style={[styles.sendButton, message.trim() && styles.sendButtonActive]}
            onPress={sendMessage}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={message.trim() ? COLORS.white : COLORS.gray400} 
            />
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
