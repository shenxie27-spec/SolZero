import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './locales/zh';
import en from './locales/en';
import ja from './locales/ja';
import ko from './locales/ko';

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
    ja: { translation: ja },
    ko: { translation: ko }
  },
  lng: 'zh',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;