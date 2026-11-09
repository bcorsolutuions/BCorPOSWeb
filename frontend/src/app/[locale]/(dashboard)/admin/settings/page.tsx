"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { CompanySetupCard } from "@/components/admin/company-setup-card";
import { BranchSetupCard } from "@/components/admin/branch-setup-card";
import { BranchBusinessTypesCard } from "@/components/admin/branch-business-types-card";

export default function SystemSettingsPage() {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      <PageHeader title={t("settings.title")} />
      <CompanySetupCard />
      <BranchSetupCard />
      <BranchBusinessTypesCard />
    </div>
  );
}
