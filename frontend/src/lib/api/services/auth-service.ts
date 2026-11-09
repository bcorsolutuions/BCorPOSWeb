import { apiClient } from "../axios-client";
import type { LoginRequest, LoginResponse } from "@/types/auth";

// BCorDFWebApi's AccountController exposes only /api/Account/login and
// /register — there is no /logout or /me endpoint, and no refresh-token
// flow (see TokenService.CreateToken: a plain 1-day token, no rotation).
export const authService = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>("/Account/login", {
      username: payload.username,
      password: payload.password,
    });
    return data;
  },
};
