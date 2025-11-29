"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/app/contexts/i18n-context";

interface BillingInfo {
  id: string;
  plan: string;
  credits: number;
  totalSpent: number;
  monthlyLimit?: number;
  dailyLimit?: number;
  currentMonthSpent: number;
  currentDaySpent: number;
  isOverLimit: boolean;
}

interface UsageRecord {
  id: string;
  modelName: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  createdAt: string;
}

export function BillingDashboard({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBillingInfo = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      }

      try {
        const response = await fetch("/api/billing/info", {
          headers: {
            "x-user-id": userId,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBillingInfo(data.billing);
        }

        const usageResponse = await fetch("/api/billing/usage", {
          headers: {
            "x-user-id": userId,
          },
        });

        if (usageResponse.ok) {
          const usageData = await usageResponse.json();
          setUsageRecords(usageData.usage);
        }
      } catch (error) {
        console.error("Failed to fetch billing info:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchBillingInfo();

    // 设置自动刷新，每30秒刷新一次
    const interval = setInterval(() => {
      fetchBillingInfo(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchBillingInfo]);

  const addCredits = async (amount: number) => {
    try {
      const response = await fetch("/api/billing/credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          amount,
          description: `${t("billing.addCredits")}${amount}`,
        }),
      });

      if (response.ok) {
        fetchBillingInfo(true);
      }
    } catch (error) {
      console.error("Failed to add credits:", error);
    }
  };

  if (loading) {
    return <BillingDashboardSkeleton />;
  }

  if (!billingInfo) {
    return <div className="p-4">{t("billing.failed")}</div>;
  }

  const monthlyUsagePercentage = billingInfo.monthlyLimit
    ? (Number(billingInfo.currentMonthSpent) /
        Number(billingInfo.monthlyLimit)) *
      100
    : 0;

  return (
    <div className="w-full space-y-6">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("billing.creditsBalance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold tracking-tight">
              ${Number(billingInfo.credits).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("billing.availableCredits")}
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addCredits(10)}
                disabled={refreshing}
                className="h-8 text-xs"
              >
                +$10
              </Button>
              <Button
                size="sm"
                onClick={() => addCredits(50)}
                disabled={refreshing}
                className="h-8 text-xs"
              >
                +$50
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("billing.plan")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-sm px-2 py-1">
                {billingInfo.plan}
              </Badge>
              {billingInfo.isOverLimit && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                  {t("billing.overLimit")}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("billing.currentPlan")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("billing.totalSpent")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold tracking-tight">
              ${Number(billingInfo.totalSpent).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("billing.allTimeUsage")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("billing.thisMonth")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold tracking-tight">
              ${Number(billingInfo.currentMonthSpent).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("billing.currentMonthSpending")}
            </p>
            {billingInfo.monthlyLimit && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t("billing.limit")}
                  </span>
                  <span className="text-muted-foreground">
                    ${Number(billingInfo.monthlyLimit).toFixed(2)}
                  </span>
                </div>
                <Progress value={monthlyUsagePercentage} className="h-2" />
                <div className="text-xs text-muted-foreground text-right">
                  {monthlyUsagePercentage.toFixed(1)}%
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 使用记录 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                {t("billing.recentUsage")}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("billing.lastApiCalls")}
              </CardDescription>
            </div>
            {refreshing && (
              <div className="flex items-center text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current "></div>
                {t("common.loading")}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {usageRecords.length > 0 ? (
            <div className="space-y-3">
              {usageRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors space-y-2 sm:space-y-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="shrink-0">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {record.provider}/{record.modelName}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 space-y-1 sm:space-y-0">
                          <p className="text-xs text-muted-foreground">
                            {record.inputTokens.toLocaleString()} +{" "}
                            {record.outputTokens.toLocaleString()}{" "}
                            {t("billing.tokens")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right sm:text-right">
                    <p className="text-sm font-medium text-foreground">
                      ${Number(record.totalCost).toFixed(6)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-foreground mb-2">
                {t("billing.noUsageRecords")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("billing.emptyStateDescription")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 骨架屏组件
function BillingDashboardSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* 顶部统计卡片骨架 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted rounded"></div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="h-8 w-32 bg-muted rounded"></div>
              <div className="h-3 w-40 bg-muted rounded"></div>
              {i === 1 && (
                <div className="flex gap-2 mt-3">
                  <div className="h-8 w-16 bg-muted rounded"></div>
                  <div className="h-8 w-16 bg-muted rounded"></div>
                </div>
              )}
              {i === 4 && (
                <div className="mt-3 space-y-2">
                  <div className="h-2 w-full bg-muted rounded-full"></div>
                  <div className="h-3 w-16 bg-muted rounded ml-auto"></div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 使用记录骨架 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="space-y-2">
            <div className="h-6 w-40 bg-muted rounded"></div>
            <div className="h-4 w-64 bg-muted rounded"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg space-y-2 sm:space-y-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-muted rounded-full"></div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-48 bg-muted rounded"></div>
                      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-1 sm:space-y-0">
                        <div className="h-3 w-32 bg-muted rounded"></div>
                        <div className="h-3 w-40 bg-muted rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="h-4 w-20 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
