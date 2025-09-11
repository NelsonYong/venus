"use client";

import { useTranslation } from "@/app/contexts/i18n-context";

export function EmptyChatState() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center flex-1 max-w-3xl mx-auto px-4 text-center">
      <div className="space-y-6 mb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {t("chat.welcome.title")}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {t("chat.welcome.subtitle")}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t("chat.capabilities.intelligent.title")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("chat.capabilities.intelligent.description")}
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t("chat.capabilities.multimodal.title")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("chat.capabilities.multimodal.description")}
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t("chat.capabilities.realtime.title")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("chat.capabilities.realtime.description")}
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t("chat.capabilities.context.title")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("chat.capabilities.context.description")}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
            {t("chat.examples.coding")}
          </span>
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm">
            {t("chat.examples.writing")}
          </span>
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm">
            {t("chat.examples.analysis")}
          </span>
          <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-sm">
            {t("chat.examples.creative")}
          </span>
        </div>
      </div>
    </div>
  );
}