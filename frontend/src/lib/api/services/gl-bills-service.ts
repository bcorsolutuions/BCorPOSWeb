import { apiClient } from "../axios-client";

// GlBillsController: the outstanding bills of ONE customer / supplier account (for the "Against" bill type in a voucher).
export interface OutstandingBill {
  billRef: string;
  /** Dr = a customer's bill, Cr = a supplier's bill (or an advance): the side the bill stands on */
  side: "Dr" | "Cr";
  /** what is still to be settled, always positive */
  outstanding: number;
  /** the bill as first entered */
  amount: number;
  billDate: string;
}

export const glBillsService = {
  outstanding: async (compId: string, glCode: string): Promise<OutstandingBill[]> => {
    const { data } = await apiClient.get<OutstandingBill[]>(`/GlBills/${compId}/${encodeURIComponent(glCode)}`);
    return data;
  },
};
