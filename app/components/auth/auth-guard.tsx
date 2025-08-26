"use client";

import { useEffect } from "react";
import { useAuth } from "@/app/contexts/auth-context";
import { useRouter } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-logout') {
        router.push('/login');
      }
    };

    const handleUnauthorized = () => {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login')) {
        const loginUrl = new URL('/login', window.location.origin);
        if (currentPath !== '/') {
          loginUrl.searchParams.set('redirect', currentPath);
        }
        router.push(loginUrl.pathname + loginUrl.search);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, [router]);

  return <>{children}</>;
}