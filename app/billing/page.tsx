"use client";

import { BillingDashboard } from "@/components/billing-dashboard";
import { useTranslation } from "@/app/contexts/i18n-context";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/use-auth";

function BillingPageContent() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="w-full space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2 hover:bg-muted/80 -ml-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              {t("billing.backButton")}
            </Button>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {t("billing.title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("billing.subtitle")}
            </p>
          </div>
          <BillingDashboard userId={user.id} />
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    
      <BillingPageContent />
    
  );
}
