/* ───────────────────────────────────────────────────────────────────
 * Global app configuration – persisted on the server
 * Keys: theme, mode, appTitle
 * ─────────────────────────────────────────────────────────────────── */

const DEFAULT = {
  theme   : "technical",        // grey palette
  mode    : "auto",             // light | dark | auto
  appTitle: "Project-Tracker",
};

let CACHE = { ...DEFAULT };

/* fetch (or create) the single row */
export async function initConfig() {
  try {
    const r = await fetch("/api/config");
    CACHE = r.ok ? { ...DEFAULT, ...(await r.json()) } : { ...DEFAULT };
  } catch {
    CACHE = { ...DEFAULT };
  }
}

/* plain getters ---------------------------------------------------- */
export function loadConfig() { return CACHE; }

/* theme: just echo or fall back */
export const effectiveTheme = (fallback = "technical") =>
  CACHE.theme ?? fallback;

/* mode: resolve "auto" → system pref                              */
export function effectiveMode(fallback = "light") {
  const m = CACHE.mode ?? fallback;
  if (m === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return m;
}

/* raw stored value (can be "auto") */
export const storedMode = () => CACHE.mode ?? "auto";

/* save (merge & persist) ------------------------------------------- */
export async function saveConfig(partial) {
  CACHE = { ...CACHE, ...partial };
  await fetch("/api/config", {
    method : "PUT",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify(CACHE),
  });
}
