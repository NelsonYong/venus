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
import { useMobile } from "@/app/hooks/use-mobile";
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
  const isMobile = useMobile(); // 使用通用的移动端检测 hook
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
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      {/* 响应式内边距：移动端更小 */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8">
        {/* 响应式高度和间距 */}
        <div className="flex items-center h-14 sm:h-16 gap-2 sm:gap-3 md:gap-4">
          {/* Left Side - Logo & Sidebar Toggle */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* 移动端隐藏标题，只显示Logo */}
            {conversationTitle && !isMobile ? (
              <div className="flex items-center flex-1 min-w-0">
                {isEditing ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleEndEdit}
                    className="h-8 w-full max-w-[300px] md:max-w-[400px]"
                    autoFocus
                  />
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center space-x-1 cursor-pointer hover:bg-muted/50 rounded-md px-3 py-1 max-w-[300px] md:max-w-[400px] lg:max-w-[500px] select-none">
                        {isStarred && (
                          <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0 pointer-events-none" />
                        )}
                        <h1
                          className="text-lg font-semibold text-foreground truncate pointer-events-none"
                          title={conversationTitle}
                        >
                          {conversationTitle}
                        </h1>
                        <ChevronDownIcon className="h-4 w-4 text-muted-foreground shrink-0 pointer-events-none" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48">
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
                )}
              </div>
            ) : (
              <div
                className="flex items-center cursor-pointer"
                onClick={redirectChat}
              >
                {/* 移动端Logo缩小 */}
                <VenusLogoText size={56} className="sm:hidden" />
                <VenusLogoText size={68} className="hidden sm:block" />
              </div>
            )}

            {/* Sidebar Toggle Button - 移动端在有标题时也显示 */}
            {isShowSidebar && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSidebarToggle}
                className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
              >
                <PanelLeftIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>

          {/* Center - Conversation Title (if exists) */}

          {/* Spacer when no conversation title */}
          <div className="flex-1" />

          {/* Right Side - Theme Toggle & User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 shrink-0">
            {/* 移动端可选：隐藏主题切换按钮 */}
            <div className="hidden xs:block">
              <ThemeToggle />
            </div>

            {user ? (
              <UserMenu />
            ) : (
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                {/* 移动端隐藏登录按钮，只保留注册 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    window.location.href = "/login";
                  }}
                  className="hidden sm:inline-flex"
                >
                  {t("navbar.login")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    window.location.href = "/login";
                  }}
                  className="h-8 px-3 text-sm sm:h-9 sm:px-4"
                >
                  <span className="hidden sm:inline">
                    {t("navbar.register")}
                  </span>
                  <span className="sm:hidden">{t("navbar.login")}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
