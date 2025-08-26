"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { useTranslation as useI18nextTranslation } from "react-i18next";

interface I18nContextType {
  locale: string;
  changeLanguage: (lng: string) => Promise<void>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [i18nReady, setI18nReady] = useState(false);
  const [currentLocale, setCurrentLocale] = useState("zh-CN");

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import("@/lib/i18n").then((i18nModule) => {
      const i18n = i18nModule.default;
      setCurrentLocale(i18n.language);
      setI18nReady(true);

      if (user?.language) {
        // Update i18n language when user language changes
        i18n.changeLanguage(user.language).then(() => {
          setCurrentLocale(user.language);
        });
      }
    });
  }, [user?.language]);

  const changeLanguage = async (lng: string) => {
    const i18nModule = await import("@/lib/i18n");
    const i18n = i18nModule.default;
    await i18n.changeLanguage(lng);
    setCurrentLocale(lng);
  };

  const value: I18nContextType = {
    locale: currentLocale,
    changeLanguage,
  };

  // Don't render children until i18n is ready
  if (!i18nReady) {
    return <div></div>;
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

// Export the translation hook from react-i18next for convenience
export { useI18nextTranslation as useTranslation };
