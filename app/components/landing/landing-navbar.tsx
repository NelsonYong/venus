"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { VenusLogo, VenusLogoText } from "@/components/ui/venus-logo";
import { ThemeToggle } from "../theme-toggle";
import { UserMenu } from "../ui/user-menu";
import { useTranslation } from "@/app/contexts/i18n-context";
import { Settings } from "lucide-react";

export function LandingNavbar() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <VenusLogoText size={56} />
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {status === "authenticated" ? (
              <>
                <Button onClick={() => router.push("/chat")}>
                  {t("landing.nav.goToChat")}
                </Button>
                <UserMenu />
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => router.push("/auth/signin")}
                >
                  {t("landing.nav.signIn")}
                </Button>
                <Button onClick={() => router.push("/auth/signin")}>
                  {t("landing.nav.signUp")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
