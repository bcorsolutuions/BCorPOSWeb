"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { integrationService } from "@/lib/api/services/admin-service";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import type { IntegrationConfig } from "@/types/admin";

function IntegrationCard({ config }: { config: IntegrationConfig }) {
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState(config.apiKey ?? "");
  const [endpoint, setEndpoint] = useState(config.endpoint ?? "");
  const [enabled, setEnabled] = useState(config.enabled);

  const saveMutation = useMutation({
    mutationFn: () => integrationService.update(config.key, { enabled, apiKey, endpoint }),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (err) => toast({ title: apiErrorMessage(err, t("common.errorGeneric")), variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{config.label}</CardTitle>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-normal">{t("integrations.enabled")}</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label>{t("integrations.apiKey")}</Label>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Endpoint</Label>
          <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
        </div>
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {t("common.save")}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function IntegrationSettingsPage() {
  const t = useTranslations("integrations");
  const { data } = useQuery({ queryKey: ["integrations"], queryFn: integrationService.list });

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(data ?? []).map((config) => (
          <IntegrationCard key={config.key} config={config} />
        ))}
      </div>
    </div>
  );
}
