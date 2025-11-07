"use client";

import { useState } from "react";
import { useAuth } from "@/app/contexts/auth-context";
import { useI18n, useTranslation } from "@/app/contexts/i18n-context";
import { ProtectedRoute } from "@/app/components/auth/protected-route";
import { Navbar } from "@/app/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authAPI, settingsAPI } from "@/lib/http-client";
import { conversationsAPI } from "@/lib/api/conversations";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldIcon,
  BellIcon,
  PaletteIcon,
  KeyIcon,
  TrashIcon,
  EyeIcon,
  EyeOffIcon,
  CodeIcon,
} from "lucide-react";
import { useTheme } from "../contexts/theme-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SettingsLayout,
  SettingsSidebar,
  SettingsContent,
  SettingsSection,
} from "./layout-components";
import { McpConfig } from "./components/mcp-config";

type SettingTab =
  | "appearance"
  | "notifications"
  | "privacy"
  | "security"
  | "developer"
  | "dangerZone";

function SettingsContentPage() {
  const { user, refreshAuth } = useAuth();
  const { theme, setTheme } = useTheme();
  const { changeLanguage } = useI18n();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingTab>("appearance");

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

  const sidebarItems = [
    {
      id: "appearance",
      label: t("settings.appearance.title"),
      icon: <PaletteIcon className="w-4 h-4" />,
    },
    {
      id: "notifications",
      label: t("settings.notifications.title"),
      icon: <BellIcon className="w-4 h-4" />,
    },
    {
      id: "privacy",
      label: t("settings.privacy.title"),
      icon: <ShieldIcon className="w-4 h-4" />,
    },
    {
      id: "security",
      label: t("settings.security.title"),
      icon: <KeyIcon className="w-4 h-4" />,
    },
    {
      id: "developer",
      label: t("settings.developer.title"),
      icon: <CodeIcon className="w-4 h-4" />,
    },
    {
      id: "dangerZone",
      label: t("settings.dangerZone.title"),
      icon: <TrashIcon className="w-4 h-4" />,
    },
  ];

  const handleThemeChange = async (newTheme: string) => {
    setSettings({ ...settings, theme: newTheme });
    setMessage("");
    setError("");

    try {
      const response = await settingsAPI.updateSettings({
        theme: newTheme as "system" | "light" | "dark",
        language: settings.language,
      });

      if (response.status === 200 && response.data?.success) {
        setMessage(response.data.message || t("settings.themes.updateSuccess"));
        await refreshAuth();
        setTheme(newTheme as "system" | "light" | "dark");
        // Auto-hide message after 2 seconds
        setTimeout(() => setMessage(""), 2000);
      } else {
        setError(
          response.message ||
            response.error ||
            t("settings.themes.updateFailed")
        );
      }
    } catch (error) {
      console.error("Update theme error:", error);
      setError(t("settings.themes.updateFailedRetry"));
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setSettings({ ...settings, language: newLanguage });
    setMessage("");
    setError("");

    try {
      const response = await settingsAPI.updateSettings({
        theme: settings.theme as "system" | "light" | "dark",
        language: newLanguage,
      });

      if (response.status === 200 && response.data?.success) {
        setMessage(
          response.data.message || t("settings.languages.updateSuccess")
        );
        await refreshAuth();
        await changeLanguage(newLanguage);
        // Auto-hide message after 2 seconds
        setTimeout(() => setMessage(""), 2000);
      } else {
        setError(
          response.message ||
            response.error ||
            t("settings.languages.updateFailed")
        );
      }
    } catch (error) {
      console.error("Update language error:", error);
      setError(t("settings.languages.updateFailedRetry"));
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
        setMessage(
          response.data.message || t("settings.security.updateSuccess")
        );
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setError(
          response.message ||
            response.error ||
            t("settings.security.updateFailed")
        );
      }
    } catch (error) {
      console.error("Change password error:", error);
      setError(t("settings.security.updateFailedRetry"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await conversationsAPI.deleteAll();

      if (response.success) {
        setMessage(
          response.message || t("settings.dangerZone.clearHistorySuccess")
        );
        setShowClearHistoryDialog(false);
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.list(),
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } else {
        setError(t("settings.dangerZone.clearHistoryFailed"));
      }
    } catch (error) {
      console.error("Clear history error:", error);
      setError(t("settings.dangerZone.clearHistoryFailed"));
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
        alert(
          response.data.message || t("settings.dangerZone.deleteAccountSuccess")
        );
        window.location.href = "/login";
      } else {
        setError(
          response.message ||
            response.error ||
            t("settings.dangerZone.deleteAccountFailed")
        );
      }
    } catch (error) {
      console.error("Delete account error:", error);
      setError(t("settings.dangerZone.deleteAccountFailedRetry"));
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "appearance":
        return (
          <SettingsContent
            title={t("settings.appearance.title")}
            description={t("settings.subtitle")}
          >
            <SettingsSection>
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

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    {t("settings.appearance.theme")}
                  </label>
                  <Select
                    value={settings.theme}
                    onValueChange={handleThemeChange}
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

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    {t("settings.appearance.language")}
                  </label>
                  <Select
                    value={settings.language}
                    onValueChange={handleLanguageChange}
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
            </SettingsSection>
          </SettingsContent>
        );

      case "notifications":
        return (
          <SettingsContent
            title={t("settings.notifications.title")}
            description={t("settings.notifications.description")}
          >
            <SettingsSection>
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
                    variant={
                      settings.notifications.email ? "default" : "outline"
                    }
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
            </SettingsSection>
          </SettingsContent>
        );

      case "privacy":
        return (
          <SettingsContent
            title={t("settings.privacy.title")}
            description={t("settings.privacy.description")}
          >
            <SettingsSection>
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
            </SettingsSection>
          </SettingsContent>
        );

      case "security":
        return (
          <SettingsContent
            title={t("settings.security.title")}
            description={t("settings.security.description")}
          >
            <SettingsSection>
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

              <div className="space-y-4">
                <h3 className="font-medium text-foreground">
                  {t("settings.security.changePassword")}
                </h3>

                <div className="space-y-4">
                  <div>
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
                >
                  {t("settings.security.updatePassword")}
                </Button>
              </div>
            </SettingsSection>
          </SettingsContent>
        );

      case "developer":
        return (
          <SettingsContent
            title={t("settings.developer.title")}
            description={t("settings.developer.description")}
          >
            <SettingsSection>
              <McpConfig />
            </SettingsSection>
          </SettingsContent>
        );

      case "dangerZone":
        return (
          <SettingsContent
            title={t("settings.dangerZone.title")}
            description={t("settings.dangerZone.description")}
          >
            <SettingsSection>
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

              <div className="space-y-6">
                <div className="border border-destructive/20 rounded-lg p-4">
                  <h3 className="font-medium text-foreground mb-2">
                    {t("settings.dangerZone.clearHistory")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("settings.dangerZone.clearHistoryDescription")}
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowClearHistoryDialog(true)}
                    disabled={isLoading}
                  >
                    <TrashIcon className="w-4 h-4 " />
                    {t("settings.dangerZone.clearHistoryButton")}
                  </Button>
                </div>

                <div className="border border-destructive/20 rounded-lg p-4">
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
                  >
                    <TrashIcon className="w-4 h-4 " />
                    {t("settings.dangerZone.deleteAccountButton")}
                  </Button>
                </div>
              </div>
            </SettingsSection>
          </SettingsContent>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <AlertDialog
        open={showClearHistoryDialog}
        onOpenChange={setShowClearHistoryDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings.dangerZone.clearHistory")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.dangerZone.confirmClearHistory")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearHistory}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? t("common.loading") : t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col h-screen">
        <Navbar />
        <SettingsLayout
          sidebar={
            <SettingsSidebar
              items={sidebarItems}
              activeItem={activeTab}
              onItemClick={(id) => {
                setActiveTab(id as SettingTab);
                setMessage("");
                setError("");
              }}
            />
          }
        >
          {renderContent()}
        </SettingsLayout>
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContentPage />
    </ProtectedRoute>
  );
}
