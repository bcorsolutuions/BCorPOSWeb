import { apiClient } from "../axios-client";
import type { CreatePosDto, PosDto, UpdatePosDto } from "@/types/pos";

// Talks directly to BCorDFWebApi's PosController (a thin wrapper over the
// generic DocumentServiceNDetails<PosHdr,...> engine — see
// D:\Works\BCorApi\PowerDFWebApi\Controllers\Documents\PosController.cs).
// compId/siteId/userName are explicit params on every call because the
// backend does not resolve them from JWT claims (see
// Extensions/ClaimsPrincipalExtensions.cs's own TODO note) — the frontend
// is the source of truth for tenant scoping here, not the token.
export const posService = {
  get: async (compId: string, siteId: string, docNo: number): Promise<PosDto> => {
    const { data } = await apiClient.get<PosDto>(`/Pos/${compId}/${siteId}/${docNo}`);
    return data;
  },

  // Return lookup by the printed Ref No (e.g. ADMS2600000038) — PosController.GetByRefNo.
  getByRefNo: async (compId: string, siteId: string, refNo: string): Promise<PosDto> => {
    const { data } = await apiClient.get<PosDto>(`/Pos/${compId}/${siteId}/by-ref/${encodeURIComponent(refNo)}`);
    return data;
  },

  getAll: async (compId: string, siteId: string): Promise<PosDto[]> => {
    const { data } = await apiClient.get<PosDto[]>(`/Pos/${compId}/${siteId}`);
    return data;
  },

  // Public, unauthenticated — backs the QR-on-receipt digital copy
  // (app/[locale]/receipt/[token]/page.tsx). No compId/siteId/auth needed;
  // the signed token alone identifies the bill (PosController.GetPublicReceipt).
  getPublic: async (token: string): Promise<PosDto> => {
    const { data } = await apiClient.get<PosDto>(`/Pos/receipt/${token}`);
    return data;
  },

  create: async (compId: string, siteId: string, userName: string, dto: CreatePosDto): Promise<PosDto> => {
    const { data } = await apiClient.post<PosDto>("/Pos", dto, {
      params: { compId, siteId, userName },
    });
    return data;
  },

  update: async (
    compId: string,
    siteId: string,
    userName: string,
    docNo: number,
    dto: UpdatePosDto,
  ): Promise<PosDto> => {
    const { data } = await apiClient.put<PosDto>(`/Pos/${docNo}`, dto, {
      params: { compId, siteId, userName },
    });
    return data;
  },

  remove: async (compId: string, siteId: string, userName: string, docNo: number, reason?: string): Promise<void> => {
    await apiClient.delete(`/Pos/${docNo}`, { params: { compId, siteId, userName, reason } });
  },
};
