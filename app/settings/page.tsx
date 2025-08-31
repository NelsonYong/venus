"use client";

import { useState } from "react";
import { useAuth } from "@/app/contexts/auth-context";
import { useI18n, useTranslation } from "@/app/contexts/i18n-context";
import { ProtectedRoute } from "@/app/components/auth/protected-route";
import { Navbar } from "@/app/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authAPI, settingsAPI } from "@/lib/http-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SettingsIcon,
  ShieldIcon,
  BellIcon,
  PaletteIcon,
  LanguagesIcon,
  KeyIcon,
  TrashIcon,
  SaveIcon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react";
import { useTheme } from "../contexts/theme-context";

function SettingsContent() {
  const { user, refreshAuth } = useAuth();
  const { theme, setTheme } = useTheme();
  const { changeLanguage } = useI18n();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [settings, setSettings] = useState({
    theme: user?.theme || theme,
    language: user?.language || "zh-CN",
    notifications: {
      email: true,
      browser: true,
      marketing: false,
    },
    privacy: {
      profileVisible: true,
      activityVisible: false,
    },
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  if (!user) return null;

  const handleSettingsSave = async () => {
    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await settingsAPI.updateSettings({
        theme: settings.theme as "system" | "light" | "dark",
        language: settings.language,
      });

      if (response.status === 200 && response.data?.success) {
        setMessage(response.data.message || "Settings saved successfully");
        // Refresh user data
        await refreshAuth();
        // 确保语言设置同步到i18n和localStorage
        await changeLanguage(settings.language);
        setTheme(settings.theme as "system" | "light" | "dark");
      } else {
        setError(
          response.message || response.error || "Failed to save settings"
        );
      }
    } catch (error) {
      console.error("Save settings error:", error);
      setError("Failed to save settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setMessage("");
    setError("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError(t("settings.security.passwordMismatch"));
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setError(t("settings.security.passwordTooShort"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (response.status === 200 && response.data?.success) {
        setMessage(response.data.message || "Password changed successfully");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setError(
          response.message || response.error || "Failed to change password"
        );
      }
    } catch (error) {
      console.error("Change password error:", error);
      setError("Failed to change password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountDelete = async () => {
    const confirmed = window.confirm(t("settings.dangerZone.confirmDelete"));
    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      t("settings.dangerZone.doubleConfirm")
    );
    if (!doubleConfirm) return;

    const password = window.prompt(t("settings.dangerZone.enterPassword"));
    if (!password) return;

    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await authAPI.deleteAccount(password);

      if (response.status === 200 && response.data?.success) {
        alert(response.data.message || "Account deleted successfully");
        // User will be redirected to login page automatically
        window.location.href = "/login";
      } else {
        setError(
          response.message || response.error || "Failed to delete account"
        );
      }
    } catch (error) {
      console.error("Delete account error:", error);
      setError(
        "Failed to delete account. Please check your password and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex-1 max-w-4xl mx-auto p-6 overflow-auto">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center">
              <SettingsIcon className="w-8 h-8 mr-3" />
              {t("settings.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("settings.subtitle")}
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {message && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-600 dark:text-green-400">
                {message}
              </p>
            </div>
          )}

          {/* Appearance Settings */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <PaletteIcon className="w-5 h-5 mr-2 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                {t("settings.appearance.title")}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("settings.appearance.theme")}
                </label>
                <Select
                  value={settings.theme}
                  onValueChange={(value) =>
                    setSettings({ ...settings, theme: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">
                      {t("settings.themes.system")}
                    </SelectItem>
                    <SelectItem value="light">
                      {t("settings.themes.light")}
                    </SelectItem>
                    <SelectItem value="dark">
                      {t("settings.themes.dark")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <LanguagesIcon className="w-4 h-4 mr-1" />
                  {t("settings.appearance.language")}
                </label>
                <Select
                  value={settings.language}
                  onValueChange={async (value) => {
                    setSettings({ ...settings, language: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-CN">
                      {t("settings.languages.zh-CN")}
                    </SelectItem>
                    <SelectItem value="en-US">
                      {t("settings.languages.en-US")}
                    </SelectItem>
                    <SelectItem value="ja-JP">
                      {t("settings.languages.ja-JP")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <Button onClick={handleSettingsSave} disabled={isLoading}>
                {isLoading
                  ? t("settings.appearance.saving")
                  : t("settings.appearance.saveSettings")}
              </Button>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <BellIcon className="w-5 h-5 mr-2 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                {t("settings.notifications.title")}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">
                    {t("settings.notifications.email")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("settings.notifications.emailDescription")}
                  </div>
                </div>
                <Button
                  variant={settings.notifications.email ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        email: !settings.notifications.email,
                      },
                    })
                  }
                >
                  {settings.notifications.email
                    ? t("settings.notifications.enabled")
                    : t("settings.notifications.disabled")}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">
                    {t("settings.notifications.browser")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("settings.notifications.browserDescription")}
                  </div>
                </div>
                <Button
                  variant={
                    settings.notifications.browser ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        browser: !settings.notifications.browser,
                      },
                    })
                  }
                >
                  {settings.notifications.browser
                    ? t("settings.notifications.enabled")
                    : t("settings.notifications.disabled")}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">
                    {t("settings.notifications.marketing")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("settings.notifications.marketingDescription")}
                  </div>
                </div>
                <Button
                  variant={
                    settings.notifications.marketing ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        marketing: !settings.notifications.marketing,
                      },
                    })
                  }
                >
                  {settings.notifications.marketing
                    ? t("settings.notifications.enabled")
                    : t("settings.notifications.disabled")}
                </Button>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <ShieldIcon className="w-5 h-5 mr-2 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                {t("settings.privacy.title")}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">
                    {t("settings.privacy.profileVisibility")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("settings.privacy.profileVisibilityDescription")}
                  </div>
                </div>
                <Button
                  variant={
                    settings.privacy.profileVisible ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      privacy: {
                        ...settings.privacy,
                        profileVisible: !settings.privacy.profileVisible,
                      },
                    })
                  }
                >
                  {settings.privacy.profileVisible
                    ? t("settings.privacy.public")
                    : t("settings.privacy.private")}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">
                    {t("settings.privacy.activityStatus")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("settings.privacy.activityStatusDescription")}
                  </div>
                </div>
                <Button
                  variant={
                    settings.privacy.activityVisible ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      privacy: {
                        ...settings.privacy,
                        activityVisible: !settings.privacy.activityVisible,
                      },
                    })
                  }
                >
                  {settings.privacy.activityVisible
                    ? t("settings.privacy.show")
                    : t("settings.privacy.hide")}
                </Button>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <KeyIcon className="w-5 h-5 mr-2 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                {t("settings.security.title")}
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-4">
                  {t("settings.security.changePassword")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-foreground">
                      {t("settings.security.currentPassword")}
                    </label>
                    <div className="relative mt-1">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            currentPassword: e.target.value,
                          })
                        }
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showCurrentPassword ? (
                          <EyeOffIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">
                      {t("settings.security.newPassword")}
                    </label>
                    <div className="relative mt-1">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          })
                        }
                        className="pr-10"
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? (
                          <EyeOffIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">
                      {t("settings.security.confirmNewPassword")}
                    </label>
                    <div className="relative mt-1">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="pr-10"
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? (
                          <EyeOffIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handlePasswordChange}
                  disabled={
                    isLoading ||
                    !passwordData.currentPassword ||
                    !passwordData.newPassword ||
                    !passwordData.confirmPassword
                  }
                  className="mt-4 flex items-center space-x-2"
                >
                  <SaveIcon className="w-4 h-4" />
                  <span>{t("settings.security.updatePassword")}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-card border border-destructive/20 rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <TrashIcon className="w-5 h-5 mr-2 text-destructive" />
              <h2 className="text-xl font-semibold text-destructive">
                {t("settings.dangerZone.title")}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-2">
                  {t("settings.dangerZone.deleteAccount")}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("settings.dangerZone.deleteAccountDescription")}
                </p>
                <Button
                  variant="destructive"
                  onClick={handleAccountDelete}
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>{t("settings.dangerZone.deleteAccountButton")}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
