"use client";

import { useState } from "react";
import { PanelLeftIcon, EditIcon, StarIcon, CheckIcon, XIcon } from "lucide-react";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "../theme-toggle";
import { useAuth } from "@/app/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
  onStarToggle 
}: NavbarProps) {
  const { user } = useAuth();
  const navigation = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversationTitle || "");
  
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
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
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
            {user && (
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
                    <>
                      <h1 
                        className="text-lg font-semibold text-foreground cursor-pointer hover:text-foreground/80 truncate flex-1 min-w-0"
                        onClick={handleStartEdit}
                        title={conversationTitle}
                      >
                        {conversationTitle}
                      </h1>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-60 hover:opacity-100 flex-shrink-0"
                        onClick={handleStartEdit}
                      >
                        <EditIcon className="h-3 w-3" />
                      </Button>
                      {onStarToggle && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={onStarToggle}
                        >
                          <StarIcon 
                            className={cn(
                              "h-4 w-4",
                              isStarred 
                                ? "fill-yellow-400 text-yellow-400" 
                                : "text-muted-foreground hover:text-foreground"
                            )} 
                          />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                // Show default Rela AI logo/brand
                <div
                  className="flex items-center cursor-pointer"
                  onClick={redirectChat}
                >
                  <h1 className="text-xl font-bold text-foreground">Rela AI</h1>
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
                  登录
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    window.location.href = "/login";
                  }}
                >
                  注册
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
