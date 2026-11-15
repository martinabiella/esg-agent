// Le Soglie sono salvate come JSON libero (criteriSoglie): la forma non è
// ancora fissata, quindi la scheda le mostra in modo leggibile e tollerante.
function testo(valore: unknown): string {
  if (Array.isArray(valore)) return valore.map(testo).join(", ");
  if (valore !== null && typeof valore === "object") return righeOggetto(valore).join(", ");
  return String(valore);
}

function righeOggetto(o: object): string[] {
  return Object.entries(o).map(([k, v]) => `${k.replaceAll("_", " ")}: ${testo(v)}`);
}

function righeSogliaStrutturata(soglia: unknown): string {
  if (soglia === null || typeof soglia !== "object" || Array.isArray(soglia)) return testo(soglia);
  const s = soglia as Record<string, unknown>;
  const campo = typeof s.campo === "string" ? s.campo : "campo non indicato";
  const parti: string[] = [];
  if (s.minimo != null) parti.push(`minimo ${testo(s.minimo)}`);
  if (s.massimo != null) parti.push(`massimo ${testo(s.massimo)}`);
  if (s.paesi != null) parti.push(`tra ${testo(s.paesi)}`);
  return parti.length > 0 ? `${campo}: ${parti.join(", ")}` : righeOggetto(s).join(", ");
}

export function righeSoglie(valore: unknown): string[] {
  // Forma calcolabile: { minimoSoglie?, soglie: [...] } (vedi applicabilita.ts e atto.ts)
  if (valore !== null && typeof valore === "object" && !Array.isArray(valore)) {
    const v = valore as { soglie?: unknown; minimoSoglie?: unknown };
    if (Array.isArray(v.soglie)) {
      const righe = v.soglie.map(righeSogliaStrutturata);
      if (typeof v.minimoSoglie === "number" && righe.length > 0) {
        righe.push(`Da rispettare: ${v.minimoSoglie} su ${righe.length}`);
      }
      return righe;
    }
  }
  if (Array.isArray(valore)) {
    return valore.map((v) =>
      v !== null && typeof v === "object" && !Array.isArray(v)
        ? righeOggetto(v).join(", ")
        : testo(v),
    );
  }
  if (valore !== null && typeof valore === "object") return righeOggetto(valore);
  return [];
}
