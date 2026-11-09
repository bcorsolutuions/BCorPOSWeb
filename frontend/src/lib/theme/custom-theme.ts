// "My mode": a user-chosen light palette. A theme in this app is just a set of CSS variables on <html>
// (see styles/globals.css and tailwind.config.ts, which map colours as hsl(var(--x))), so a custom theme is
// five colours -> the full variable set below, applied with style.setProperty. No stylesheet is swapped
// and nothing is fetched, so it costs the same as switching Light/Dark.

export interface CustomThemeSettings {
  primary: string; // buttons, links, active menu item
  accent: string; // highlights
  background: string; // page background
  surface: string; // cards, panels, dialogs
  text: string; // body text
}

export const DEFAULT_CUSTOM_THEME: CustomThemeSettings = {
  primary: "#2563eb",
  accent: "#f59e0b",
  background: "#f8fafc",
  surface: "#ffffff",
  text: "#0f172a",
};

const SETTINGS_KEY = "bcor-custom-theme";
// The already-computed variable map, stored next to the settings so the tiny inline script in the root layout can
// apply it before first paint without re-implementing buildTokens in plain JS.
const TOKENS_KEY = "bcor-custom-theme-tokens";

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (v: string) => HEX.test(v);

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s * 100, l * 100];
}

/** "221 83% 40%" — the format the app's variables use (tailwind wraps them in hsl()). */
function token(rgb: Rgb): string {
  const [h, s, l] = rgbToHsl(rgb);
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

function mix([ar, ag, ab]: Rgb, [br, bg, bb]: Rgb, t: number): Rgb {
  return [Math.round(ar + (br - ar) * t), Math.round(ag + (bg - ag) * t), Math.round(ab + (bb - ab) * t)];
}

function luminance([r, g, b]: Rgb): number {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio, 1 (none) to 21 (black on white). */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = luminance(hexToRgb(hexA));
  const lb = luminance(hexToRgb(hexB));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const NEAR_BLACK: Rgb = [15, 23, 42];
const NEAR_WHITE: Rgb = [248, 250, 252];
const readableOn = (bg: Rgb): Rgb => (luminance(bg) > 0.4 ? NEAR_BLACK : NEAR_WHITE);

/** The full CSS-variable map for a palette. Status colours (destructive/success/warning) are left to the .mine class so they keep their meaning. */
export function buildTokens(s: CustomThemeSettings): Record<string, string> {
  const primary = hexToRgb(s.primary);
  const accent = hexToRgb(s.accent);
  const background = hexToRgb(s.background);
  const surface = hexToRgb(s.surface);
  const text = hexToRgb(s.text);

  return {
    "--background": token(background),
    "--foreground": token(text),
    "--card": token(surface),
    "--card-foreground": token(text),
    "--popover": token(surface),
    "--popover-foreground": token(text),
    "--primary": token(primary),
    "--primary-foreground": token(readableOn(primary)),
    "--ring": token(primary),
    "--accent": token(accent),
    "--accent-foreground": token(readableOn(accent)),
    "--secondary": token(mix(background, primary, 0.1)),
    "--secondary-foreground": token(text),
    "--muted": token(mix(background, text, 0.06)),
    "--muted-foreground": token(mix(text, background, 0.4)),
    "--border": token(mix(background, text, 0.14)),
    "--input": token(mix(background, text, 0.14)),
  };
}

const TOKEN_NAMES = Object.keys(buildTokens(DEFAULT_CUSTOM_THEME));

export function loadCustomTheme(): CustomThemeSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_CUSTOM_THEME;
    const parsed = JSON.parse(raw) as Partial<CustomThemeSettings>;
    const pick = (key: keyof CustomThemeSettings) =>
      typeof parsed[key] === "string" && isHex(parsed[key] as string) ? (parsed[key] as string) : DEFAULT_CUSTOM_THEME[key];
    return {
      primary: pick("primary"),
      accent: pick("accent"),
      background: pick("background"),
      surface: pick("surface"),
      text: pick("text"),
    };
  } catch {
    return DEFAULT_CUSTOM_THEME;
  }
}

export function saveCustomTheme(settings: CustomThemeSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.localStorage.setItem(TOKENS_KEY, JSON.stringify(buildTokens(settings)));
  } catch {
    // storage blocked (private window) — the theme still applies for this session
  }
}

export function applyCustomTheme(settings: CustomThemeSettings): void {
  const style = document.documentElement.style;
  for (const [name, value] of Object.entries(buildTokens(settings))) style.setProperty(name, value);
}

export function clearCustomTheme(): void {
  const style = document.documentElement.style;
  for (const name of TOKEN_NAMES) style.removeProperty(name);
}

/** Plain-JS twin of "apply the saved tokens", inlined into <head> so My mode paints with the right colours from the first frame. */
export const CUSTOM_THEME_BOOT_SCRIPT =
  "try{if(localStorage.getItem('theme')==='mine'){var t=JSON.parse(localStorage.getItem('" +
  TOKENS_KEY +
  "')||'null');if(t){var s=document.documentElement.style;for(var k in t)s.setProperty(k,t[k]);}}}catch(e){}";
