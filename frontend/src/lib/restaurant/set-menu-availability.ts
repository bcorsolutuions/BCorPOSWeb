import type { SetMenuMasterDto } from "@/types/set-menu";

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

/**
 * Client-side mirror of the backend's SetMenuAvailability.IsAvailableNow
 * (Service/Masters/SetMenuAvailability.cs) — used only for immediate UX
 * (disable the POS tile, show "Set Menu is currently unavailable." before
 * even opening the picker). The backend re-checks this authoritatively in
 * KOTController before saving, so a stale/tampered client can't bypass it —
 * see kind-crafting-hamming.md's Set Menu plan, §5.
 */
export function isSetMenuAvailableNow(setMenu: SetMenuMasterDto, at: Date = new Date()): boolean {
  if (!setMenu.active) return false;

  if (setMenu.validFrom && at < new Date(new Date(setMenu.validFrom).toDateString())) return false;
  if (setMenu.validTo) {
    const validToEnd = new Date(new Date(setMenu.validTo).toDateString());
    validToEnd.setDate(validToEnd.getDate() + 1);
    if (at >= validToEnd) return false;
  }

  if (setMenu.startTime && setMenu.endTime) {
    const minutesNow = at.getHours() * 60 + at.getMinutes();
    const [startH = 0, startM = 0] = setMenu.startTime.split(":").map(Number);
    const [endH = 0, endM = 0] = setMenu.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    if (startMinutes <= endMinutes) {
      if (minutesNow < startMinutes || minutesNow > endMinutes) return false;
    } else {
      // Overnight window (e.g. 22:00-02:00).
      if (minutesNow < startMinutes && minutesNow > endMinutes) return false;
    }
  }

  if (setMenu.availableDays) {
    const dayCode: string = DAY_CODES[at.getDay()] ?? "";
    const days = setMenu.availableDays.split(",").map((d) => d.trim().toUpperCase()).filter(Boolean);
    if (days.length > 0 && !days.includes(dayCode)) return false;
  }

  return true;
}
