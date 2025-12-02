"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useUpdateSettings } from "@/app/hooks/use-auth";
import { useI18n, useTranslation } from "@/app/contexts/i18n-context";
import { Navbar } from "@/app/components/ui/navbar";
import { Button } from "@/components/ui/button";
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
  // ShieldIcon,
  // BellIcon,
  PaletteIcon,
  // KeyIcon,
  TrashIcon,
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
  SettingsBottomTabs,
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
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale, changeLanguage } = useI18n();
  const { t } = useTranslation();
  const updateSettingsMutation = useUpdateSettings();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);

  // Get initial tab from URL query or default to "appearance"
  const getInitialTab = (): SettingTab => {
    const tabParam = searchParams.get("tab");
    const validTabs: SettingTab[] = [
      "appearance",
      "notifications",
      "privacy",
      "security",
      "developer",
      "dangerZone",
    ];
    return validTabs.includes(tabParam as SettingTab)
      ? (tabParam as SettingTab)
      : "appearance";
  };

  const [activeTab, setActiveTab] = useState<SettingTab>(getInitialTab());

  // Sync activeTab with URL query parameter when navigating back/forward
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const validTabs: SettingTab[] = [
      "appearance",
      "notifications",
      "privacy",
      "security",
      "developer",
      "dangerZone",
    ];
    const urlTab = validTabs.includes(tabParam as SettingTab)
      ? (tabParam as SettingTab)
      : "appearance";

    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
      setMessage("");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (newTab: SettingTab) => {
    setActiveTab(newTab);
    setMessage("");
    setError("");

    // Update URL with new tab parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`/settings?${params.toString()}`, { scroll: false });
  };

  const [settings, setSettings] = useState({
    theme: user?.theme || theme,
    language: locale,
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

  // Update language when locale changes
  useEffect(() => {
    setSettings((prev) => ({ ...prev, language: locale }));
  }, [locale]);

  if (!user) return null;

  const sidebarItems = [
    {
      id: "appearance",
      label: t("settings.appearance.title"),
      icon: <PaletteIcon className="w-4 h-4" />,
    },
    // {
    //   id: "notifications",
    //   label: t("settings.notifications.title"),
    //   icon: <BellIcon className="w-4 h-4" />,
    // },
    // {
    //   id: "privacy",
    //   label: t("settings.privacy.title"),
    //   icon: <ShieldIcon className="w-4 h-4" />,
    // },
    // {
    //   id: "security",
    //   label: t("settings.security.title"),
    //   icon: <KeyIcon className="w-4 h-4" />,
    // },
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
      setTheme(newTheme as "system" | "light" | "dark");
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
      // Change language in i18n context (updates localStorage and UI)
      await changeLanguage(newLanguage);

      // Save to backend if user is logged in
      if (user) {
        await updateSettingsMutation.mutateAsync({ language: newLanguage });
      }
    } catch (error) {
      console.error("Update language error:", error);
      setError(t("settings.languages.updateFailedRetry"));
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

      // case "security":
      //   return (
      //     <SettingsContent
      //       title={t("settings.security.title")}
      //       description={t("settings.security.description")}
      //     >
      //       <SettingsSection></SettingsSection>
      //     </SettingsContent>
      //   );

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
              onItemClick={(id) => handleTabChange(id as SettingTab)}
            />
          }
          bottomTabs={
            <SettingsBottomTabs
              items={sidebarItems}
              activeItem={activeTab}
              onItemClick={(id) => handleTabChange(id as SettingTab)}
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
  return <SettingsContentPage />;
}
