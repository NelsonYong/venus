"use client";

import { BillingDashboard } from "@/components/billing-dashboard";
import { useTranslation } from "@/app/contexts/i18n-context";
import { useAuth } from "@/app/hooks/use-auth";
import { Navbar } from "@/app/components/ui/navbar";

function BillingPageContent() {
  const { user } = useAuth();
  const { t } = useTranslation();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex-1 max-w-6xl mx-auto p-6 overflow-auto w-full">
        <div className="space-y-6 w-full">
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
  return <BillingPageContent />;
}
