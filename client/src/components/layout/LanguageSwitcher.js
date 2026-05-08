import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
const LanguageSwitcher = () => {
  const { currentLanguage, changeLanguage } = useLanguage();
  const languages = [
    { code: 'fr', label: '🇫🇷 FR' },
    { code: 'sw', label: '🇨🇩 SW' },
    { code: 'ln', label: '🇨🇩 LN' }
  ];
  return (
    <select value={currentLanguage} onChange={(e) => changeLanguage(e.target.value)} style={{padding:'0.25rem 0.5rem',borderRadius:'4px',border:'1px solid rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.1)',color:'white',cursor:'pointer'}}>
      {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.label}</option>)}
    </select>
  );
};
export default LanguageSwitcher;
