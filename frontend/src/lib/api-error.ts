// Server errors come back as `{ message }` (DocumentValidationException, DbSaveException and the
// controllers' BadRequest/Conflict bodies). Surfacing that text — instead of a
// generic "No records found" toast — tells the cashier what actually went wrong
// (e.g. "No shift is open on this terminal").
//
// A 5xx is an unexpected crash: its body is a stack trace / HTML page, never something to show a user,
// so those (and anything that looks like markup or is very long) fall back to the screen's own text.
export function apiErrorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { status?: number; data?: unknown } })?.response;
  const data = response?.data;
  const readable = (text: unknown): text is string =>
    typeof text === "string" && text.trim().length > 0 && text.length <= 400 && !text.trimStart().startsWith("<");

  const message = (data as { message?: unknown } | undefined)?.message;
  if (readable(message)) return message;
  if ((response?.status ?? 0) >= 500) return fallback;

  if (readable(data)) return data;
  const title = (data as { title?: unknown } | undefined)?.title;
  if (readable(title)) return title;
  return fallback;
}
