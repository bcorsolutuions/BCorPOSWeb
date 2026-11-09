import { apiClient } from "../axios-client";

// PosPostingSetupController: the accounts a closed POS shift posts to (stored as GLMappingMaster rows, IntegrationCode "POS").
export interface PosPostingSetting {
  code: string;
  name: string;
  transactionType: string;
  paymentMode?: string | null;
  debitGLCode?: string | null;
  creditGLCode?: string | null;
}

export interface PosPostingSetup {
  canManage: boolean;
  settings: PosPostingSetting[];
}

export const posPostingSetupService = {
  get: async (compId: string): Promise<PosPostingSetup> => {
    const { data } = await apiClient.get<PosPostingSetup>(`/PosPostingSetup/${compId}`);
    return data;
  },

  save: async (compId: string, settings: PosPostingSetting[]): Promise<void> => {
    await apiClient.put(`/PosPostingSetup/${compId}`, { settings });
  },

  /** Fills the settings that are still empty from the standard chart of accounts codes. */
  fillDefaults: async (compId: string): Promise<void> => {
    await apiClient.post(`/PosPostingSetup/${compId}/defaults`);
  },
};
