"use client";

import { useMemo, useState } from "react";
import {
  PanelLeftIcon,
  EditIcon,
  StarIcon,
  CheckIcon,
  XIcon,
  ChevronDownIcon,
} from "lucide-react";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "../theme-toggle";
import { useAuth } from "@/app/contexts/auth-context";
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

  const handleSaveEdit = () => {
    if (editTitle.trim() && onTitleUpdate) {
      onTitleUpdate(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(conversationTitle || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Side */}
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {/* Sidebar Toggle Button */}
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

            {/* Logo and Brand / Conversation Title */}
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {conversationTitle ? (
                // Show conversation title with edit/star functionality
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center space-x-1 flex-1 min-w-0">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="h-8 flex-1 min-w-[150px] max-w-[400px]"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={handleSaveEdit}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={handleCancelEdit}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 flex-1 min-w-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="flex items-center space-x-1 cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1 flex-1 min-w-0">
                            {isStarred && (
                              <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                            )}
                            <h1
                              className="text-lg font-semibold text-foreground truncate flex-1 min-w-0"
                              title={conversationTitle}
                            >
                              {conversationTitle}
                            </h1>
                            <ChevronDownIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                  <h1 className="text-xl font-bold text-foreground">
                    {t("navbar.brand")}
                  </h1>
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
