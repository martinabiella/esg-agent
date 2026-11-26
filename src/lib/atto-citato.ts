// Regola di deduplica degli Atti: riconosce nel catalogo un Atto citato
// dall'agente (in una Notizia, o in un nuovo Atto proposto). Il match deve
// essere certo: nel dubbio nessun collegamento.
// Vocabolario: vedi GLOSSARY.md

import type { GiurisdizioneAtto } from "./tipi-atto";

// Come l'agente cita un Atto.
export type AttoCitato = {
  identificativoUfficiale: string | null;
  titolo: string;
  giurisdizione: GiurisdizioneAtto | null;
};

// Gli Atti del catalogo, con quanto serve al confronto.
export type AttoCatalogo = {
  id: number;
  titolo: string;
  identificativoUfficiale: string | null;
  giurisdizione: GiurisdizioneAtto;
  nonRilevante: boolean;
};

export type EsitoAttoCitato =
  | { esito: "collegato"; attoId: number }
  // Riconosciuto, ma una persona lo ha escluso: non si collega.
  | { esito: "non_rilevante"; attoId: number }
  | { esito: "assente" }
  // Più Atti possibili: nessun collegamento.
  | { esito: "ambiguo" };

// Prefissi di leggi, decreti-legge e decreti legislativi: numero e anno sono
// progressivi nell'anno per tutti e tre, quindi «D.L. 177/2026» e «177/2026»
// sono lo stesso Atto. Non si tolgono «D.P.R.» (serie di numeri a parte),
// «A.C.» e «A.S.» (Camera e Senato numerano per conto loro) né «Direttiva» e
// «Regolamento» (stesso numero UE, Atti diversi). Dopo il prefisso si ignora
// un eventuale «n.».
const PREFISSO_ITALIANO =
  /^(?:decreto[\s-]*legislativo|decreto[\s-]*legge|legge|d\.?\s*lgs\.?|d\.?\s*l\.?|l\.?)\s*(?:n(?:r|\.|umero)?\.?\s*)?(?=\d)/i;
// «final», «definitivo» e «def.» sono la stessa proposta della Commissione.
const SUFFISSO_PROPOSTA = /\s+(?:final|definitivo|def\.?)$/i;

// Grafia esatta: solo spazi e maiuscole, come l'indice del DB.
function chiaveEsatta(identificativo: string): string {
  return identificativo.replace(/\s+/g, "").toUpperCase();
}

// Chiave per riconoscere lo stesso Atto scritto in modi diversi. L'indice del
// DB è più stretto (solo spazi e maiuscole) e non vede queste varianti: se due
// Ricerche in contemporanea scrivono lo stesso Atto con grafie diverse, ne
// nascono due.
export function chiaveIdentificativo(identificativo: string): string {
  return identificativo
    .trim()
    .replace(PREFISSO_ITALIANO, "")
    .replace(SUFFISSO_PROPOSTA, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

// Solo lettere e cifre, minuscole e senza accenti: spazi e punteggiatura non
// contano, così "D.Lgs.", "D. Lgs." e "Dlgs" coincidono.
// "Direttiva (UE) 2022/2464 – CSRD" → "direttivaue20222464csrd".
export function chiaveTitoloAtto(titolo: string): string {
  return titolo
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function esitoPer(trovati: readonly AttoCatalogo[]): EsitoAttoCitato {
  if (trovati.length === 0) return { esito: "assente" };
  if (trovati.length > 1) return { esito: "ambiguo" };
  const [atto] = trovati;
  return atto.nonRilevante
    ? { esito: "non_rilevante", attoId: atto.id }
    : { esito: "collegato", attoId: atto.id };
}

// Prima l'identificativo ufficiale, poi titolo normalizzato più Giurisdizione.
// Se l'agente indica un identificativo che il catalogo non ha, il titolo può
// riconoscere solo un Atto senza identificativo: uno con un identificativo
// diverso è un altro Atto.
export function trovaAttoCitato(citato: AttoCitato, atti: readonly AttoCatalogo[]): EsitoAttoCitato {
  const identificativo = citato.identificativoUfficiale?.trim();
  if (identificativo) {
    // Prima la grafia esatta: un Atto del catalogo scritto come la citazione
    // vince sempre, anche se un altro ha la stessa chiave allargata.
    const esatta = chiaveEsatta(identificativo);
    const identici = atti.filter(
      (a) => a.identificativoUfficiale !== null && chiaveEsatta(a.identificativoUfficiale) === esatta,
    );
    if (identici.length > 0) return esitoPer(identici);

    const chiave = chiaveIdentificativo(identificativo);
    const trovati = atti.filter(
      (a) => a.identificativoUfficiale !== null && chiaveIdentificativo(a.identificativoUfficiale) === chiave,
    );
    if (trovati.length > 0) return esitoPer(trovati);
  }

  const titolo = chiaveTitoloAtto(citato.titolo);
  if (!titolo || citato.giurisdizione === null) return { esito: "assente" };
  return esitoPer(
    atti.filter(
      (a) =>
        a.giurisdizione === citato.giurisdizione &&
        chiaveTitoloAtto(a.titolo) === titolo &&
        (!identificativo || a.identificativoUfficiale === null),
    ),
  );
}
