// Real BCorDFWebApi GLGroupMasterController/GLMasterController — generic
// MasterController<TDto,...> CRUD, chart-of-accounts style: GLGroupMaster is
// a self-referencing (ParentCode) account-category tree; GLMaster is the
// leaf-level ledger account referencing a GLGroupMaster.GLGroupCode.

export const GL_ACCOUNT_TYPES = [
  { value: "1", label: "ASSET" },
  { value: "2", label: "LIABILITY" },
  { value: "3", label: "INCOME" },
  { value: "4", label: "EXPENSE" },
  { value: "5", label: "EQUITY" },
] as const;

export const GL_DRCR_TYPES = [
  { value: "DR", label: "Debit" },
  { value: "CR", label: "Credit" },
] as const;

export interface GLGroupMasterDto {
  id: string;
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  glGroupName: string;
  accountType: number;
  glCtrlTypeCode?: string | null;
  parentCode?: string | null;
  seqNo?: string | null;
  seqNum?: number | null;
  ccGroups?: string | null;
}

export interface GLMasterDto {
  id: string;
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  glName: string;
  glGroupCode: string;
  glCtrlTypeCode: string;
  accountType: number;
  drCrType?: string | null;
  allowedLimit?: number | null;
  seqNo?: number | null;
  seqNum?: number | null;
  ccGroups?: string | null;
  glRemarks?: string | null;
  interCoGLCode: boolean;
}
