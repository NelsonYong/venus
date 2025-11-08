"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    Configuration: "OAuth 配置错误。请检查环境变量中的 CLIENT_ID 和 CLIENT_SECRET 是否正确。",
    AccessDenied: "访问被拒绝。您可能取消了授权或权限不足。",
    Verification: "验证失败。请重试。",
    Default: "登录时发生错误。请稍后重试。",
  };

  const errorMessage = errorMessages[error || "Default"] || errorMessages.Default;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center border border-destructive/20">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">登录失败</h1>
            <p className="text-muted-foreground">遇到了一些问题</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium">错误类型: {error || "Unknown"}</p>
              <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">可能的解决方案：</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>检查网络连接是否正常</li>
                <li>确认 OAuth 应用配置正确</li>
                <li>验证回调 URL 是否与配置匹配</li>
                <li>清除浏览器缓存后重试</li>
              </ul>
            </div>

            <Button
              onClick={() => window.location.href = "/auth/signin"}
              className="w-full"
            >
              返回登录页面
            </Button>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
          <h3 className="text-sm font-medium mb-2">调试信息：</h3>
          <div className="text-xs text-muted-foreground font-mono bg-background/50 p-2 rounded">
            <div>错误: {error}</div>
            <div>时间: {new Date().toLocaleString("zh-CN")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
