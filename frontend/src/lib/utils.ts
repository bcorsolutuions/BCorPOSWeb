import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// A v4 UUID that works on any page. crypto.randomUUID() only exists in secure contexts (https or localhost), so it is
// undefined when the app is opened over plain http on a LAN address (e.g. http://192.168.1.38:3000) - and the server expects
// real GUIDs for idempotency keys / draft ids, so the fallback must be a proper UUID too.
export function newUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Most POS/retail customers in the region prefer Western (0123) numerals
// even on the Arabic UI, not Arabic-Indic digits (٠١٢٣) — see
// 09-i18n-strategy.md. The `-u-nu-latn` Unicode extension forces that
// while keeping every other Arabic locale formatting rule (currency
// position, date word order, etc.) intact.
function intlLocaleTag(locale: string): string {
  return locale === "ar" ? "ar-u-nu-latn" : "en-US";
}

export function formatMoney(amount: number, currency = "AED", locale = "en") {
  return new Intl.NumberFormat(intlLocaleTag(locale), {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  }).format(amount);
}

/**
 * Same rounding as formatMoney (the currency's real minor-unit precision —
 * 2dp for AED/SAR/USD, 3dp for BHD/KWD/OMR — read from Intl itself, not
 * hardcoded) but without the currency symbol/code. For repeated contexts
 * like a receipt's item list, where the currency is already stated once
 * (e.g. the grand total) and repeating "BHD" on every line is just noise.
 */
export function formatMoneyPlain(amount: number, currency = "AED", locale = "en") {
  const { maximumFractionDigits } = new Intl.NumberFormat(intlLocaleTag(locale), {
    style: "currency",
    currency,
  }).resolvedOptions();
  return new Intl.NumberFormat(intlLocaleTag(locale), {
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

/**
 * Backend image endpoints (Item/MenuMaster) return root-relative paths like
 * "/uploads/items/xyz.jpg" — next.config.mjs proxies /uploads/:path* to the
 * same backend origin as /api/proxy, so these are already valid same-origin
 * <img src> values as-is. This just normalizes the null/empty case so
 * callers can write `resolveImageUrl(item.imagePath) ?? <fallback icon>`.
 */
export function resolveImageUrl(path?: string | null): string | undefined {
  return path && path.trim() !== "" ? path : undefined;
}

// Converts an AI-generated image's base64 response body into a File, so it
// flows through the exact same upload path (client validation, FormData
// POST) as a manually picked file — see ImagePickerField's onGenerate.
export function base64ToFile(base64: string, contentType: string, fileName: string): File {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], fileName, { type: contentType });
}

// Downscales a picked/generated image to at most `maxSide` px and re-encodes it as JPEG (typically 40-80 KB instead of
// 1-2 MB) - menu photos are shown as small tiles, many at a time, often on a phone. Returns the original file if the
// browser can't decode/encode it.
export async function shrinkImage(file: File, maxSide = 512): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function formatNumber(value: number, locale = "en", options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(intlLocaleTag(locale), options).format(value);
}

export function formatDate(value: string | Date, locale = "en") {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocaleTag(locale), {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(value: string | Date, locale = "en") {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocaleTag(locale), {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
