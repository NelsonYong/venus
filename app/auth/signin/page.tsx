"use client";

import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/app/contexts/i18n-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Mail } from "lucide-react";

export default function SignInPage() {
  const { t } = useTranslation();
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

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

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            {status === "loading" ? "Loading..." : "Redirecting..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="text-4xl font-semibold tracking-tight mb-2">
            {t("auth.brand.name")}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("auth.login.title")}
          </p>
        </div>

        {/* Sign In Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full h-11 text-[15px] font-medium border-border/50 hover:bg-accent/50 hover:border-border transition-all"
          >
            <Mail className="w-[18px] h-[18px] mr-2.5" />
            Continue with Google
          </Button>

          <Button
            onClick={handleGitHubSignIn}
            variant="outline"
            className="w-full h-11 text-[15px] font-medium border-border/50 hover:bg-accent/50 hover:border-border transition-all"
          >
            <svg
              className="w-[18px] h-[18px] mr-2.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground mt-8 leading-relaxed">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
