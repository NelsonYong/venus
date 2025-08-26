import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import zhCN from '../../locales/zh-CN/common.json';
import enUS from '../../locales/en-US/common.json';
import jaJP from '../../locales/ja-JP/common.json';

const resources = {
  'zh-CN': {
    common: zhCN,
  },
  'en-US': {
    common: enUS,
  },
  'ja-JP': {
    common: jaJP,
  },
};

// Only initialize if not already initialized
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: 'zh-CN', // default language
      fallbackLng: 'zh-CN',
      defaultNS: 'common',
      
      // SSR configuration
      react: {
        useSuspense: false, // Disable suspense for SSR
      },

      interpolation: {
        escapeValue: false, // React already does escaping
      },

      // Enable debugging in development
      debug: process.env.NODE_ENV === 'development',
    });
}

export default i18n;