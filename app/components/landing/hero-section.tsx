"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { VenusLogo, VenusLogoText } from "@/components/ui/venus-logo";
import { useTranslation } from "@/app/contexts/i18n-context";
import { Sparkles } from "lucide-react";

export function HeroSection() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();

  const handleGetStarted = () => {
    if (status === "authenticated") {
      router.push("/chat");
    } else {
      router.push("/auth/signin");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center  px-4 py-16">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <VenusLogoText />
      </div>
      {/* Description */}
      <p className="text-lg md:text-xl text-muted-foreground text-center mb-12 max-w-2xl">
        {t("landing.hero.description")}
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <Button
          size="lg"
          onClick={handleGetStarted}
          className="text-lg px-8 py-6"
        >
          <Sparkles className="h-5 w-5" />
          {status === "authenticated"
            ? t("landing.hero.startChatting")
            : t("landing.hero.getStarted")}
        </Button>
        {/* {status !== "authenticated" && (
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push("/auth/signin")}
            className="text-lg px-8 py-6"
          >
            {t("landing.hero.signIn")}
          </Button>
        )} */}
      </div>
    </div>
  );
}
