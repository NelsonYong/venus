/**
 * Language detection and localStorage management utilities
 */

// 支持的语言列表
export const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US', 'ja-JP'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// localStorage key
const LANGUAGE_STORAGE_KEY = 'user-language-preference';

/**
 * 检测浏览器系统语言
 * @returns 系统语言代码，如果不支持则返回 null
 */
export function detectSystemLanguage(): SupportedLanguage | null {
  if (typeof window === 'undefined') {
    return null; // SSR 环境
  }

  // 获取浏览器语言列表
  const languages = navigator.languages || [navigator.language];

  for (const lang of languages) {
    // 完全匹配
    if (SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
      return lang as SupportedLanguage;
    }

    // 语言代码匹配（如 'zh' 匹配 'zh-CN'）
    const langCode = lang.split('-')[0];
    const matchedLang = SUPPORTED_LANGUAGES.find(supportedLang =>
      supportedLang.startsWith(langCode)
    );

    if (matchedLang) {
      return matchedLang;
    }
  }

  return null;
}

/**
 * 从 localStorage 获取用户语言偏好
 * @returns 用户保存的语言偏好，如果没有则返回 null
 */
export function getStoredLanguage(): SupportedLanguage | null {
  if (typeof window === 'undefined') {
    return null; // SSR 环境
  }

  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
      return stored as SupportedLanguage;
    }
  } catch (error) {
    console.warn('Failed to read language preference from localStorage:', error);
  }

  return null;
}

/**
 * 保存用户语言偏好到 localStorage
 * @param language 要保存的语言代码
 */
export function setStoredLanguage(language: SupportedLanguage): void {
  if (typeof window === 'undefined') {
    return; // SSR 环境
  }

  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to save language preference to localStorage:', error);
  }
}

/**
 * 清除 localStorage 中的语言偏好
 */
export function clearStoredLanguage(): void {
  if (typeof window === 'undefined') {
    return; // SSR 环境
  }

  try {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear language preference from localStorage:', error);
  }
}

/**
 * 获取初始语言设置
 * 优先级：localStorage > 系统语言 > 默认英文
 * @returns 初始语言设置
 */
export function getInitialLanguage(): SupportedLanguage {
  // 1. 优先从 localStorage 获取
  const storedLang = getStoredLanguage();
  if (storedLang) {
    return storedLang;
  }

  // 2. 检测系统语言
  const systemLang = detectSystemLanguage();
  if (systemLang) {
    return systemLang;
  }

  // 3. 默认英文
  return 'en-US';
}
