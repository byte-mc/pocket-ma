import { translations, type TranslationKey } from './translations';

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

// Voice recognition locale
export const voiceLocale = lang === 'zh' ? 'zh-CN' : 'en-US';
