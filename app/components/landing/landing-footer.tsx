"use client";

import { useTranslation } from "@/app/contexts/i18n-context";

export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-12 items-center justify-center text-sm text-muted-foreground">
          <span>
            {t("landing.footer.message")}{" "}
            <a
              href="/terms"
              className="underline hover:text-foreground transition-colors"
            >
              {t("landing.footer.terms")}
            </a>{" "}
            {t("landing.footer.and")}{" "}
            <a
              href="/privacy"
              className="underline hover:text-foreground transition-colors"
            >
              {t("landing.footer.privacy")}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
