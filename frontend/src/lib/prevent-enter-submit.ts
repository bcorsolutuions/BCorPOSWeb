import type { KeyboardEvent } from "react";

/**
 * `onKeyDown` for a document form (purchase order, invoice, GRN, ...): pressing
 * Enter in a field must never save it — the Save button is the only way to
 * save. Browsers submit a form when Enter is pressed in any of its inputs (the
 * form's submit button is "clicked" for you), which is how half-typed
 * documents got saved while someone was just moving between cells.
 *
 * Only `<input>` fields are blocked. Enter in a `<textarea>` still adds a new
 * line, and Enter on a focused button (Save, Cancel, Add line, remove line)
 * still presses it, so keyboard use of the form is otherwise unchanged.
 */
export function preventEnterSubmit(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== "Enter") return;
  const target = e.target;
  if (target instanceof HTMLInputElement && target.type !== "submit" && target.type !== "button") {
    e.preventDefault();
  }
}

// The things the cursor lands on, in page order: editable inputs, selects, textareas and Radix select triggers. Read-only
// (grey, calculated) cells and buttons such as "remove line" are skipped so Enter walks only through what is typed or chosen.
const FIELD_SELECTOR = 'input, select, textarea, button[role="combobox"]';

function isFillableField(el: HTMLElement): boolean {
  if (el.tabIndex < 0) return false;
  if (el instanceof HTMLInputElement && (el.type === "hidden" || el.readOnly)) return false;
  if ((el as HTMLInputElement).disabled) return false;
  return el.getClientRects().length > 0; // not hidden / collapsed
}

/**
 * `onKeyDown` for every entry form (masters, documents, vouchers, setup): Enter works like Tab — it never saves the form and
 * moves the cursor to the next field instead (Shift+Enter goes back one). From the last field it lands on the Save button
 * without pressing it. Enter in a textarea still adds a line, and Enter on a button (Save, Cancel, Add line) still presses
 * it. The item search lets Enter choose its highlighted result first; this then moves the cursor on.
 */
export function enterMovesToNextField(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== "Enter" || e.nativeEvent.isComposing || e.defaultPrevented) return; // a field that handled Enter itself keeps it
  const target = e.target;
  if (!(target instanceof HTMLInputElement) || target.type === "submit" || target.type === "button") return;

  e.preventDefault(); // never submit from a field
  focusNextField(target, e.shiftKey, e.currentTarget);
}

/**
 * Moves the cursor from `from` to the next field (or the previous one when `back`), like Tab does. `container` is where the fields are
 * looked for; by default the form or dialog the field is in. From the last field it lands on the Save (submit) button without pressing it.
 */
export function focusNextField(from: HTMLElement, back = false, container?: HTMLElement) {
  const scope = container ?? from.closest<HTMLElement>("form") ?? from.closest<HTMLElement>('[role="dialog"]') ?? document.body;
  const fields = Array.from(scope.querySelectorAll<HTMLElement>(FIELD_SELECTOR)).filter(isFillableField);
  const index = fields.indexOf(from);
  const next = fields[index + (back ? -1 : 1)];

  if (next) {
    next.focus();
    if (next instanceof HTMLInputElement && ["text", "number", "search", "tel", "email", "url"].includes(next.type)) next.select();
    return;
  }
  if (!back) scope.querySelector<HTMLElement>('button[type="submit"]')?.focus();
}
