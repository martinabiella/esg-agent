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

export function righeSoglie(valore: unknown): string[] {
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
