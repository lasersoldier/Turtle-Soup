import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';
import { storageService } from '../services/storageService';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: any;
}

import { translations } from '../utils/translations';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  // Load initial language from storage
  useEffect(() => {
    const settings = storageService.getSettings();
    setLanguageState(settings.language || 'en');
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    const settings = storageService.getSettings();
    storageService.saveSettings({ ...settings, language: lang });
  };

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};