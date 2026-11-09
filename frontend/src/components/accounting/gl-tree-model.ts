import type { GLGroupMaster, GLMaster } from "@/lib/api/services/gl-master-service";

// The chart of accounts as a tree: account type > group (groups nest through their parent group) > account.
// Order of the account types follows the way a balance sheet then a profit and loss statement are read.
const TYPE_ORDER = [1, 2, 5, 3, 4];
export const TYPE_KEYS: Record<number, string> = { 1: "typeAsset", 2: "typeLiability", 3: "typeIncome", 4: "typeExpense", 5: "typeEquity" };

export interface TreeNode {
  key: string;
  kind: "type" | "group" | "account";
  code?: string;
  label: string;
  inactive?: boolean;
  account?: GLMaster;
  children: TreeNode[];
  /** accounts under this node, at any depth */
  accounts: number;
}

const bySeq = (a: { seqNum?: number | null; code: string }, b: { seqNum?: number | null; code: string }) =>
  (a.seqNum ?? Number.MAX_SAFE_INTEGER) - (b.seqNum ?? Number.MAX_SAFE_INTEGER) || a.code.localeCompare(b.code, undefined, { numeric: true });

export function buildTree(groups: GLGroupMaster[], accounts: GLMaster[], typeLabel: (n: number) => string, unassigned: string): TreeNode[] {
  const groupByCode = new Map(groups.map((g) => [g.code.toLowerCase(), g]));
  const accountsByGroup = new Map<string, GLMaster[]>();
  for (const a of accounts) {
    const k = a.glGroupCode.toLowerCase();
    (accountsByGroup.get(k) ?? accountsByGroup.set(k, []).get(k)!).push(a);
  }
  const childGroups = new Map<string, GLGroupMaster[]>();
  const rootGroups = new Map<number, GLGroupMaster[]>();
  for (const g of groups) {
    const parent = g.parentCode ? groupByCode.get(g.parentCode.toLowerCase()) : undefined;
    if (parent && parent.code !== g.code) {
      const k = parent.code.toLowerCase();
      (childGroups.get(k) ?? childGroups.set(k, []).get(k)!).push(g);
    } else {
      (rootGroups.get(g.accountType) ?? rootGroups.set(g.accountType, []).get(g.accountType)!).push(g);
    }
  }

  const accountNode = (a: GLMaster): TreeNode => ({
    key: `a:${a.code}`, kind: "account", code: a.code, label: a.glName, inactive: !a.active, account: a, children: [], accounts: 1,
  });

  const groupNode = (g: GLGroupMaster, seen: Set<string>): TreeNode => {
    const k = g.code.toLowerCase();
    seen.add(k);
    const subGroups = (childGroups.get(k) ?? []).filter((c) => !seen.has(c.code.toLowerCase())).sort(bySeq).map((c) => groupNode(c, seen));
    const own = (accountsByGroup.get(k) ?? []).sort(bySeq).map(accountNode);
    const children = [...subGroups, ...own];
    return {
      key: `g:${g.code}`, kind: "group", code: g.code, label: g.glGroupName, inactive: !g.active, children,
      accounts: children.reduce((n, c) => n + c.accounts, 0),
    };
  };

  const usedGroups = new Set<string>();
  const nodes: TreeNode[] = [];
  for (const type of TYPE_ORDER) {
    const children = (rootGroups.get(type) ?? []).sort(bySeq).map((g) => groupNode(g, usedGroups));
    // groups that only point at each other (a parent loop) have no root; show them at the top instead of losing their accounts
    for (const g of groups.filter((x) => x.accountType === type).sort(bySeq))
      if (!usedGroups.has(g.code.toLowerCase())) children.push(groupNode(g, usedGroups));
    // accounts whose group does not exist are shown under their own account type
    const loose = accounts
      .filter((a) => a.accountType === type && !groupByCode.has(a.glGroupCode.toLowerCase()))
      .sort(bySeq)
      .map(accountNode);
    if (loose.length)
      children.push({ key: `u:${type}`, kind: "group", label: unassigned, children: loose, accounts: loose.length });
    nodes.push({
      key: `t:${type}`, kind: "type", label: typeLabel(type), children, accounts: children.reduce((n, c) => n + c.accounts, 0),
    });
  }
  return nodes.filter((n) => n.children.length > 0);
}

export function allKeys(nodes: TreeNode[], into: string[] = []): string[] {
  for (const n of nodes) {
    if (n.children.length) {
      into.push(n.key);
      allKeys(n.children, into);
    }
  }
  return into;
}

/** Nodes that match the search, plus their ancestors; a matching group keeps everything below it. */
export function filterTree(nodes: TreeNode[], q: string): TreeNode[] {
  const out: TreeNode[] = [];
  for (const n of nodes) {
    const self = n.label.toLowerCase().includes(q) || (n.code ?? "").toLowerCase().includes(q);
    if (self && n.kind !== "type") {
      out.push(n);
      continue;
    }
    const kids = filterTree(n.children, q);
    if (kids.length || self) out.push({ ...n, children: self && !kids.length ? n.children : kids });
  }
  return out;
}

