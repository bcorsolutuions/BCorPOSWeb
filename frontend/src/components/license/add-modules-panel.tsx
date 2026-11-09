"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { licenseService } from "@/lib/api/services/license-service";
import { CREATE_LICENSE_MODULE_CODES } from "@/lib/license/module-business-type-constants";

// Grants more modules (e.g. QR_TABLE_ORDERING) to an already-issued license — the API (POST /License/{compId}/{code}/modules)
// is Super Admin / Reseller only; the "Add License" dialog only covers modules chosen at issue time.
export function AddModulesPanel({
  compId,
  code,
  grantedCodes,
  onAdded,
}: {
  compId: string;
  code: string;
  grantedCodes: string[];
  onAdded: () => void;
}) {
  const tr = useTranslations("reseller");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);

  const available = CREATE_LICENSE_MODULE_CODES.filter((m) => !grantedCodes.includes(m));

  const addMutation = useMutation({
    mutationFn: () => licenseService.addModules(compId, code, selected),
    onSuccess: () => {
      toast({ title: tr("modulesAdded") });
      setSelected([]);
      onAdded();
    },
    onError: (err) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || tc("errorGeneric"), variant: "destructive" });
    },
  });

  if (available.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border p-3">
      <Label>{tr("addModules")}</Label>
      <div className="grid grid-cols-2 gap-2">
        {available.map((m) => (
          <div key={m} className="flex items-center gap-2">
            <Checkbox
              checked={selected.includes(m)}
              onCheckedChange={(checked) =>
                setSelected((cur) => (checked ? [...cur, m] : cur.filter((c) => c !== m)))
              }
            />
            <span className="text-sm">{m}</span>
          </div>
        ))}
      </div>
      <Button size="sm" onClick={() => addMutation.mutate()} disabled={selected.length === 0 || addMutation.isPending}>
        {tr("addSelectedModules")}
      </Button>
    </div>
  );
}
