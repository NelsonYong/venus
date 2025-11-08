"use client";

import { useTranslation } from "@/app/contexts/i18n-context";

export function I18nTest() {
  const { t } = useTranslation();

  return (
    <div className="p-4 space-y-2 border border-gray-200 rounded-md">
      <h3 className="text-lg font-semibold">I18n Test</h3>
      <div>Brand: {t("navbar.brand")}</div>
      <div>Login: {t("navbar.login")}</div>
      <div>Rename: {t("navbar.rename")}</div>
      <div>Star: {t("navbar.star")}</div>
      <div>Starred: {t("sidebar.starred")}</div>
      <div>Chats: {t("sidebar.chats")}</div>
    </div>
  );
}
