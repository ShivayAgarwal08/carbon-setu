import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, translations, TranslationKey } from '../i18n/translations';
import { useAuth } from './AuthContext';
import { profileApi } from '../api/client';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'cs_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'hi') return saved;
    } catch {
      // safe fallback if storage unavailable
    }
    return (user?.preferredLang as Language) || 'en';
  });

  // Sync with user preference if user logs in
  useEffect(() => {
    if (user?.preferredLang && (user.preferredLang === 'en' || user.preferredLang === 'hi')) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
          setLanguageState(user.preferredLang);
          localStorage.setItem(STORAGE_KEY, user.preferredLang);
        }
      } catch {
        // ignore
      }
    }
  }, [user]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    if (user) {
      profileApi.update({ preferredLang: lang }).catch(() => {});
    }
  }, [user]);

  const toggleLanguage = useCallback(() => {
    setLanguageState(prev => {
      const next = prev === 'en' ? 'hi' : 'en';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      if (user) {
        profileApi.update({ preferredLang: next }).catch(() => {});
      }
      return next;
    });
  }, [user]);

  const t = useCallback((key: TranslationKey): string => {
    const dict = translations[language];
    return dict?.[key] || translations.en?.[key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
