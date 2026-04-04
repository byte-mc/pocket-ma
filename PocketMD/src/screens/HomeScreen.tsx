import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { initModel, initMultimodal } from '../services/model';
import { triage } from '../services/triage';
import { listen, requestMicPermission } from '../services/speech';

type AppState = 'downloading' | 'initializing' | 'ready' | 'loading' | 'error';

export default function HomeScreen() {
  const [state, setState] = useState<AppState>('downloading');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [symptom, setSymptom] = useState('');
  const [imagePath, setImagePath] = useState<string | undefined>();
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [mmProjProgress, setMmProjProgress] = useState<number | null>(null);

  useEffect(() => {
    initModel(p => {
      if (p >= 1) setState('initializing');
      else setDownloadProgress(p);
    })
      .then(() => setState('ready'))
      .catch(e => { setError(String(e)); setState('error'); });
  }, []);

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
      if (transcript) setSymptom(transcript);
    } catch (e) {
      Alert.alert('Voice error', String(e));
    } finally {
      setListening(false);
    }
  }

  async function handleTriage() {
    if (!symptom.trim() && !imagePath) return;
    setState('loading');
    setResult('');
    try {
      const response = await triage(symptom.trim(), imagePath);
      setResult(response);
    } catch (e) {
      setError(String(e));
    } finally {
      setState('ready');
    }
  }

  if (state === 'downloading') {
    return (
      <View style={styles.center}>
        <Text style={styles.label}>Downloading model…</Text>
        <Text style={styles.progress}>{Math.round(downloadProgress * 100)}%</Text>
        <Text style={styles.subLabel}>~3.1 GB · one-time download</Text>
        <ActivityIndicator size="large" style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (state === 'initializing') {
    return (
      <View style={styles.center}>
        <Text style={styles.label}>Loading model…</Text>
        <ActivityIndicator size="large" style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Pocket MD</Text>

      {/* Image preview */}
      {imagePath && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: `file://${imagePath}` }} style={styles.thumbnail} />
          <TouchableOpacity style={styles.clearImage} onPress={() => setImagePath(undefined)}>
            <Text style={styles.clearImageText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input row */}
      <TextInput
        style={styles.input}
        placeholder={imagePath ? 'Add notes (optional)…' : 'Describe your symptom…'}
        multiline
        value={symptom}
        onChangeText={setSymptom}
      />
      <View style={styles.inputActions}>
        <TouchableOpacity style={styles.iconButton} onPress={handleCamera}>
          <Text style={styles.iconText}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={handleMic} disabled={listening}>
          <Text style={styles.iconText}>{listening ? '⏳' : '🎙️'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Button
            title={state === 'loading' ? 'Analyzing…' : 'Triage'}
            onPress={handleTriage}
            disabled={state === 'loading' || (!symptom.trim() && !imagePath)}
          />
        </View>
      </View>

      {state === 'loading' && (
        <ActivityIndicator size="small" style={{ marginTop: 8 }} />
      )}

      {result ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}

      {/* mmproj download modal */}
      <Modal visible={mmProjProgress !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.label}>Loading vision model…</Text>
            <Text style={styles.progress}>{Math.round((mmProjProgress ?? 0) * 100)}%</Text>
            <Text style={styles.subLabel}>~985 MB · one-time download</Text>
            <ActivityIndicator size="large" style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 16, marginBottom: 8 },
  subLabel: { fontSize: 13, color: '#888', marginTop: 4 },
  progress: { fontSize: 32, fontWeight: '700' },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    padding: 12, fontSize: 16, minHeight: 80, textAlignVertical: 'top',
  },
  inputActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center',
  },
  iconText: { fontSize: 22 },
  imageContainer: { position: 'relative', alignSelf: 'flex-start' },
  thumbnail: { width: 120, height: 120, borderRadius: 8 },
  clearImage: {
    position: 'absolute', top: -8, right: -8,
    backgroundColor: '#333', borderRadius: 12,
    width: 24, height: 24, justifyContent: 'center', alignItems: 'center',
  },
  clearImageText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  resultBox: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 16, marginTop: 8 },
  resultText: { fontFamily: 'monospace', fontSize: 14, lineHeight: 22 },
  errorText: { color: 'red', fontSize: 14 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 32, alignItems: 'center', width: '80%',
  },
});
