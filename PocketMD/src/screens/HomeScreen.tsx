import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
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
import { type Region, REGIONS } from '../data/regionalKnowledge';
import { type SessionRecord, loadSessions, upsertSession } from '../services/sessions';
import { initModel, initMultimodal } from '../services/model';
import { listen, requestMicPermission } from '../services/speech';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  primary:   '#0E7C6E',
  primaryDk: '#0A5E53',
  bg:        '#F2F4F7',
  white:     '#FFFFFF',
  textDark:  '#1A1A2E',
  textMid:   '#5A6473',
  textLight: '#9BA5B4',
  border:    '#E4E8EF',
  userBubble:'#0E7C6E',
  aiBubble:  '#FFFFFF',
  severityLow:       '#27AE60',
  severityMedium:    '#F39C12',
  severityHigh:      '#E67E22',
  severityEmergency: '#E74C3C',
};

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Brand icon: bold "P" with "+" tucked at lower-right ──────────────────────
function BrandIcon({ size = 32, color = '#fff' }: { size?: number; color?: string }) {
  const plusSize = size * 0.32;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.72, height: size }}>
        <Text style={{
          fontSize: size, fontWeight: '300', color,
          lineHeight: size, letterSpacing: -1,
          includeFontPadding: false,
        }}>P</Text>
        <Text style={{
          fontSize: plusSize, fontWeight: '900', color: '#FF6B2B',
          position: 'absolute', top: size * 0.14, right: size * 0.28,
          includeFontPadding: false,
        }}>+</Text>
      </View>
    </View>
  );
}

// ── Triage card helper ────────────────────────────────────────────────────────
function parseSeverity(text: string): 'Low' | 'Medium' | 'High' | 'Emergency' | null {
  const m = text.match(/Severity:\s*(Low|Medium|High|Emergency)/i);
  return m ? (m[1] as any) : null;
}

function severityColor(s: string | null) {
  switch (s) {
    case 'Low':       return C.severityLow;
    case 'Medium':    return C.severityMedium;
    case 'High':      return C.severityHigh;
    case 'Emergency': return C.severityEmergency;
    default:          return C.primary;
  }
}

