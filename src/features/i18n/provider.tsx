import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import en from './locales/en.json';
import es from './locales/es.json';

type Locale = 'en' | 'es';
type Translations = typeof en;

const translations: Record<Locale, Translations> = { en, es };

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getNestedValue(obj: unknown, path: string): string {
  return path.split('.').reduce((acc: unknown, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj) as string ?? path;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('lyricsync-locale');
    if (saved === 'en' || saved === 'es') return saved as Locale;
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'es' ? 'es' : 'en';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('lyricsync-locale', newLocale);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let value = getNestedValue(translations[locale], key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(`{{${k}}}`, String(v));
      });
    }
    return value;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}

export function useTranslation() {
  return useI18n();
}
