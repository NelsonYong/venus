"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

// 公开路径，不需要登录
const publicPaths = ["/", "/auth/signin", "/auth/error", "/api", "/terms", "/privacy"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // 检查是否是公开路径
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  useEffect(() => {
    // 如果正在加载，不做任何操作
    if (status === "loading") return;

    // 如果是公开路径，不需要认证检查
    if (isPublicPath) return;

    // 如果未登录且不在公开路径，重定向到登录页
    if (status === "unauthenticated") {
      const signInUrl = `/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`;
      router.replace(signInUrl);
    }
  }, [status, pathname, isPublicPath, router]);

  // 显示加载状态
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  // 如果未登录且不在公开路径，显示加载状态（正在重定向）
  if (status === "unauthenticated" && !isPublicPath) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="text-muted-foreground">正在跳转到登录页...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
