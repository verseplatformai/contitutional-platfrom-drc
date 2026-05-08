import React, { createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext({});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('maoni-language', lang);
  };

  return React.createElement(
    LanguageContext.Provider,
    { value: { currentLanguage: i18n.language, changeLanguage, t } },
    children
  );
};