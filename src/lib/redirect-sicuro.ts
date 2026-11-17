export const PERCORSO_ACCESSO = "/auth/sign-in";
export const PERCORSO_RESET = "/auth/reset-password";

/** Accetta solo percorsi interni dell'app; altrimenti torna alla home. */
export function percorsoInterno(valore: unknown): string {
  if (typeof valore !== "string" || !valore.startsWith("/") || valore.startsWith("//")) return "/";
  if (valore.includes("\\") || [...valore].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return "/";
  const url = new URL(valore, "https://app.invalid");
  // La normalizzazione dei segmenti può produrre un percorso che inizia con //.
  if (url.pathname.startsWith("//")) return "/";
  return url.pathname + url.search + url.hash;
}

export function destinazioneDopoAccesso(valore: unknown): string {
  const percorso = percorsoInterno(valore);
  const pathname = percorso.split(/[?#]/, 1)[0];
  if (/^\/(?:accedi|reimposta|auth|api\/auth)(?:\/|$)/.test(pathname)) return "/";
  return percorso;
}
