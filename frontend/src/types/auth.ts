// Matches BCorDFWebApi's real AccountController.Login response and
// TokenService claims (see D:\Works\BCorApi\PowerDFWebApi) — there is no
// refresh-token flow in that backend (TokenService issues a 1-day token
// with no rotation endpoint), and CompId/FullName/Roles come back directly
// on login rather than being decoded from JWT claims.
export interface AuthUser {
  userName: string;
  email: string;
  compId: string; // Guid — required on every Pos/Document/Master endpoint
  fullName: string;
  roles: string[];
  /** Only set for ResellerAdmin users — see reseller_code JWT claim / AppUser.ResellerCode. */
  resellerCode?: string | null;
  /** Client-derived from `roles` (see lib/auth/role-permissions.ts) — the backend has no granular permission claims. */
  permissions: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  userName: string;
  email: string;
  compId: string;
  fullName: string;
  resellerCode?: string | null;
  roles: string[];
  token: string;
}

export interface DecodedAccessToken {
  sub: string;
  email: string;
  jti: string;
  role: string[] | string;
  company_id?: string;
  employee_id?: string;
  exp: number;
}
