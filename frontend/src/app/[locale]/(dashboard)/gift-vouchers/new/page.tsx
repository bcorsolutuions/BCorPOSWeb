"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { giftVoucherMasterService } from "@/lib/api/services/gift-voucher-master-service";
import { giftVoucherIssueSchema, type GiftVoucherIssueFormValues } from "@/schemas/gift-voucher-issue.schema";
import { PageHeader } from "@/components/shared/page-header";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";

const DEFAULT_VALUES: GiftVoucherIssueFormValues = {
  amount: 0,
  customerCode: "",
  purchaserName: "",
  recipientName: "",
  recipientMobile: "",
  expiryDate: "",
};

/**
 * Admin-initiated "Issue Voucher" — a promotional/comped voucher not tied
 * to any POS sale (the normal path is selling one at POS, see
 * pos-cart-store.ts's addGiftVoucherSaleLine). Posts to
 * GiftVoucherMasterController's new Issue action, which calls
 * GiftVoucherService.IssueAsync — the exact same ledgered creation (auto-
 * numbered GiftVoucherNo, an ISSUE GiftVoucherTransaction row) a POS sale
 * itself triggers. There is still no generic/free-form create that could
 * set OriginalAmount/CurrentBalance directly.
 */
export default function NewGiftVoucherPage() {
  const t = useTranslations();
  const tg = useTranslations("giftVoucher");
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<GiftVoucherIssueFormValues>({
    resolver: zodResolver(giftVoucherIssueSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const issueMutation = useMutation({
    mutationFn: (values: GiftVoucherIssueFormValues) => giftVoucherMasterService.issue(values),
    onSuccess: (voucher) => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["gift-voucher-master"] });
      router.push(`/gift-vouchers/${encodeURIComponent(voucher.giftVoucherNo)}`);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || t("common.errorGeneric"), variant: "destructive" });
    },
  });

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <PageHeader title={tg("giftVoucherMaster")} />
      <Form {...form}>
        <form
          className="max-w-md space-y-4"
          onKeyDown={enterMovesToNextField}
          onSubmit={form.handleSubmit((values) => issueMutation.mutate(values))}
        >
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tg("originalAmount")}</FormLabel>
                <FormControl>
                  <Input type="number" step="any" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="customerCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tg("customer")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="purchaserName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tg("purchaserName")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="recipientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tg("recipientName")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="recipientMobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tg("recipientMobile")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expiryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tg("expiryDate")}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/gift-vouchers")}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={issueMutation.isPending}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
