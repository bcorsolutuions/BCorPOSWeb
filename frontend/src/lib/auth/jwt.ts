import { jwtDecode } from "jwt-decode";
import type { DecodedAccessToken } from "@/types/auth";

// BCorDFWebApi's AccountController.Login already returns UserName/Email/
// CompId/FullName/Roles directly in the response body — there is nothing to
// decode the JWT for except its expiry (TokenService issues a plain 1-day
// token with no refresh flow).
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<DecodedAccessToken>(token);
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
