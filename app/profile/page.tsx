"use client";

import { useAuth } from "@/app/hooks/use-auth";
import { useTranslation } from "@/app/contexts/i18n-context";
import { Navbar } from "@/app/components/ui/navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserIcon, MailIcon } from "lucide-react";
import { useConversations } from "../hooks/use-conversations";
import { useQuery } from "@tanstack/react-query";
import { profileAPI } from "@/lib/http-client";

function ProfileContent() {
  const { user } = useAuth();
  const { data: conversations } = useConversations();
  const { data: stats } = useQuery({
    queryKey: ["profile-stats"],
    queryFn: async () => {
      const response = await profileAPI.getStats();
      return response.data;
    },
    enabled: !!user,
  });
  const { t } = useTranslation();

  const totalConversations = conversations?.length || 0;
  const totalMessages = stats?.totalMessages || 0;

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex-1 max-w-6xl mx-auto p-6 overflow-auto w-full">
        <div className="space-y-6 w-full">
          {/* Profile Card */}
          <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
            <h1 className="text-3xl font-bold text-foreground mb-6">
              {t("profile.title")}
            </h1>
            <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
              {/* Avatar Section */}
              <div className="flex flex-col items-center">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(user.name ?? "")}
                  </AvatarFallback>
                </Avatar>
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
                    <p className="text-foreground bg-muted/50 rounded-md px-3 py-2">
                      {user.name}
                    </p>
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
                </div>
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
                  {user.createdAt
                    ? Math.ceil(
                        (Date.now() - new Date(user.createdAt).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : 0}
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
  return <ProfileContent />;
}
