import RNFS from 'react-native-fs';

const SESSIONS_FILE = `${RNFS.DocumentDirectoryPath}/sessions.json`;

export type StoredMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imagePath?: string;
  isTriageResult?: boolean;
};

export type SessionRecord = {
  id: string;
  startedAt: string;
  regionLabel: string | null;
  regionEmoji: string | null;
  messageCount: number;
  preview: string;
  messages: StoredMessage[];
};

export async function loadSessions(): Promise<SessionRecord[]> {
  try {
    if (!(await RNFS.exists(SESSIONS_FILE))) return [];
    const records: SessionRecord[] = JSON.parse(await RNFS.readFile(SESSIONS_FILE, 'utf8'));
    return records.map(r => ({ ...r, messages: r.messages ?? [] }));
  } catch {
    return [];
  }
}

export async function upsertSession(record: SessionRecord): Promise<void> {
  const existing = await loadSessions();
  const idx = existing.findIndex(s => s.id === record.id);
  if (idx !== -1) {
    existing[idx] = record;
  } else {
    existing.unshift(record);
  }
  await RNFS.writeFile(SESSIONS_FILE, JSON.stringify(existing.slice(0, 100)), 'utf8');
}
