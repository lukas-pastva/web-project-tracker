/* ───────────────────────────────────────────────────────────────────
 * Global app configuration – persisted on the server
 * Only three keys are left: theme, mode, appTitle
 * ─────────────────────────────────────────────────────────────────── */

const DEFAULT = {
  theme   : "technical",        // grey palette
  mode    : "auto",
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

export function loadConfig()          { return CACHE; }
export const effectiveTheme = (f="technical") => CACHE.theme ?? f;
export const effectiveMode  = (f="light")     => CACHE.mode  ?? f;
export const storedMode     = ()              => CACHE.mode  ?? "auto";

export async function saveConfig(partial) {
  CACHE = { ...CACHE, ...partial };
  await fetch("/api/config", {
    method :"PUT",
    headers: { "Content-Type":"application/json" },
    body   : JSON.stringify(CACHE),
  });
}
