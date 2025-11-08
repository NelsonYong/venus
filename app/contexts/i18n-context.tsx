"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useTranslation as useI18nextTranslation } from "react-i18next";
import {
  getInitialLanguage,
  setStoredLanguage,
  type SupportedLanguage,
} from "@/lib/language-utils";
import { useAuth } from "@/app/hooks/use-auth";

interface I18nContextType {
  locale: string;
  changeLanguage: (lng: string) => Promise<void>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [i18nReady, setI18nReady] = useState(false);
  const [currentLocale, setCurrentLocale] =
    useState<SupportedLanguage>("en-US");

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import("@/lib/i18n").then(async (i18nModule) => {
      const i18n = i18nModule.default;

      // 确定初始语言：localStorage > 用户设置 > 系统语言 > 默认英文
      let initialLanguage: SupportedLanguage;

      if (user?.language) {
        // 如果用户已登录且有语言设置，使用用户设置
        initialLanguage = user.language as SupportedLanguage;
      } else {
        // 否则使用优先级逻辑：localStorage > 系统语言 > 默认英文
        initialLanguage = getInitialLanguage();
      }

      // 设置i18n语言
      await i18n.changeLanguage(initialLanguage);
      setCurrentLocale(initialLanguage);
      setI18nReady(true);

      // 如果语言来源不是用户设置，保存到localStorage
      if (!user?.language) {
        setStoredLanguage(initialLanguage);
      }
    });
  }, [user?.language]);

  const changeLanguage = async (lng: string) => {
    const i18nModule = await import("@/lib/i18n");
    const i18n = i18nModule.default;
    await i18n.changeLanguage(lng);
    setCurrentLocale(lng as SupportedLanguage);

    // 更新localStorage
    setStoredLanguage(lng as SupportedLanguage);
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
