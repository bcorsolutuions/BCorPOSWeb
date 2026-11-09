import { newUuid } from "@/lib/utils";
// Shared by the tenant /license page (device activation) and
// use-license-guard.ts (validate calls) — both need the same stable
// per-browser device identifier.
const DEVICE_ID_KEY = "bcor_device_id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = newUuid();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
