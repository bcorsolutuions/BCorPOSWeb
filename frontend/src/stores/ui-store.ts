import { create } from "zustand";

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeCompanyId: string | null;
  activeBranchId: string | null;
  setActiveCompany: (companyId: string) => void;
  setActiveBranch: (branchId: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  activeCompanyId: null,
  activeBranchId: null,
  setActiveCompany: (companyId) => set({ activeCompanyId: companyId }),
  setActiveBranch: (branchId) => set({ activeBranchId: branchId }),
}));
