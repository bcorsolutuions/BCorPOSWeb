import type { useTranslations } from "next-intl";

/**
 * Zod schemas (see src/schemas/*.schema.ts) pass translation keys like
 * "validation.required" as their error messages instead of English text,
 * so every validation error is localized automatically wherever it's
 * rendered. Messages that *aren't* dotted keys (e.g. a raw string an API
 * error handler passed through) are shown as-is rather than crashing.
 */
export function translateOrRaw(t: ReturnType<typeof useTranslations>, message: string): string {
  if (!message.includes(".")) return message;
  try {
    return t(message as Parameters<typeof t>[0]);
  } catch {
    return message;
  }
}
