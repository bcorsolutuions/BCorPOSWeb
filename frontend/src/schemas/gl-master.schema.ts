import { z } from "zod";

// Real GLGroupMaster/GLMaster admin forms — back masters/gl-groups,
// masters/gl-accounts against BCorDFWebApi's real GLGroupMasterController/
// GLMasterController (see types/gl-master.ts). accountType/drCrType stay
// string-encoded here (Select values must be strings) and get numeric-
// coerced at the service boundary.

export const glGroupSchema = z.object({
  code: z.string().min(1, "validation.required"),
  glGroupName: z.string().min(1, "validation.required"),
  accountType: z.string().min(1, "validation.required"),
  glCtrlTypeCode: z.string().optional(),
  parentCode: z.string().optional(),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type GLGroupFormValues = z.infer<typeof glGroupSchema>;

export const glMasterSchema = z.object({
  code: z.string().min(1, "validation.required"),
  glName: z.string().min(1, "validation.required"),
  glGroupCode: z.string().min(1, "validation.required"),
  glCtrlTypeCode: z.string().min(1, "validation.required"),
  accountType: z.string().min(1, "validation.required"),
  drCrType: z.string().optional(),
  allowedLimit: z.coerce.number().min(0, "validation.mustBeZeroOrMore").optional(),
  glRemarks: z.string().optional(),
  interCoGLCode: z.boolean().default(false),
  siteId: z.string().min(1, "validation.required"),
  active: z.boolean().default(true),
});
export type GLMasterFormValues = z.infer<typeof glMasterSchema>;
