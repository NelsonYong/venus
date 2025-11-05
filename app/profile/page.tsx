"use client";

import { useState } from "react";
import { useAuth } from "@/app/contexts/auth-context";
import { useTranslation } from "@/app/contexts/i18n-context";
import { ProtectedRoute } from "@/app/components/auth/protected-route";
import { Navbar } from "@/app/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { profileAPI } from "@/lib/http-client";
import {
  UserIcon,
  MailIcon,
  CalendarIcon,
  EditIcon,
  SaveIcon,
  XIcon,
  CameraIcon,
  LanguagesIcon,
  PaletteIcon,
} from "lucide-react";
import { useConversations } from "../hooks/use-conversations";

function ProfileContent() {
  const { user, refreshAuth } = useAuth();
  const { data: conversations } = useConversations();

  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editData, setEditData] = useState({
    name: user?.name || "",
    avatar: user?.avatar || "",
  });

  const totalConversations = conversations?.length || 0;
  const totalMessages =
    conversations?.reduce((acc, curr) => acc + curr.messages.length, 0) || 0;

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await profileAPI.updateProfile({
        name: editData.name.trim(),
        avatar: editData.avatar.trim() || undefined,
      });

      if (response.status === 200 && response.data?.success) {
        setMessage(response.data.message || "Profile updated successfully");
        setIsEditing(false);
        // Refresh user data
        await refreshAuth();
      } else {
        setError(
          response.message || response.error || "Failed to update profile"
        );
      }
    } catch (error) {
      console.error("Update profile error:", error);
      setError("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      name: user.name,
      avatar: user.avatar || "",
    });
    setMessage("");
    setError("");
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex-1 max-w-6xl mx-auto p-6 overflow-auto w-full">
        <div className="space-y-6 w-full">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {t("profile.title")}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t("profile.subtitle")}
              </p>
            </div>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2"
              >
                <EditIcon className="w-4 h-4" />
                <span>{t("profile.editProfile")}</span>
              </Button>
            )}
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

          {/* Profile Card */}
          <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
            <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
              {/* Avatar Section */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={editData.avatar} alt={user.name} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <CameraIcon className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="space-y-2 w-full max-w-sm">
                    <label className="text-sm font-medium text-foreground">
                      {t("profile.avatarUrl")}
                    </label>
                    <Input
                      value={editData.avatar}
                      onChange={(e) =>
                        setEditData({ ...editData, avatar: e.target.value })
                      }
                      placeholder="https://example.com/avatar.jpg"
                      className="text-center"
                    />
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center">
                      <UserIcon className="w-4 h-4 mr-2" />
                      {t("profile.name")}
                    </label>
                    {isEditing ? (
                      <Input
                        value={editData.name}
                        onChange={(e) =>
                          setEditData({ ...editData, name: e.target.value })
                        }
                        className="w-full"
                      />
                    ) : (
                      <p className="text-foreground bg-muted/50 rounded-md px-3 py-2">
                        {user.name}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center">
                      <MailIcon className="w-4 h-4 mr-2" />
                      {t("profile.email")}
                    </label>
                    <p className="text-foreground bg-muted/50 rounded-md px-3 py-2">
                      {user.email}
                    </p>
                  </div>

                  {/* Join Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {t("profile.joinDate")}
                    </label>
                    <p className="text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                      {new Date(user.createdAt).toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center">
                      <LanguagesIcon className="w-4 h-4 mr-2" />
                      {t("profile.languagePreference")}
                    </label>
                    <p className="text-foreground bg-muted/50 rounded-md px-3 py-2">
                      {user.language === "zh-CN"
                        ? t("profile.languages.zh-CN")
                        : user.language}
                    </p>
                  </div>
                </div>

                {/* Theme */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center">
                    <PaletteIcon className="w-4 h-4 mr-2" />
                    {t("profile.themePreference")}
                  </label>
                  <p className="text-foreground bg-muted/50 rounded-md px-3 py-2 inline-block">
                    {user.theme === "system"
                      ? t("profile.themes.system")
                      : user.theme === "light"
                      ? t("profile.themes.light")
                      : user.theme === "dark"
                      ? t("profile.themes.dark")
                      : user.theme}
                  </p>
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex items-center space-x-3 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="flex items-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                          <span>{t("profile.saving")}</span>
                        </>
                      ) : (
                        <>
                          <SaveIcon className="w-4 h-4" />
                          <span>{t("profile.save")}</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="flex items-center space-x-2"
                    >
                      <XIcon className="w-4 h-4" />
                      <span>{t("profile.cancel")}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {t("profile.stats.title")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">
                  {totalConversations}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("profile.stats.conversations")}
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">
                  {totalMessages}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("profile.stats.messages")}
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">
                  {Math.ceil(
                    (Date.now() - new Date(user.createdAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("profile.stats.daysUsed")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
