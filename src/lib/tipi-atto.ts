import { etichettaGiurisdizione, etichettaTipoAtto } from "./etichette";

// Tipi ammessi per Giurisdizione. "altro" vale per entrambe.
// Fonte unica per il database (enum in schema.ts) e per i moduli (#22).
export const TIPI_UE = ["regolamento", "direttiva", "decisione"] as const;
export const TIPI_ITALIA = [
  "legge",
  "decreto_legislativo",
  "decreto",
  "disegno_di_legge",
] as const;

export const TIPI_ATTO = [...TIPI_UE, ...TIPI_ITALIA, "altro"] as const;

export type TipoAtto = (typeof TIPI_ATTO)[number];
export type GiurisdizioneAtto = "ue" | "italia";

export function tipiAmmessi(giurisdizione: GiurisdizioneAtto): TipoAtto[] {
  return [...(giurisdizione === "ue" ? TIPI_UE : TIPI_ITALIA), "altro"];
}

export function tipoAmmesso(
  tipo: TipoAtto,
  giurisdizione: GiurisdizioneAtto,
): boolean {
  return tipiAmmessi(giurisdizione).includes(tipo);
}

export type EsitoValidazione = { ok: true } | { ok: false; errore: string };

export function validaTipoAtto(
  tipo: string | null | undefined,
  giurisdizione: GiurisdizioneAtto,
): EsitoValidazione {
  if (!tipo) return { ok: false, errore: "Il Tipo di atto è obbligatorio." };
  if (!(TIPI_ATTO as readonly string[]).includes(tipo)) {
    return { ok: false, errore: `Tipo di atto sconosciuto: ${tipo}.` };
  }
  if (!tipoAmmesso(tipo as TipoAtto, giurisdizione)) {
    return {
      ok: false,
      errore: `${etichettaTipoAtto[tipo as TipoAtto]} non è un Tipo valido per la Giurisdizione ${etichettaGiurisdizione[giurisdizione]}.`,
    };
  }
  return { ok: true };
}
