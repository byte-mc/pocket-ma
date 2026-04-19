import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  type ConversationMessage,
  sendMessage,
} from '../services/assistant';
import { initModel, initMultimodal } from '../services/model';
import { listen, requestMicPermission } from '../services/speech';

type AppState = 'downloading' | 'initializing' | 'ready' | 'thinking' | 'error';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imagePath?: string;
  isTriageResult?: boolean;
};

function buildHistory(chatMessages: ChatMessage[]): ConversationMessage[] {
  return chatMessages.map(m => ({
    role: m.role,
    content: m.imagePath
      ? [
          { type: 'image_url', image_url: { url: `file://${m.imagePath}` } },
          { type: 'text', text: m.text },
        ]
      : m.text,
  }));
}

export default function HomeScreen() {
  const [appState, setAppState] = useState<AppState>('downloading');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [imagePath, setImagePath] = useState<string | undefined>();
  const [listening, setListening] = useState(false);
  const [mmProjProgress, setMmProjProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    initModel(p => {
      if (p >= 1) setAppState('initializing');
      else setDownloadProgress(p);
    })
      .then(() => setAppState('ready'))
      .catch(e => { setError(String(e)); setAppState('error'); });
  }, []);

  function scrollToBottom() {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text && !imagePath) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      imagePath,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setImagePath(undefined);
    setAppState('thinking');
    scrollToBottom();

    try {
      const history = buildHistory(messages); // history before this message
      const response = await sendMessage(history, text, imagePath);
      const truncated = response.message.startsWith('(Sorry,');
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.message,
        isTriageResult: response.phase === 'triage',
      };
      // If truncated, also roll back the user message so history stays clean
      setMessages(prev => {
        const withAssistant = [...prev, assistantMsg];
        return truncated ? prev.slice(0, -1).concat(assistantMsg) : withAssistant;
      });
      scrollToBottom();
    } catch (e) {
      setError(String(e));
    } finally {
      setAppState('ready');
    }
  }

  function handleTriageNow() {
    handleSend('Please assess and provide the triage now.');
  }

  function handleNew() {
    setMessages([]);
    setInput('');
    setImagePath(undefined);
  }

  async function handleCamera() {
    Alert.alert('Add Image', 'Choose source', [
      {
        text: 'Camera',
        onPress: async () => {
          const res = await launchCamera({ mediaType: 'photo', quality: 0.8 });
          if (res.assets?.[0]?.uri) await loadMmProjAndSetImage(res.assets[0].uri);
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const res = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
          if (res.assets?.[0]?.uri) await loadMmProjAndSetImage(res.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function loadMmProjAndSetImage(uri: string) {
    const path = uri.replace('file://', '');
    try {
      setMmProjProgress(0);
      await initMultimodal(p => setMmProjProgress(p));
      setMmProjProgress(null);
      setImagePath(path);
    } catch (e) {
      setMmProjProgress(null);
      Alert.alert('Error', 'Failed to load vision model: ' + String(e));
    }
  }

  async function handleMic() {
    const granted = await requestMicPermission();
    if (!granted) {
      Alert.alert('Permission required', 'Microphone access is needed for voice input.');
      return;
    }
    setListening(true);
    try {
      const transcript = await listen('en-US');
      if (transcript) setInput(transcript);
    } catch (e) {
      Alert.alert('Voice error', String(e));
    } finally {
      setListening(false);
    }
  }

  // ── Loading screens ──────────────────────────────────────────────────────

  if (appState === 'downloading') {
    return (
      <View style={styles.center}>
        <Text style={styles.loadLabel}>Downloading model…</Text>
        <Text style={styles.loadProgress}>{Math.round(downloadProgress * 100)}%</Text>
        <Text style={styles.loadSub}>~3.1 GB · one-time download</Text>
        <ActivityIndicator size="large" style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (appState === 'initializing') {
    return (
      <View style={styles.center}>
        <Text style={styles.loadLabel}>Loading model…</Text>
        <ActivityIndicator size="large" style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (appState === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // ── Chat UI ──────────────────────────────────────────────────────────────

  function renderMessage({ item }: { item: ChatMessage }) {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
        {item.imagePath && (
          <Image
            source={{ uri: `file://${item.imagePath}` }}
            style={styles.inlineThumbnail}
          />
        )}
        <View style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAI,
          item.isTriageResult && styles.bubbleTriage,
        ]}>
          <Text style={[
            styles.bubbleText,
            item.isTriageResult && styles.bubbleTriageText,
          ]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pocket MA</Text>
        {hasMessages && (
          <TouchableOpacity onPress={handleNew} style={styles.newButton}>
            <Text style={styles.newButtonText}>New</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>What's the situation?</Text>
            <Text style={styles.emptySub}>Describe a symptom, take a photo, or speak.</Text>
          </View>
        }
      />

      {/* Thinking indicator */}
      {appState === 'thinking' && (
        <View style={styles.thinkingRow}>
          <ActivityIndicator size="small" />
          <Text style={styles.thinkingText}>Thinking…</Text>
        </View>
      )}

      {/* Triage Now button */}
      {hasMessages && appState === 'ready' && (
        <TouchableOpacity style={styles.triageNowButton} onPress={handleTriageNow}>
          <Text style={styles.triageNowText}>Triage Now</Text>
        </TouchableOpacity>
      )}

      {/* Image preview */}
      {imagePath && (
        <View style={styles.imagePreviewRow}>
          <Image source={{ uri: `file://${imagePath}` }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.clearImage} onPress={() => setImagePath(undefined)}>
            <Text style={styles.clearImageText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.iconButton} onPress={handleCamera}>
          <Text style={styles.iconText}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={handleMic} disabled={listening}>
          <Text style={styles.iconText}>{listening ? '⏳' : '🎙️'}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.inputField}
          placeholder="Describe symptom…"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={() => handleSend()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() && !imagePath) && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={appState === 'thinking' || (!input.trim() && !imagePath)}>
          <Text style={styles.sendButtonText}>↑</Text>
        </TouchableOpacity>
      </View>

      {/* mmproj download modal */}
      <Modal visible={mmProjProgress !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.loadLabel}>Loading vision model…</Text>
            <Text style={styles.loadProgress}>{Math.round((mmProjProgress ?? 0) * 100)}%</Text>
            <Text style={styles.loadSub}>~985 MB · one-time download</Text>
            <ActivityIndicator size="large" style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Loading
  loadLabel: { fontSize: 16, marginBottom: 8 },
  loadProgress: { fontSize: 32, fontWeight: '700' },
  loadSub: { fontSize: 13, color: '#888', marginTop: 4 },
  errorText: { color: 'red', fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd',
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  newButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0f0f0', borderRadius: 8 },
  newButtonText: { fontSize: 14, color: '#333' },

  // Messages
  messageList: { padding: 16, gap: 12, flexGrow: 1 },
  bubbleRow: { flexDirection: 'column', maxWidth: '80%' },
  bubbleRowUser: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleRowAI: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: '#007AFF' },
  bubbleAI: { backgroundColor: '#f0f0f0' },
  bubbleTriage: { backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#a5d6a7', maxWidth: '100%', alignSelf: 'stretch' },
  bubbleText: { fontSize: 15, lineHeight: 22, color: '#000' },
  bubbleTriageText: { fontFamily: 'monospace', fontSize: 14, lineHeight: 22, color: '#1b5e20' },
  inlineThumbnail: { width: 120, height: 120, borderRadius: 10, marginBottom: 6 },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#888', textAlign: 'center' },

  // Thinking
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  thinkingText: { fontSize: 14, color: '#888' },

  // Triage Now
  triageNowButton: {
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#a5d6a7',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  triageNowText: { fontSize: 15, fontWeight: '600', color: '#2e7d32' },

  // Image preview above input
  imagePreviewRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 4 },
  imagePreview: { width: 64, height: 64, borderRadius: 8 },
  clearImage: {
    position: 'absolute', top: -4, left: 72,
    backgroundColor: '#333', borderRadius: 10,
    width: 20, height: 20, justifyContent: 'center', alignItems: 'center',
  },
  clearImageText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  iconButton: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center',
  },
  iconText: { fontSize: 20 },
  inputField: {
    flex: 1, fontSize: 15, maxHeight: 100,
    borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fafafa',
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#ccc' },
  sendButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', width: '80%' },
});
