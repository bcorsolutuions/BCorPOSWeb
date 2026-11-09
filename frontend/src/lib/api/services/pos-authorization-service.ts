import { apiClient, skipAuthRedirect } from "../axios-client";

// PosAuthorizationController.cs — the "manager PIN" prompt for price
// override / void / over-limit discount, without ending the cashier's
// own session. A wrong supervisor PIN 401s deliberately; that must NOT
// be treated as "the cashier's own session expired" (see skipAuthRedirect).
export interface VerifySupervisorResult {
  authorized: boolean;
  userName?: string;
  roles?: string[];
  reason?: string;
}

export const posAuthorizationService = {
  verifySupervisor: async (username: string, password: string): Promise<VerifySupervisorResult> => {
    try {
      const { data } = await apiClient.post<VerifySupervisorResult>(
        "/PosAuthorization/verify-supervisor",
        { username, password },
        skipAuthRedirect(),
      );
      return data;
    } catch {
      return { authorized: false, reason: "Invalid username or password." };
    }
  },
};
