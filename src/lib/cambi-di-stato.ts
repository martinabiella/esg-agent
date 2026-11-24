// Quali cambi di Stato riportati dall'agente si applicano agli Atti del
// catalogo. Pura: la scrittura atomica sta in src/db/ricerche.ts.
// Vocabolario: vedi GLOSSARY.md

import type { AttoCatalogo } from "./atto-citato";
import { trovaAttoCitato } from "./atto-citato";
import type { TipoFonte } from "./fonte";
import type { CambioDiStato } from "./output-ricerca";

// Lo Stato di un Atto e la data dell'ultima voce del suo storico (null se lo
// storico è vuoto, come per gli Atti creati dall'agente).
export type StatoAtto = { attoId: number; stato: CambioDiStato["stato"]; ultimaDataStato: string | null };

export type CambioApplicato = { attoId: number; stato: CambioDiStato["stato"]; data: string };

// Un cambio che non si applica: il motivo va nel log del server, non alla UI.
export type CambioIgnorato = { posizione: number; identificativo: string; motivo: string };

export type DecisioneCambiDiStato = { daApplicare: CambioApplicato[]; ignorati: CambioIgnorato[] };

// Si applica solo il cambio di una Fonte ufficiale, su un Atto riconosciuto con
// certezza dall'identificativo, non Non rilevante né abrogato, con uno Stato
// diverso dall'attuale e una data posteriore all'ultima dello storico (un ritorno
// a uno Stato precedente vale, se più recente). I cambi dello stesso run si
// applicano in ordine di data, ciascuno sullo Stato lasciato dal precedente.
export function decidiCambiDiStato(
  cambi: readonly CambioDiStato[],
  atti: readonly AttoCatalogo[],
  stati: readonly StatoAtto[],
  tipoFonte: TipoFonte,
): DecisioneCambiDiStato {
  const daApplicare: CambioApplicato[] = [];
  const ignorati: CambioIgnorato[] = [];
  const correnti = new Map(stati.map((s) => [s.attoId, { stato: s.stato, data: s.ultimaDataStato }]));

  const inOrdine = cambi
    .map((c, i) => ({ c, posizione: i + 1 }))
    .sort((a, b) => a.c.data.localeCompare(b.c.data) || a.posizione - b.posizione);

  for (const { c, posizione } of inOrdine) {
    const ignora = (motivo: string) => ignorati.push({ posizione, identificativo: c.identificativoUfficiale, motivo });
    if (tipoFonte !== "ufficiale") {
      ignora("la Fonte non è ufficiale");
      continue;
    }
    const trovato = trovaAttoCitato(
      { identificativoUfficiale: c.identificativoUfficiale, titolo: "", giurisdizione: null },
      atti,
    );
    if (trovato.esito !== "collegato") {
      ignora(
        trovato.esito === "non_rilevante" ? "Atto Non rilevante" : trovato.esito === "ambiguo" ? "Atto ambiguo" : "Atto non in catalogo",
      );
      continue;
    }
    const attuale = correnti.get(trovato.attoId);
    if (!attuale) {
      ignora("Stato dell'Atto sconosciuto");
      continue;
    }
    if (attuale.stato === "abrogato") {
      ignora("Atto già abrogato");
      continue;
    }
    if (attuale.stato === c.stato) {
      ignora("lo Stato è già quello");
      continue;
    }
    if (attuale.data !== null && c.data <= attuale.data) {
      ignora("data non successiva all'ultimo Stato registrato");
      continue;
    }
    correnti.set(trovato.attoId, { stato: c.stato, data: c.data });
    daApplicare.push({ attoId: trovato.attoId, stato: c.stato, data: c.data });
  }
  return { daApplicare, ignorati };
}
