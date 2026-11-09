import { z } from "zod";

// BCorDFWebApi's AccountController.Login takes a plain Username (matched
// case-insensitively against AppUser.UserName) — not necessarily an email
// address (e.g. till logins like "cashier1") — so this is not validated as
// an email format.
export const loginSchema = z.object({
  username: z.string().min(1, "validation.required"),
  password: z.string().min(1, "validation.required"),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
