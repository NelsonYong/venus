"use client";

import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/app/contexts/i18n-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {
  BotIcon,
  SparklesIcon,
  ShieldCheckIcon,
  LockIcon,
  Github,
  Mail,
} from "lucide-react";

export default function SignInPage() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 如果已登录，重定向到 callbackUrl 或首页
  useEffect(() => {
    if (status === "authenticated") {
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      router.replace(callbackUrl);
    }
  }, [status, router, searchParams]);

  const handleGitHubSignIn = () => {
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    signIn("github", { callbackUrl });
  };

  const handleGoogleSignIn = () => {
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    signIn("google", { callbackUrl });
  };

  // 如果正在加载，显示加载状态
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  // 如果已登录，显示跳转提示
  if (status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="text-muted-foreground">正在跳转...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo和标题区域 */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                <BotIcon className="w-10 h-10 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <SparklesIcon className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {t("auth.brand.name")}
            </h1>
            <p className="text-muted-foreground">{t("auth.login.title")}</p>
          </div>
        </div>

        {/* 登录方式卡片 */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">
                选择登录方式
              </h2>
              <p className="text-sm text-muted-foreground">
                使用您的 GitHub 或 Google 账号快速登录
              </p>
            </div>

            {/* GitHub 登录按钮 */}
            <Button
              onClick={handleGitHubSignIn}
              variant="outline"
              className="w-full h-12 text-base font-medium hover:bg-accent/50 transition-colors"
            >
              <Github className="w-5 h-5 mr-3" />
              使用 GitHub 登录
            </Button>

            {/* Google 登录按钮 */}
            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              className="w-full h-12 text-base font-medium hover:bg-accent/50 transition-colors"
            >
              <Mail className="w-5 h-5 mr-3" />
              使用 Google 登录
            </Button>
          </div>
        </div>

        {/* 安全提示 */}
        <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
          <div className="flex items-start space-x-3">
            <ShieldCheckIcon className="w-5 h-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground flex items-center">
                <LockIcon className="w-4 h-4 mr-1" />
                {t("auth.security.title")}
              </h3>
              <p className="text-xs text-muted-foreground">
                我们使用业界标准的 OAuth 2.0 协议保护您的账号安全，不会存储您的第三方账号密码
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
