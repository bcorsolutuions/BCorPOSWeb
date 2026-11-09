"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen, FoldVertical, UnfoldVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { GLGroupMaster, GLMaster } from "@/lib/api/services/gl-master-service";
import { TYPE_KEYS, allKeys, buildTree, filterTree, type TreeNode } from "./gl-tree-model";

export function GlAccountTree({
  groups, accounts, loading, onEdit, onAdd,
}: {
  groups: GLGroupMaster[];
  accounts: GLMaster[];
  loading?: boolean;
  onEdit: (account: GLMaster) => void;
  onAdd?: () => void;
}) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const tree = useMemo(
    () => buildTree(groups, accounts, (n) => t(`gl.${TYPE_KEYS[n]}`), t("gl.unassigned")),
    [groups, accounts, t],
  );

  // First load: open the account types so the groups underneath are visible straight away.
  useEffect(() => {
    if (tree.length) setOpen((prev) => (prev.size ? prev : new Set(tree.map((n) => n.key))));
  }, [tree]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (q ? filterTree(tree, q) : tree), [tree, q]);
  const searchOpen = useMemo(() => (q ? new Set(allKeys(visible)) : null), [q, visible]);

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  function row(node: TreeNode, depth: number) {
    const isOpen = searchOpen ? searchOpen.has(node.key) : open.has(node.key);
    const expandable = node.children.length > 0;
    const Icon = node.kind === "account" ? FileText : isOpen ? FolderOpen : Folder;
    return (
      <div key={node.key}>
        <div
          role={node.kind === "account" ? "button" : "treeitem"}
          tabIndex={0}
          aria-expanded={expandable ? isOpen : undefined}
          onClick={() => (node.kind === "account" && node.account ? onEdit(node.account) : expandable && toggle(node.key))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (node.kind === "account" && node.account) onEdit(node.account);
              else if (expandable) toggle(node.key);
            }
          }}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-md py-1.5 pe-3 text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            node.kind === "type" && "bg-muted/40 font-semibold",
            node.kind === "group" && "font-medium",
            node.inactive && "text-muted-foreground line-through decoration-muted-foreground/40",
          )}
          style={{ paddingInlineStart: 8 + depth * 22 }}
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
            {expandable ? isOpen ? <ChevronDown className="h-4 w-4 rtl:rotate-90" /> : <ChevronRight className="h-4 w-4 rtl:rotate-180" /> : null}
          </span>
          <Icon className={cn("h-4 w-4 shrink-0", node.kind === "account" ? "text-muted-foreground" : "text-amber-600")} />
          {node.code && <span className="w-20 shrink-0 tabular-nums text-muted-foreground">{node.code}</span>}
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
          {node.kind === "account" && node.account ? (
            <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
              {node.account.glCtrlTypeCode && <span className="rounded bg-muted px-1.5 py-0.5">{node.account.glCtrlTypeCode}</span>}
              {node.account.drCrType && <span className="w-6 text-center">{node.account.drCrType}</span>}
            </span>
          ) : (
            <span className="shrink-0 text-xs font-normal text-muted-foreground">{t("gl.accountsCount", { count: node.accounts })}</span>
          )}
        </div>
        {expandable && isOpen && <div role="group">{node.children.map((c) => row(c, depth + 1))}</div>}
      </div>
    );
  }

  if (loading) return <Skeleton className="h-full min-h-[300px] w-full" />;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("common.search")} className="w-64" />
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(new Set(allKeys(tree)))}>
          <UnfoldVertical className="me-2 h-4 w-4" />
          {t("gl.expandAll")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(new Set())}>
          <FoldVertical className="me-2 h-4 w-4" />
          {t("gl.collapseAll")}
        </Button>
        {onAdd && (
          <Button type="button" size="sm" className="ms-auto" onClick={onAdd}>
            {t("common.add")}
          </Button>
        )}
      </div>
      <div role="tree" className="min-h-0 flex-1 overflow-y-auto rounded-md border p-1">
        {visible.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{t("common.noData")}</p>
        ) : (
          visible.map((n) => row(n, 0))
        )}
      </div>
    </div>
  );
}
