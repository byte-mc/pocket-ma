import { translations, type TranslationKey } from './translations';
export type { TranslationKey };

// Detected once at app startup — no dynamic switching
const rawLocale = Intl.DateTimeFormat().resolvedOptions().locale; // e.g. 'zh-CN', 'en-US'
export const lang = rawLocale.startsWith('zh') ? 'zh' : 'en';

const dict = translations[lang] ?? translations.en;

export function t(key: TranslationKey): string {
  return dict[key] ?? translations.en[key] ?? key;
}

// Returns locale-appropriate message count string
export function msgCount(n: number, locale = lang): string {
  if (locale === 'zh') return `${n} 条消息`;
  return `${n} msg${n !== 1 ? 's' : ''}`;
}

// Voice recognition always uses en-US — zh-TW is installed on Pixel 7 but
// returns Pinyin romanization instead of characters, which is unusable as model input.
export const voiceLocale = 'en-US';
