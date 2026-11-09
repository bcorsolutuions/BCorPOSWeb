"use client";

import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { AiInsightCard } from "@/components/dashboard/ai-insight-card";
import { TodayPanel } from "@/components/dashboard/today-panel";
import { RestaurantDashboard } from "@/components/dashboard/restaurant-dashboard";
import { RetailDashboard } from "@/components/dashboard/retail-dashboard";

// Each business gets its own working dashboard and each hides itself for everyone else: the restaurant overview (Restaurant
// module, management roles), the supermarket / trading overview (SUP, TRD, WHL branches, management roles) and the salon
// "Today" panel (salon branches). The old summary cards here called GET
// /dashboard/summary, which has no backend, so they never rendered anything but skeletons.
export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={user ? t("welcome", { name: user.fullName }) : undefined} />

      <RestaurantDashboard />

      <RetailDashboard />

      <AiInsightCard />

      <TodayPanel />
    </div>
  );
}
