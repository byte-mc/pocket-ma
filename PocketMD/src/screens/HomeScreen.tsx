import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { initModel } from '../services/model';
import { triage } from '../services/triage';

type AppState = 'downloading' | 'initializing' | 'ready' | 'loading' | 'error';

export default function HomeScreen() {
  const [state, setState] = useState<AppState>('downloading');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [symptom, setSymptom] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    initModel(p => {
      if (p >= 1) {
        setState('initializing');
      } else {
        setDownloadProgress(p);
      }
    })
      .then(() => setState('ready'))
      .catch(e => {
        setError(String(e));
        setState('error');
      });
  }, []);

  async function handleTriage() {
    if (!symptom.trim()) return;
    setState('loading');
    setResult('');
    try {
      const response = await triage(symptom.trim());
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
      <TextInput
        style={styles.input}
        placeholder="Describe your symptom…"
        multiline
        value={symptom}
        onChangeText={setSymptom}
      />
      <Button
        title={state === 'loading' ? 'Analyzing…' : 'Triage'}
        onPress={handleTriage}
        disabled={state === 'loading'}
      />
      {result ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  progress: {
    fontSize: 32,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  resultBox: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  resultText: {
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 22,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
  },
});
