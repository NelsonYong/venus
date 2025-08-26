"use client";

import { PanelLeftIcon } from "lucide-react";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "../theme-toggle";
import { useAuth } from "@/app/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface NavbarProps {
  onSidebarToggle?: () => void;
}

export function Navbar({ onSidebarToggle }: NavbarProps) {
  const { user } = useAuth();
  const navigation = useRouter();
  const redirectChat = () => {
    // 获取当前的路径
    const pathname = window.location.pathname;
    if (pathname !== "/") navigation.replace("/");
  };

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Side */}
          <div className="flex items-center space-x-3">
            {/* Logo and Brand */}
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={redirectChat}
            >
              {/* <div className="relative">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                  <BotIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <SparklesIcon className="w-2 h-2 text-primary-foreground" />
                </div>
              </div> */}
              <div>
                <h1 className="text-xl font-bold text-foreground">Rela AI</h1>
              </div>
            </div>

            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSidebarToggle}
                className="h-9 w-9"
              >
                <PanelLeftIcon className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
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