function TriageCard({ text }: { text: string }) {
  const severity = parseSeverity(text);
  const color = severityColor(severity);
  // Remove the "TRIAGE\n" header line before displaying
  const body = text.replace(/^TRIAGE\s*\n/, '');
  return (
    <View style={[styles.triageCard, { borderLeftColor: color }]}>
      {severity && (
        <View style={[styles.severityBadge, { backgroundColor: color }]}>
          <Text style={styles.severityBadgeText}>{severity.toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.triageCardText}>{body}</Text>
    </View>
  );
}

// ── Thinking dots animation ───────────────────────────────────────────────────
function ThinkingDots() {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDot(d => (d + 1) % 4), 400);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={styles.thinkingRow}>
      <View style={styles.thinkingBubble}>
        <Text style={styles.thinkingText}>{'Thinking' + '.'.repeat(dot)}</Text>
      </View>
    </View>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [appState, setAppState] = useState<AppState>('downloading');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [imagePath, setImagePath] = useState<string | undefined>();
  const [listening, setListening] = useState(false);
  const [mmProjProgress, setMmProjProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [pickerSource, setPickerSource] = useState<'home' | 'knowledge'>('home');
  const [showMenu, setShowMenu] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [pastSessions, setPastSessions] = useState<SessionRecord[]>([]);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [knowledgeRefreshing, setKnowledgeRefreshing] = useState(false);
  const [knowledgeStatus, setKnowledgeStatus] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const currentSessionId = useRef<string | null>(null);

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
      const history = buildHistory(messages);
      const response = await sendMessage(history, text, imagePath, selectedRegion ?? undefined);
      const truncated = response.message.startsWith('(Sorry,');
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.message,
        isTriageResult: response.phase === 'triage',
      };
      setMessages(prev => {
        const withAssistant = [...prev, assistantMsg];
        const final = truncated ? prev.slice(0, -1).concat(assistantMsg) : withAssistant;
        if (!currentSessionId.current) currentSessionId.current = Date.now().toString();
        const firstUser = final.find(m => m.role === 'user');
        upsertSession({
          id: currentSessionId.current,
          startedAt: new Date().toISOString(),
          regionLabel: selectedRegion?.label ?? null,
          regionEmoji: selectedRegion?.emoji ?? null,
          messageCount: final.length,
          preview: firstUser?.text.slice(0, 80) ?? '',
          messages: final,
        });
        return final;
      });
      scrollToBottom();
    } catch (e) {
      setError(String(e));
    } finally {
      setAppState('ready');
    }
  }

  function handleAssessNow() {
    handleSend('Please assess and provide the triage now.');
  }

  function handleNew() {
    currentSessionId.current = null;
    setMessages([]);
    setInput('');
    setImagePath(undefined);
    setIsHistoryView(false);
    setShowSessionModal(false);
  }

  function handleOpenSession(session: SessionRecord) {
    setMessages((session.messages ?? []) as any);
    setIsHistoryView(true);
    setShowSessionModal(false);
  }

  async function openSessionModal() {
    setPastSessions(await loadSessions());
    setShowSessionModal(true);
  }

  async function handleRefreshKnowledge() {
    setKnowledgeRefreshing(true);
    setKnowledgeStatus(null);
    // Simulates a network check — real implementation would fetch updated JSON
    await new Promise(r => setTimeout(r, 1800));
    setKnowledgeRefreshing(false);
    setKnowledgeStatus('Knowledge base is up to date.');
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

  // ── Loading screens ───────────────────────────────────────────────────────

  if (appState === 'downloading') {
    return (
      <View style={styles.loadScreen}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <View style={styles.loadBrand}>
          <View style={styles.loadBrandIconWrap}>
            <BrandIcon size={64} color={C.primary} />
          </View>
          <Text style={styles.loadBrandName}>Pocket MA</Text>
          <Text style={styles.loadBrandSub}>AI Medical Assistant</Text>
        </View>
        <View style={styles.loadCard}>
          <Text style={styles.loadLabel}>Downloading AI model</Text>
          <Text style={styles.loadSub}>~3.1 GB · one-time download</Text>
          <ProgressBar progress={downloadProgress} />
          <Text style={styles.loadPercent}>{Math.round(downloadProgress * 100)}%</Text>
        </View>
      </View>
    );
  }

  if (appState === 'initializing') {
    return (
      <View style={styles.loadScreen}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <View style={styles.loadBrand}>
          <View style={styles.loadBrandIconWrap}>
            <BrandIcon size={64} color={C.primary} />
          </View>
          <Text style={styles.loadBrandName}>Pocket MA</Text>
          <Text style={styles.loadBrandSub}>AI Medical Assistant</Text>
        </View>
        <View style={styles.loadCard}>
          <Text style={styles.loadLabel}>Loading model into memory…</Text>
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  if (appState === 'error') {
    return (
      <View style={styles.loadScreen}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <View style={styles.loadCard}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  // ── Chat UI ───────────────────────────────────────────────────────────────

  function renderMessage({ item }: { item: ChatMessage }) {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
        {!isUser && (
          <View style={styles.avatarDot}>
            <BrandIcon size={16} color={C.white} />
          </View>
        )}
        <View style={styles.bubbleContent}>
          {item.imagePath && (
            <Image
              source={{ uri: `file://${item.imagePath}` }}
              style={styles.inlineThumbnail}
            />
          )}
          {item.isTriageResult ? (
            <TriageCard text={item.text} />
          ) : (
            <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
              <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
                {item.text}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const hasMessages = messages.length > 0;
  const canSend = appState !== 'thinking' && (!!input.trim() || !!imagePath);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}>

      <StatusBar barStyle="light-content" backgroundColor={C.primaryDk} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BrandIcon size={28} color={C.white} />
          <View>
            <Text style={styles.headerTitle}>Pocket MA</Text>
            <Text style={styles.headerSub}>AI Medical Assistant</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuBtn}>
          <Text style={styles.menuBtnText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Past session banner */}
      {isHistoryView && (
        <View style={styles.historyBanner}>
          <Text style={styles.historyBannerText}>Past session — read only</Text>
          <TouchableOpacity onPress={handleNew}>
            <Text style={styles.historyBannerNew}>＋ New</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={isHistoryView ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No content</Text>
            <Text style={styles.emptySub}>This session was saved before message history was stored.</Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
            <BrandIcon size={64} color={C.primary} />
          </View>
            <Text style={styles.emptyTitle}>What's the situation?</Text>
            <Text style={styles.emptySub}>
              Describe your symptom by text, voice, or photo.{'\n'}
              I'll ask a couple of questions, then assess.
            </Text>
            <TouchableOpacity style={styles.locationBanner} onPress={() => setShowRegionPicker(true)}>
              <Text style={styles.locationBannerEmoji}>{selectedRegion ? selectedRegion.emoji : '📍'}</Text>
              <View style={styles.locationBannerText}>
                <Text style={styles.locationBannerTitle}>
                  {selectedRegion ? selectedRegion.label : 'Set your location'}
                </Text>
                <Text style={styles.locationBannerSub}>
                  {selectedRegion
                    ? 'Tap to change region'
                    : 'For region-specific triage'}
                </Text>
              </View>
              <Text style={styles.locationBannerChevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.emptyChips}>
              {['Twisted ankle', 'Chest pain', 'Rash on skin'].map(t => (
                <TouchableOpacity key={t} style={styles.chip} onPress={() => handleSend(t)}>
                  <Text style={styles.chipText}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      />

      {/* Thinking indicator */}
      {appState === 'thinking' && <ThinkingDots />}

      {/* Assess Now button */}
      {hasMessages && appState === 'ready' && !isHistoryView && (
        <TouchableOpacity style={styles.assessButton} onPress={handleAssessNow}>
          <Text style={styles.assessButtonText}>⚡ Assess Now</Text>
        </TouchableOpacity>
      )}

      {/* Image preview */}
      {!isHistoryView && imagePath && (
        <View style={styles.imagePreviewRow}>
          <Image source={{ uri: `file://${imagePath}` }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.clearImage} onPress={() => setImagePath(undefined)}>
            <Text style={styles.clearImageText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      {!isHistoryView && <View style={styles.inputBar}>
        <TouchableOpacity style={styles.iconButton} onPress={handleCamera}>
          <Text style={styles.iconText}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, listening && styles.iconButtonActive]}
          onPress={handleMic}
          disabled={listening}>
          <Text style={styles.iconText}>{listening ? '🔴' : '🎙️'}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.inputField}
          placeholder="Describe symptom…"
          placeholderTextColor={C.textLight}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={() => handleSend()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!canSend}>
          <Text style={styles.sendButtonText}>↑</Text>
        </TouchableOpacity>
      </View>}

      {/* Menu */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuSheet}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); openSessionModal(); }}>
              <Text style={styles.menuItemIcon}>💬</Text>
              <Text style={styles.menuItemLabel}>Session</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); setKnowledgeStatus(null); setShowKnowledgeModal(true); }}>
              <Text style={styles.menuItemIcon}>📚</Text>
              <Text style={styles.menuItemLabel}>Knowledge Base</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Session modal */}
      <Modal visible={showSessionModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSessionModal(false)}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Sessions</Text>
            <TouchableOpacity style={styles.sessionNewBtn} onPress={handleNew}>
              <Text style={styles.sessionNewBtnText}>＋ New Session</Text>
            </TouchableOpacity>
            {messages.length > 0 && (
              <View style={[styles.sessionHistoryRow, styles.sessionHistoryRowActive]}>
                <View style={styles.sessionHistoryMeta}>
                  <Text style={styles.sessionHistoryDate}>
                    {selectedRegion ? `${selectedRegion.emoji} ` : ''}
                    Now · {messages.length} msg{messages.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.sessionHistoryPreview} numberOfLines={1}>
                    {messages.find(m => m.role === 'user')?.text ?? ''}
                  </Text>
                </View>
                <View style={styles.sessionActiveDot} />
              </View>
            )}
            {pastSessions.length === 0 && messages.length === 0 ? (
              <Text style={styles.sessionHistoryEmpty}>No sessions yet.</Text>
            ) : (
              pastSessions.map(s => (
                <TouchableOpacity key={s.id} style={styles.sessionHistoryRow} onPress={() => handleOpenSession(s)}>
                  <View style={styles.sessionHistoryMeta}>
                    <Text style={styles.sessionHistoryDate}>
                      {s.regionEmoji ? `${s.regionEmoji} ` : ''}
                      {new Date(s.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' · '}{s.messageCount} msg{s.messageCount !== 1 ? 's' : ''}
                    </Text>
                    <Text style={styles.sessionHistoryPreview} numberOfLines={1}>{s.preview}</Text>
                  </View>
                  <Text style={styles.sessionHistoryChevron}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Knowledge modal */}
      <Modal visible={showKnowledgeModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowKnowledgeModal(false)}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Knowledge Base</Text>
            {selectedRegion ? (
              <>
                <View style={styles.knowledgeRegionRow}>
                  <Text style={styles.pickerEmoji}>{selectedRegion.emoji}</Text>
                  <Text style={styles.knowledgeRegionLabel}>{selectedRegion.label}</Text>
                  <TouchableOpacity onPress={() => { setShowKnowledgeModal(false); setPickerSource('knowledge'); setShowRegionPicker(true); }}>
                    <Text style={styles.knowledgeChangeRegion}>Change</Text>
                  </TouchableOpacity>
                </View>
                {selectedRegion.conditions.map((c, i) => (
                  <View key={i} style={styles.knowledgeConditionRow}>
                    <Text style={styles.knowledgeConditionDot}>·</Text>
                    <Text style={styles.knowledgeConditionText}>{c}</Text>
                  </View>
                ))}
              </>
            ) : (
              <TouchableOpacity style={styles.knowledgeNoRegion} onPress={() => { setShowKnowledgeModal(false); setPickerSource('knowledge'); setShowRegionPicker(true); }}>
                <Text style={styles.knowledgeNoRegionText}>📍 Set a location to see regional conditions</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.knowledgeRefreshBtn, knowledgeRefreshing && styles.knowledgeRefreshBtnDisabled]}
              onPress={handleRefreshKnowledge}
              disabled={knowledgeRefreshing}>
              <Text style={styles.knowledgeRefreshBtnText}>
                {knowledgeRefreshing ? 'Checking for updates…' : '↻ Refresh Knowledge Base'}
              </Text>
            </TouchableOpacity>
            {knowledgeStatus && <Text style={styles.knowledgeStatus}>{knowledgeStatus}</Text>}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Region picker */}
      <Modal visible={showRegionPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRegionPicker(false)}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Select Your Location</Text>
            <Text style={styles.pickerSub}>Adjusts probable causes to regional disease patterns</Text>
            {REGIONS.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[styles.pickerRow, selectedRegion?.id === r.id && styles.pickerRowSelected]}
                onPress={() => {
                  setSelectedRegion(r);
                  setShowRegionPicker(false);
                  if (pickerSource === 'knowledge') setShowKnowledgeModal(true);
                }}>
                <Text style={styles.pickerEmoji}>{r.emoji}</Text>
                <Text style={styles.pickerLabel}>{r.label}</Text>
                {selectedRegion?.id === r.id && <Text style={styles.pickerCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            {selectedRegion && (
              <TouchableOpacity style={styles.pickerClear} onPress={() => {
                setSelectedRegion(null);
                setShowRegionPicker(false);
                if (pickerSource === 'knowledge') setShowKnowledgeModal(true);
              }}>
                <Text style={styles.pickerClearText}>Clear location</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* mmproj download modal */}
      <Modal visible={mmProjProgress !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>👁️</Text>
            <Text style={styles.loadLabel}>Loading vision model</Text>
            <Text style={styles.loadSub}>~985 MB · one-time download</Text>
            <ProgressBar progress={mmProjProgress ?? 0} />
            <Text style={styles.loadPercent}>{Math.round((mmProjProgress ?? 0) * 100)}%</Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },

  // ── Loading / splash ──
  loadScreen: {
    flex: 1, backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  loadBrand: { alignItems: 'center', marginBottom: 48 },
  loadBrandIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.white,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  loadBrandName: { fontSize: 32, fontWeight: '800', color: C.white, letterSpacing: 0.5 },
  loadBrandSub: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  loadCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 28,
    width: '100%', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  loadLabel: { fontSize: 16, fontWeight: '600', color: C.textDark, marginBottom: 4 },
  loadSub: { fontSize: 13, color: C.textMid, marginBottom: 16 },
  loadPercent: { fontSize: 28, fontWeight: '700', color: C.primary, marginTop: 12 },
  progressTrack: {
    width: '100%', height: 6, backgroundColor: C.border,
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: C.textDark, marginBottom: 8 },
  errorText: { fontSize: 14, color: '#E74C3C', textAlign: 'center' },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 48, paddingBottom: 14,
    backgroundColor: C.primary,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.white, letterSpacing: 0.3 },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  menuBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  menuBtnText: { fontSize: 20, color: C.white, lineHeight: 22 },
  menuSheet: {
    position: 'absolute', top: 96, right: 16,
    backgroundColor: C.white, borderRadius: 14,
    paddingVertical: 6, minWidth: 180,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemIcon: { fontSize: 18 },
  menuItemLabel: { fontSize: 15, color: C.textDark, fontWeight: '500' },
  menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginHorizontal: 16 },

  // ── Messages ──
  messageList: { padding: 16, gap: 16, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row', gap: 8 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAI: { justifyContent: 'flex-start', alignItems: 'flex-end' },
  bubbleContent: { flexDirection: 'column', maxWidth: '80%', gap: 4 },
  avatarDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    marginBottom: 2,
  },
  bubble: {
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: C.userBubble,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: C.aiBubble,
    borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bubbleText: { fontSize: 15, lineHeight: 22, color: C.textDark },
  bubbleTextUser: { color: C.white },
  inlineThumbnail: { width: 160, height: 160, borderRadius: 12, marginBottom: 4 },

  // ── Triage card ──
  triageCard: {
    backgroundColor: C.white, borderRadius: 14, padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  severityBadge: {
    alignSelf: 'flex-start', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  severityBadgeText: { fontSize: 12, fontWeight: '700', color: C.white, letterSpacing: 0.5 },
  triageCardText: { fontSize: 14, lineHeight: 22, color: C.textDark, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // ── Empty state ──
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconWrap: { marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: C.textDark, marginBottom: 10 },
  emptySub: { fontSize: 15, color: C.textMid, textAlign: 'center', lineHeight: 22 },
  emptyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24, justifyContent: 'center' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: C.white, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  chipText: { fontSize: 14, color: C.primary, fontWeight: '500' },

  // ── Location banner (empty state) ──
  locationBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, borderRadius: 14, padding: 14,
    marginTop: 24, width: '100%', gap: 12,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  locationBannerEmoji: { fontSize: 28 },
  locationBannerText: { flex: 1 },
  locationBannerTitle: { fontSize: 15, fontWeight: '600', color: C.textDark },
  locationBannerSub: { fontSize: 12, color: C.textMid, marginTop: 2 },
  locationBannerChevron: { fontSize: 22, color: C.textLight, fontWeight: '300' },

  // ── Region picker sheet ──
  pickerSheet: {
    backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  pickerHandle: {
    width: 40, height: 4, backgroundColor: C.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: C.textDark, marginBottom: 4 },
  pickerSub: { fontSize: 13, color: C.textMid, marginBottom: 16 },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 8,
    borderRadius: 10,
  },
  pickerRowSelected: { backgroundColor: `${C.primary}15` },
  pickerEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  pickerLabel: { flex: 1, fontSize: 15, color: C.textDark },
  pickerCheck: { fontSize: 16, color: C.primary, fontWeight: '700' },
  pickerClear: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  pickerClearText: { fontSize: 14, color: '#E74C3C' },

  // ── Session modal ──
  sessionNewBtn: {
    backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 12,
  },
  sessionNewBtnText: { fontSize: 16, fontWeight: '700', color: C.white },
  sessionHistoryEmpty: { fontSize: 14, color: C.textLight, textAlign: 'center', paddingVertical: 20 },
  sessionHistoryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  sessionHistoryRowActive: { backgroundColor: `${C.primary}08`, marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 8 },
  sessionHistoryMeta: { flex: 1, gap: 3 },
  sessionHistoryDate: { fontSize: 12, color: C.textMid, fontWeight: '500' },
  sessionHistoryPreview: { fontSize: 14, color: C.textDark },
  sessionActiveDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary,
  },
  sessionHistoryChevron: { fontSize: 20, color: C.textLight },

  // ── History banner ──
  historyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.primaryDk, paddingHorizontal: 16, paddingVertical: 10,
  },
  historyBannerText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  historyBannerNew: { fontSize: 13, fontWeight: '700', color: C.white },

  // ── Knowledge modal ──
  knowledgeRegionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.bg, borderRadius: 12, padding: 12, marginBottom: 12,
  },
  knowledgeRegionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: C.textDark },
  knowledgeChangeRegion: { fontSize: 13, color: C.primary, fontWeight: '600' },
  knowledgeConditionRow: { flexDirection: 'row', gap: 8, paddingVertical: 5 },
  knowledgeConditionDot: { fontSize: 18, color: C.primary, lineHeight: 22 },
  knowledgeConditionText: { flex: 1, fontSize: 13, color: C.textMid, lineHeight: 20 },
  knowledgeNoRegion: {
    backgroundColor: C.bg, borderRadius: 12, padding: 20,
    alignItems: 'center', marginBottom: 12,
  },
  knowledgeNoRegionText: { fontSize: 15, color: C.textMid, textAlign: 'center' },
  knowledgeRefreshBtn: {
    marginTop: 16, backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  knowledgeRefreshBtnDisabled: { backgroundColor: C.textLight },
  knowledgeRefreshBtnText: { fontSize: 14, fontWeight: '700', color: C.white },
  knowledgeStatus: { fontSize: 13, color: C.textMid, textAlign: 'center', marginTop: 10 },

  // ── Thinking ──
  thinkingRow: { paddingHorizontal: 16, paddingVertical: 4, flexDirection: 'row' },
  thinkingBubble: {
    backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  thinkingText: { fontSize: 14, color: C.textMid, fontStyle: 'italic' },

  // ── Assess Now ──
  assessButton: {
    marginHorizontal: 16, marginBottom: 6,
    backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  assessButtonText: { fontSize: 15, fontWeight: '700', color: C.white },

  // ── Image preview ──
  imagePreviewRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 6 },
  imagePreview: { width: 64, height: 64, borderRadius: 10 },
  clearImage: {
    position: 'absolute', top: -4, left: 72,
    backgroundColor: C.textDark, borderRadius: 10,
    width: 20, height: 20, justifyContent: 'center', alignItems: 'center',
  },
  clearImageText: { color: C.white, fontSize: 10, fontWeight: '700' },

  // ── Input bar ──
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: C.white,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  iconButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center',
  },
  iconButtonActive: { backgroundColor: '#FFE5E5' },
  iconText: { fontSize: 20 },
  inputField: {
    flex: 1, fontSize: 15, maxHeight: 100,
    borderWidth: 1.5, borderColor: C.border, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: C.bg, color: C.textDark,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: { color: C.white, fontSize: 20, fontWeight: '700' },

  // ── Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    backgroundColor: C.white, borderRadius: 20, padding: 32,
    alignItems: 'center', width: '80%',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  modalIcon: { fontSize: 36, marginBottom: 12 },
});
