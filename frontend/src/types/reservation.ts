// Real Reservation Master types — camelCase, matching BCorDFWebApi's
// ReservationMasterController/ReservationMasterDto (new table this session,
// see D:\Works\BCorApi\PowerDFWebApi\Sql\CreateReservationMaster.sql).
export const RESERVATION_STATUSES = ["Pending", "Confirmed", "Seated", "Cancelled", "NoShow"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export interface ReservationMaster {
  id: string;
  code: string;
  compID: string;
  siteID: string;
  active: boolean;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  customerName: string;
  customerPhone: string;
  partySize: number;
  reservationDateTime: string;
  durationMinutes: number;
  tableCode?: string | null;
  status: ReservationStatus;
  remarks?: string | null;
}
