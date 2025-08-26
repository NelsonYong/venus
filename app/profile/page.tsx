"use client";

import { useState } from "react";
import { useAuth } from "@/app/contexts/auth-context";
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

function ProfileContent() {
  const { user, refreshAuth } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editData, setEditData] = useState({
    name: user?.name || "",
    avatar: user?.avatar || "",
  });

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
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
        setError(response.message || response.error || "Failed to update profile");
      }
    } catch (error) {
      console.error('Update profile error:', error);
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
      <div className="flex-1 max-w-4xl mx-auto p-6 overflow-auto">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">个人资料</h1>
              <p className="text-muted-foreground mt-1">
                管理您的个人信息和偏好设置
              </p>
            </div>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2"
              >
                <EditIcon className="w-4 h-4" />
                <span>编辑资料</span>
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
              <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
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
                      头像链接
                    </label>
                    <Input
                      value={editData.avatar}
                      onChange={(e) => setEditData({ ...editData, avatar: e.target.value })}
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
                      姓名
                    </label>
                    {isEditing ? (
                      <Input
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
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
                      邮箱地址
                    </label>
                    <p className="text-foreground bg-muted/50 rounded-md px-3 py-2">
                      {user.email}
                    </p>
                  </div>

                  {/* Join Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      注册时间
                    </label>
                    <p className="text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center">
                      <LanguagesIcon className="w-4 h-4 mr-2" />
                      语言偏好
                    </label>
                    <p className="text-foreground bg-muted/50 rounded-md px-3 py-2">
                      {user.language === 'zh-CN' ? '简体中文' : user.language}
                    </p>
                  </div>
                </div>

                {/* Theme */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center">
                    <PaletteIcon className="w-4 h-4 mr-2" />
                    主题偏好
                  </label>
                  <p className="text-foreground bg-muted/50 rounded-md px-3 py-2 inline-block">
                    {user.theme === 'system' ? '跟随系统' : 
                     user.theme === 'light' ? '浅色模式' : 
                     user.theme === 'dark' ? '深色模式' : user.theme}
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
                          <span>保存中...</span>
                        </>
                      ) : (
                        <>
                          <SaveIcon className="w-4 h-4" />
                          <span>保存更改</span>
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
                      <span>取消</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground mb-4">使用统计</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">0</div>
                <div className="text-sm text-muted-foreground">对话次数</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">0</div>
                <div className="text-sm text-muted-foreground">消息总数</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">
                  {Math.ceil((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="text-sm text-muted-foreground">使用天数</div>
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