'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import plTranslations from '@/lib/locales/pl.json';
import enTranslations from '@/lib/locales/en.json';
import { Locale } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';


type Language = 'pl' | 'en';
type Translations = typeof plTranslations;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, optionsOrFallback?: { [key: string]: string | number } | string) => string;
  getLocale: () => Locale;
}

const translations = { pl: plTranslations, en: enTranslations };
const locales: { [key in Language]: Locale } = { pl, en: enUS };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('pl');

  useEffect(() => {
    const storedLanguage = localStorage.getItem('language') as Language;
    if (storedLanguage && (storedLanguage === 'pl' || storedLanguage === 'en')) {
      setLanguageState(storedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('language', lang);
    setLanguageState(lang);
  };

  const getLocale = () => {
    return locales[language] || enUS;
  }

  const t = (key: string, optionsOrFallback?: { [key: string]: string | number } | string): string => {
    const keys = key.split('.');
    let result: any = translations[language];

    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to English if key not found in current language
        let fallbackResult: any = translations.en;
        for (const fk of keys) {
          fallbackResult = fallbackResult?.[fk];
        }
        if (fallbackResult === undefined) {
          return typeof optionsOrFallback === 'string' ? optionsOrFallback : key;
        }
        result = fallbackResult;
        break;
      }
    }

    if (typeof result === 'string' && optionsOrFallback && typeof optionsOrFallback !== 'string') {
      return Object.entries(optionsOrFallback).reduce((acc, [key, value]) => {
        return acc.replace(`{{${key}}}`, String(value));
      }, result);
    }

    return result || (typeof optionsOrFallback === 'string' ? optionsOrFallback : key);
  };


  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, getLocale }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
