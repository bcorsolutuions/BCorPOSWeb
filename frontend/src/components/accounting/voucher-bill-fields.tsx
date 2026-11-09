"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { glBillsService, type OutstandingBill } from "@/lib/api/services/gl-bills-service";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatMoney } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const BILL_NEW = "1";
export const BILL_AGAINST = "2";

/**
 * The bill details of a voucher line on a customer / supplier account: the bill type (1 New, 2 Against) and the bill reference.
 *   New     - the user types the reference of a new bill.
 *   Against - the reference is chosen from the OUTSTANDING bills of this very account, so only that customer's / supplier's bills show.
 * Choosing a bill offers its outstanding amount on the opposite side (a customer's bill is settled by a credit), via onPickBill.
 */
export function VoucherBillFields({
  glCode,
  billType,
  billRef,
  onTypeChange,
  onRefChange,
  onPickBill,
}: {
  glCode: string;
  billType: string;
  billRef: string;
  onTypeChange: (type: string) => void;
  onRefChange: (ref: string) => void;
  onPickBill: (bill: OutstandingBill) => void;
}) {
  const t = useTranslations("jv");
  const locale = useLocale();
  const compId = useAuthStore((s) => s.user?.compId ?? "");
  const currency = useCurrencyStore((s) => s.currencyCode);

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["gl-bills", compId, glCode],
    queryFn: () => glBillsService.outstanding(compId, glCode),
    enabled: !!compId && !!glCode && billType === BILL_AGAINST,
  });

  return (
    <div className="col-span-12 grid grid-cols-12 items-end gap-2 border-t pt-2">
      <div className="col-span-4">
        <Label className="text-xs">{t("billType")}</Label>
        <Select value={billType} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder={t("billType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={BILL_NEW}>{t("billNew")}</SelectItem>
            <SelectItem value={BILL_AGAINST}>{t("billAgainst")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-8">
        <Label className="text-xs">{t("billRef")}</Label>
        {billType === BILL_AGAINST ? (
          <Select
            value={billRef}
            onValueChange={(ref) => {
              onRefChange(ref);
              const bill = bills.find((b) => b.billRef === ref);
              if (bill) onPickBill(bill);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? "…" : bills.length === 0 ? t("noOutstandingBills") : t("selectBill")} />
            </SelectTrigger>
            <SelectContent>
              {bills.map((b) => (
                <SelectItem key={b.billRef} value={b.billRef}>
                  {b.billRef} — {t("outstanding")} {formatMoney(b.outstanding, currency, locale)} {b.side}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input value={billRef} onChange={(e) => onRefChange(e.target.value)} disabled={!billType} maxLength={50} placeholder={billType ? t("billRef") : ""} />
        )}
      </div>
    </div>
  );
}
