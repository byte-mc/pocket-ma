import RNFS from 'react-native-fs';

const SESSIONS_FILE = `${RNFS.DocumentDirectoryPath}/sessions.json`;

export type SessionRecord = {
  id: string;
  startedAt: string;
  regionLabel: string | null;
  regionEmoji: string | null;
  messageCount: number;
  preview: string;
};

export async function loadSessions(): Promise<SessionRecord[]> {
  try {
    if (!(await RNFS.exists(SESSIONS_FILE))) return [];
    return JSON.parse(await RNFS.readFile(SESSIONS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export async function saveSession(record: SessionRecord): Promise<void> {
  const existing = await loadSessions();
  existing.unshift(record);
  await RNFS.writeFile(SESSIONS_FILE, JSON.stringify(existing.slice(0, 100)), 'utf8');
}
