"use client";

import { useState, type ReactNode } from "react";
import { List, ListTree } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, type DefaultValues, type FieldValues, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataGridWrapper, type DataGridColumnDef } from "@/components/shared/data-grid-wrapper";
import { EntityFormField, type FieldConfig } from "@/components/shared/entity-form-field";
import { useToast } from "@/components/ui/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { enterMovesToNextField } from "@/lib/prevent-enter-submit";

interface CrudService<TEntity, TFormValues> {
  list: (query?: Record<string, unknown>) => Promise<{ items: TEntity[]; total: number }>;
  create: (payload: TFormValues) => Promise<TEntity>;
  update: (id: string, payload: TFormValues) => Promise<TEntity>;
  remove: (id: string) => Promise<void>;
}

interface CrudDataGridPageProps<TEntity extends { id: string }, TFormValues extends FieldValues> {
  queryKey: string;
  titleKey: string;
  descriptionKey?: string;
  service: CrudService<TEntity, TFormValues>;
  columns: DataGridColumnDef[];
  // `any, any` on the Def/Input params: zod's `.default()` fields make the
  // *input* type differ from TFormValues (the parsed *output*), which is
  // exactly what a form schema is expected to do — pinning ZodType's other
  // two params here avoids fighting that on every caller.
  schema: ZodType<TFormValues, any, any>;
  defaultValues: DefaultValues<TFormValues>;
  fields: FieldConfig<TFormValues>[];
  toFormValues?: (entity: TEntity) => TFormValues;
  permission?: string;
  renderExtra?: (ctx: { form: UseFormReturn<TFormValues>; editingEntity: TEntity | null }) => ReactNode;
  onSaved?: (entity: TEntity) => void;
  /** When set, "Add New" navigates here instead of opening the create dialog — row-click-to-edit is unaffected. Used by screens that moved creation onto its own page (see e.g. app/[locale]/(dashboard)/promotions/{page.tsx,new/page.tsx}). */
  createHref?: string;
  /** Classes for the Add/Edit dialog itself — e.g. "max-w-5xl" to widen it past the default narrow column. */
  dialogClassName?: string;
  /** Classes for the wrapper around the fields (and renderExtra). Default is a single stacked column; pass a grid (e.g. "grid grid-cols-1 gap-4 md:grid-cols-4") to lay fields out in columns. */
  formGridClassName?: string;
  /** Extra controls shown in the page header, next to the title. */
  headerActions?: ReactNode;
  /**
   * An alternative to the grid (e.g. a tree). When given, the header gets a list / tree switch and the tree is shown first.
   * It receives the loaded rows and the page's own edit / add handlers, so edits use the same dialog as the grid.
   */
  treeView?: (ctx: { items: TEntity[]; loading: boolean; onEdit: (entity: TEntity) => void; onAdd?: () => void }) => ReactNode;
}

/**
 * One reusable list+form pattern for the ~10 near-identical master/
 * transaction screens (Item, Customer, Supplier, PO, GRN, ...). Each screen
 * supplies its own columns/schema/fields; this component owns the
 * grid <-> dialog <-> mutation wiring exactly once (see 08-frontend-
 * structure.md's component reuse rationale).
 */
export function CrudDataGridPage<TEntity extends { id: string }, TFormValues extends FieldValues>({
  queryKey,
  titleKey,
  descriptionKey,
  service,
  columns,
  schema,
  defaultValues,
  fields,
  toFormValues,
  permission,
  renderExtra,
  onSaved,
  createHref,
  dialogClassName,
  formGridClassName,
  headerActions,
  treeView,
}: CrudDataGridPageProps<TEntity, TFormValues>) {
  const t = useTranslations();
  const { toast } = useToast();
  const { can } = usePermission();
  const canWrite = permission ? can(permission) : true;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<TEntity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<"tree" | "list">("tree");

  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: () => service.list(),
  });

  const form = useForm<TFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const saveMutation = useMutation({
    mutationFn: (values: TFormValues) =>
      editingEntity ? service.update(editingEntity.id, values) : service.create(values),
    onSuccess: (entity) => {
      toast({ title: t("common.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      onSaved?.(entity);
      setDialogOpen(false);
    },
    onError: (err: unknown) => {
      // Surface the backend's own message (e.g. "A ServiceMaster with code
      // 'X' already exists.") when there is one, instead of always showing
      // the same generic toast regardless of what actually went wrong.
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || t("common.errorGeneric"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => service.remove(id),
    onSuccess: () => {
      toast({ title: t("common.deleteSuccess") });
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setDeletingId(null);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: message || t("common.errorGeneric"), variant: "destructive" });
    },
  });

  function openCreate() {
    setEditingEntity(null);
    form.reset(defaultValues);
    setDialogOpen(true);
  }

  function openEdit(entity: TEntity) {
    setEditingEntity(entity);
    form.reset(toFormValues ? toFormValues(entity) : (entity as unknown as TFormValues));
    setDialogOpen(true);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title={t(titleKey)} description={descriptionKey ? t(descriptionKey) : undefined} actions={
          <>
            {treeView && (
              <div className="flex items-center rounded-md border p-0.5">
                <Button type="button" size="sm" variant={view === "tree" ? "secondary" : "ghost"} onClick={() => setView("tree")} aria-pressed={view === "tree"} title={t("common.viewTree")}>
                  <ListTree className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant={view === "list" ? "secondary" : "ghost"} onClick={() => setView("list")} aria-pressed={view === "list"} title={t("common.viewList")}>
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
            {headerActions}
          </>
        }
      />

      <div className="min-h-0 flex-1">
        {treeView && view === "tree" ? (
          treeView({
            items: data?.items ?? [],
            loading: isLoading,
            onEdit: openEdit,
            onAdd: canWrite ? (createHref ? () => router.push(createHref) : openCreate) : undefined,
          })
        ) : (
          <DataGridWrapper<TEntity>
            dataSource={data?.items ?? []}
            columns={columns}
            loading={isLoading}
            onRowClick={openEdit}
            onAddNew={canWrite ? (createHref ? () => router.push(createHref) : openCreate) : undefined}
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={dialogClassName}>
          <DialogHeader>
            <DialogTitle>{editingEntity ? t("common.edit") : t("common.add")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              className="space-y-4"
              onKeyDown={enterMovesToNextField}
              onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            >
              <div className={formGridClassName ?? "space-y-4"}>
                {fields
                  .filter((field) => field.name !== "active")
                  .map((field) => (
                    <EntityFormField key={String(field.name)} control={form.control} field={field} editing={!!editingEntity} />
                  ))}
                {renderExtra?.({ form, editingEntity })}
                {/* Active is always the last thing on a master form, after any extra sections. */}
                {fields
                  .filter((field) => field.name === "active")
                  .map((field) => (
                    <EntityFormField key={String(field.name)} control={form.control} field={field} />
                  ))}
              </div>
              <DialogFooter>
                {editingEntity && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="me-auto"
                    onClick={() => setDeletingId(editingEntity.id)}
                  >
                    {t("common.delete")}
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        loading={deleteMutation.isPending}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
      />
    </div>
  );
}
