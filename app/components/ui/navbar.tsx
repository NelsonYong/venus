"use client";

import { useMemo, useState, useEffect } from "react";
import {
  PanelLeftIcon,
  EditIcon,
  StarIcon,
  ChevronDownIcon,
} from "lucide-react";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "../theme-toggle";
import { useAuth } from "@/app/hooks/use-auth";
import { useTranslation } from "@/app/contexts/i18n-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VenusLogoText } from "@/components/ui/venus-logo";

interface NavbarProps {
  onSidebarToggle?: () => void;
  conversationTitle?: string;
  isStarred?: boolean;
  onTitleUpdate?: (title: string) => void;
  onStarToggle?: () => void;
}

export function Navbar({
  onSidebarToggle,
  conversationTitle,
  isStarred = false,
  onTitleUpdate,
  onStarToggle,
}: NavbarProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigation = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversationTitle || "");

  // 同步 conversationTitle 变化到 editTitle
  useEffect(() => {
    if (!isEditing) {
      setEditTitle(conversationTitle || "");
    }
  }, [conversationTitle, isEditing]);

  // get pathname
  const pathname = usePathname();

  const isShowSidebar = useMemo(() => {
    return user && pathname === "/";
  }, [pathname, user]);

  const redirectChat = () => {
    // 获取当前的路径
    const pathname = window.location.pathname;
    if (pathname !== "/") navigation.replace("/");
  };

  const handleStartEdit = () => {
    setEditTitle(conversationTitle || "");
    setIsEditing(true);
  };

  const handleEndEdit = () => {
    const trimmedTitle = editTitle.trim();
    const originalTitle = conversationTitle || "";

    // 如果修改后的文案与原来不一致，则触发保存接口
    if (trimmedTitle && trimmedTitle !== originalTitle && onTitleUpdate) {
      onTitleUpdate(trimmedTitle);
    }

    // 退出编辑模式
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEndEdit();
    } else if (e.key === "Escape") {
      // Escape 键恢复原值并退出编辑
      setEditTitle(conversationTitle || "");
      setIsEditing(false);
    }
  };

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Side */}
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {/* Sidebar Toggle Button */}
            <div>
              {isShowSidebar && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSidebarToggle}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <PanelLeftIcon className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Logo and Brand / Conversation Title */}
            <div className="flex items-center space-x-2 min-w-0">
              {conversationTitle ? (
                // Show conversation title with edit/star functionality
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {isEditing ? (
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleEndEdit}
                      className="h-8 flex-1 min-w-[150px] max-w-[400px]"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center space-x-1 flex-1 min-w-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="flex items-center space-x-1 cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1 flex-1 min-w-0 select-none">
                            {isStarred && (
                              <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0 pointer-events-none" />
                            )}
                            <h1
                              className="text-lg font-semibold text-foreground truncate flex-1 min-w-0 pointer-events-none"
                              title={conversationTitle}
                            >
                              {conversationTitle}
                            </h1>
                            <ChevronDownIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 pointer-events-none" />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <DropdownMenuItem onClick={handleStartEdit}>
                            <EditIcon className="mr-2 h-4 w-4" />
                            {t("navbar.rename")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={onStarToggle}>
                            <StarIcon
                              className={cn(
                                "mr-2 h-4 w-4",
                                isStarred
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground"
                              )}
                            />
                            {isStarred ? t("navbar.unstar") : t("navbar.star")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              ) : (
                // Show default Venus logo/brand
                <div
                  className="flex items-center cursor-pointer"
                  onClick={redirectChat}
                >
                  {/* <h1 className="text-xl font-bold text-foreground">
                    {t("navbar.brand")}
                    </h1> */}

                  <VenusLogoText size={68} />
                </div>
              )}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            <ThemeToggle />

            {user ? (
              <UserMenu />
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    window.location.href = "/login";
                  }}
                >
                  {t("navbar.login")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    window.location.href = "/login";
                  }}
                >
                  {t("navbar.register")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
