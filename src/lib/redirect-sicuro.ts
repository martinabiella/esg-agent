/** Accetta solo percorsi interni dell'app; altrimenti torna alla home. */
export function percorsoInterno(valore: unknown): string {
  if (typeof valore !== "string") return "/";
  if (!valore.startsWith("/") || valore.startsWith("//")) return "/";
  if (valore.includes("\\") || /[\r\n]/.test(valore)) return "/";
  if (valore === "/accedi" || valore.startsWith("/accedi?")) return "/";
  return valore;
}
