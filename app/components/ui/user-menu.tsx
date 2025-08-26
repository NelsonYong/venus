"use client";

import { useState } from "react";
import { useAuth } from "@/app/contexts/auth-context";
import { useTranslation } from "@/app/contexts/i18n-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  UserIcon,
  LogOutIcon,
  SettingsIcon,
  ChevronDownIcon,
} from "lucide-react";

export function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center space-x-2 h-auto p-2 hover:bg-muted/50"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium truncate max-w-24">
              {user.name}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-24">
              {user.email}
            </span>
          </div>
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 p-0" align="end">
        <div className="p-4 space-y-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">
                {t("userMenu.registeredSince")}{" "}
                {new Date(user.createdAt).toLocaleDateString("zh-CN")}
              </p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-2"
              onClick={() => {
                window.location.href = "/profile";
              }}
            >
              <UserIcon className="h-4 w-4 mr-2" />
              {t("userMenu.profile")}
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-2"
              onClick={() => {
                window.location.href = "/settings";
              }}
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              {t("userMenu.settings")}
            </Button>

            <div className="border-t pt-2">
              <Button
                variant="ghost"
                className="w-full justify-start h-auto p-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-destructive/20 border-t-destructive rounded-full animate-spin" />
                    {t("userMenu.loggingOut")}
                  </>
                ) : (
                  <>
                    <LogOutIcon className="h-4 w-4 mr-2" />
                    {t("userMenu.logout")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
