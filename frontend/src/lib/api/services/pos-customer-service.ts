import { apiClient } from "../axios-client";

export interface QuickCustomerResult {
  customerCode: string;
  customerName: string;
  mobile: string;
  /** False when the phone number already belonged to a customer — their own name is returned, not the one typed. */
  isNew: boolean;
}

// BCorDFWebApi PosCustomerController — find-or-create a customer from name + phone at the till (salon open orders).
export const posCustomerService = {
  quickCreate: async (compId: string, siteId: string, name: string, mobile: string): Promise<QuickCustomerResult> => {
    const { data } = await apiClient.post<QuickCustomerResult>(`/PosCustomer/${compId}/${siteId}/quick`, { name, mobile });
    return data;
  },
};
