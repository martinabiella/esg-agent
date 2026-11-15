// Vocabolario: vedi GLOSSARY.md (Override, Applicabilità)

import type { Applicabilita } from "./applicabilita";

export type EsitoOverride = "applicabile" | "non_applicabile";

export const ESITI_OVERRIDE: readonly EsitoOverride[] = ["applicabile", "non_applicabile"];

export type InputOverride = { esito?: string | null; motivazione?: string | null };

export type ErroriOverride = Partial<Record<"esito" | "motivazione", string>>;

export type EsitoValidazioneOverride =
  | { ok: true; valori: { esito: EsitoOverride; motivazione: string } }
  | { ok: false; errori: ErroriOverride };

export function validaOverride(input: InputOverride): EsitoValidazioneOverride {
  const errori: ErroriOverride = {};
  const esito = ESITI_OVERRIDE.find((e) => e === input.esito);
  if (!esito) errori.esito = "Scegli applicabile o non applicabile.";
  const motivazione = (input.motivazione ?? "").trim();
  if (!motivazione) errori.motivazione = "La motivazione è obbligatoria.";
  if (!esito || Object.keys(errori).length > 0) return { ok: false, errori };
  return { ok: true, valori: { esito, motivazione } };
}

// L'Override sostituisce l'Applicabilità calcolata per la coppia Cliente–Atto.
export function applicabilitaEffettiva(
  calcolata: Applicabilita,
  override: { esito: EsitoOverride } | null | undefined,
): Applicabilita {
  return override ? override.esito : calcolata;
}

// L'Atto è stato modificato dopo la decisione: i Criteri potrebbero essere cambiati.
export function criteriModificatiDopo(decisoIl: Date, attoAggiornatoIl: Date): boolean {
  return attoAggiornatoIl.getTime() > decisoIl.getTime();
}
