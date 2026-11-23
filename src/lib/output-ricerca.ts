// Output strutturato di una Ricerca per Fonte: lo schema chiesto a Parallel e
// la sua validazione. Lo schema è versionato: la versione viaggia nei metadati
// della Ricerca, così un risultato arrivato dopo un cambio di schema non viene
// letto con le regole nuove.
// Vocabolario: vedi GLOSSARY.md

import { z } from "zod";
import { it } from "zod/locales";
import { STATI_ATTO, type SogliaModulo } from "./atto";
import type { AttoCitato } from "./atto-citato";
import { dataPlausibile } from "./notizia";
import { TIPI_ATTO, type GiurisdizioneAtto, type TipoAtto } from "./tipi-atto";
import { normalizzaUrlNotizia, urlHttpValido } from "./url";

// v2: aggiunge i candidati Atto (atti_candidati).
export const VERSIONE_OUTPUT = 2;
// La v1 è una v2 senza candidati: i run avviati con lei si leggono ancora.
export const VERSIONI_LEGGIBILI: readonly number[] = [1, 2];

const attoCitato = z
  .object({
    identificativo_ufficiale: z
      .string()
      .nullable()
      .describe(
        "Identificativo ufficiale dell'atto: numero CELEX per gli atti UE adottati (es. 32022L2464 per la CSRD), numero COM per le proposte UE, numero e anno per leggi, decreti e DDL italiani. Indicalo anche se l'articolo non lo riporta, ma solo se ne sei certo; altrimenti null",
      ),
    titolo: z.string().describe("Titolo o nome dell'atto come citato nell'articolo"),
    giurisdizione: z
      .enum(["ue", "italia"])
      .nullable()
      .describe("ue per atti dell'Unione europea, italia per atti italiani, null se non è chiaro"),
  })
  .describe(
    "Un atto normativo citato nell'articolo (direttiva, regolamento, decisione, atto delegato, legge, decreto, disegno di legge o una loro proposta); non rapporti, consultazioni, bozze di standard o documenti di lavoro",
  );

const notiziaTrovata = z
  .object({
    titolo: z.string().describe("Titolo dell'articolo, come pubblicato"),
    url: z.string().describe("URL assoluto (http o https) della pagina dell'articolo"),
    data: z
      .string()
      .nullable()
      .describe("Data di pubblicazione nel formato AAAA-MM-GG, null se l'articolo non la indica"),
    pubblicata_da: z
      .string()
      .nullable()
      .describe(
        "Nome breve di chi ha pubblicato l'articolo: la testata o l'ente (es. «Commissione europea», «Il Sole 24 Ore»), senza direzioni o uffici interni; null se non è chiaro",
      ),
    riassunto: z
      .string()
      .describe("Riassunto in italiano di 2-4 frasi: di quale normativa parla, cosa cambia e per chi"),
    segnala_novita: z
      .boolean()
      .describe(
        "true se l'articolo riporta cambiamenti in una normativa (nuovo stato dell'iter, nuove date, obblighi modificati) o discute una normativa nuova; false se è solo un commento o un riepilogo",
      ),
    atti_citati: z.array(attoCitato).describe("Atti normativi citati nell'articolo; vuoto se nessuno"),
  })
  .describe("Un articolo sulla normativa di sostenibilità");

const sogliaCandidato = z
  .object({
    campo: z.enum(["dipendenti", "fatturato", "paesi"]).describe("Grandezza su cui si applica la soglia"),
    minimo: z
      .string()
      .nullable()
      .describe("Valore minimo (dipendenti: numero intero; fatturato: euro, solo cifre); null se non c'è"),
    massimo: z.string().nullable().describe("Valore massimo, stesso formato del minimo; null se non c'è"),
    paesi: z
      .array(z.string())
      .describe("Solo per campo paesi: codici ISO a due lettere (o «UE» da solo); altrimenti vuoto"),
  })
  .describe("Una soglia che rende la norma applicabile a un'impresa");

const attoCandidato = z
  .object({
    identificativo_ufficiale: z
      .string()
      .nullable()
      .describe(
        "Identificativo ufficiale dell'atto (CELEX per gli atti UE adottati, numero COM per le proposte, numero e anno per atti italiani), solo se ne sei certo; altrimenti null",
      ),
    titolo: z.string().describe("Titolo ufficiale dell'atto"),
    giurisdizione: z.enum(["ue", "italia"]).describe("ue per atti dell'Unione europea, italia per atti italiani"),
    tipo: z
      .enum(TIPI_ATTO)
      .describe(
        "Tipo dell'atto. UE: regolamento, direttiva, decisione. Italia: legge, decreto_legislativo, decreto, disegno_di_legge. altro se nessuno calza",
      ),
    stato: z.enum(STATI_ATTO).describe("Stato attuale dell'iter dell'atto"),
    data_stato: z
      .string()
      .nullable()
      .describe("Data in cui l'atto ha raggiunto lo stato indicato, AAAA-MM-GG; null se non la conosci"),
    url_testo: z.string().nullable().describe("URL del testo ufficiale dell'atto; null se non lo trovi"),
    summary: z.string().describe("Riassunto in italiano di 2-4 frasi: cosa prevede l'atto e per chi"),
    criteri_testo: z
      .string()
      .describe("A chi si applica l'atto, in italiano e in poche frasi; vuoto se non è chiaro"),
    soglie: z.array(sogliaCandidato).describe("Soglie di applicabilità, solo se numeriche e certe; vuoto altrimenti"),
    tutti_i_settori: z.boolean().describe("true solo se l'atto si applica a tutti i settori economici"),
    settori: z
      .array(z.string())
      .describe("Nomi dei settori dell'elenco fornito nelle istruzioni a cui l'atto si applica; mai nomi nuovi"),
    temi: z.array(z.string()).describe("Da 1 a 3 temi brevi (es. «Rendicontazione di sostenibilità»)"),
    da_notizia: z
      .string()
      .nullable()
      .describe("URL dell'articolo da cui hai preso i dati dell'atto; null se vengono da altrove"),
    discrepanze: z
      .array(z.string())
      .describe(
        "Una frase per ogni dato su cui gli articoli trovati sono in disaccordo (es. Stato), con la fonte di ciascuna versione; vuoto se concordano",
      ),
  })
  .describe(
    "Un atto normativo da aggiungere al catalogo: direttiva, regolamento, decisione, legge, decreto o disegno di legge, non rapporti né documenti di lavoro",
  );

const outputRicerca = z.object({
  notizie: z
    .array(notiziaTrovata)
    .describe("Articoli pubblicati dalla fonte nel periodo richiesto; vuoto se non ce ne sono"),
  atti_candidati: z
    .array(attoCandidato)
    .describe(
      "Atti normativi con identificativo ufficiale citati negli articoli, uno per atto anche se citato più volte; vuoto se nessuno",
    ),
});

// Il JSON schema per task_spec.output_schema di Parallel, ricavato dallo stesso
// schema che valida il risultato. Senza "$schema": non serve a Parallel.
export function schemaOutputParallel(): Record<string, unknown> {
  const { $schema, ...schema } = z.toJSONSchema(outputRicerca);
  void $schema;
  return schema;
}

export type NotiziaTrovata = {
  titolo: string;
  url: string;
  data: string | null;
  pubblicataDa: string | null;
  riassunto: string;
  segnalaNovita: boolean;
  attiCitati: AttoCitato[];
};

// Un candidato Atto come lo propone l'agente, ripulito. Coerenza tra
// Giurisdizione e Tipo, date e soglie le controlla poi validaAtto
// (src/lib/atti-nuovi.ts).
export type AttoCandidato = {
  identificativoUfficiale: string | null;
  titolo: string;
  giurisdizione: GiurisdizioneAtto;
  tipo: TipoAtto;
  stato: (typeof STATI_ATTO)[number];
  dataStato: string | null;
  urlTesto: string | null;
  summary: string;
  criteriTesto: string;
  soglie: SogliaModulo[];
  tuttiISettori: boolean;
  settori: string[];
  temi: string[];
  daNotizia: string | null;
  discrepanze: string[];
};

// Una Notizia o un candidato dell'output che non supera i controlli: si scarta da solo.
export type NotiziaScartata = { posizione: number; motivo: string };

export type EsitoOutputRicerca =
  | {
      ok: true;
      notizie: NotiziaTrovata[];
      scartate: NotiziaScartata[];
      candidati: AttoCandidato[];
      candidatiScartati: NotiziaScartata[];
    }
  // Il testo compare agli utenti come motivo per cui la Fonte non è leggibile.
  | { ok: false; errore: string };

function testoOpzionale(testo: string | null): string | null {
  return testo?.trim() || null;
}

// Un campo dell'output che non va.
type ProblemaOutput = { campo: string; messaggio: string };

const PROBLEMI_MOSTRATI = 3;

// "notizie.1.url: …; notizie.1.data: …": le posizioni partono da 1, per chi legge.
function elencoProblemi(problemi: readonly ProblemaOutput[]): string {
  const elenco = problemi
    .slice(0, PROBLEMI_MOSTRATI)
    .map((p) => (p.campo ? `${p.campo}: ${p.messaggio}` : p.messaggio))
    .join("; ");
  const altri = problemi.length - PROBLEMI_MOSTRATI;
  return altri > 0 ? `${elenco} (e altri ${altri})` : elenco;
}

function campoDaPercorso(prefisso: string, percorso: readonly PropertyKey[]): string {
  const parti = percorso.map((p) => (typeof p === "number" ? String(p + 1) : String(p)));
  return [prefisso, ...parti].filter(Boolean).join(".");
}

function problemiDiStruttura(errore: z.ZodError, prefisso: string): ProblemaOutput[] {
  return errore.issues.map((i) => ({ campo: campoDaPercorso(prefisso, i.path), messaggio: i.message }));
}

const UN_GIORNO_MS = 24 * 60 * 60 * 1000;

// Quello che lo schema JSON di Parallel non sa esprimere (niente format né
// minLength). La data può essere domani: la Notizia è datata col fuso di chi
// pubblica, il server ragiona in UTC.
function problemiDiContenuto(n: z.infer<typeof notiziaTrovata>, prefisso: string, domani: Date): ProblemaOutput[] {
  const problemi: ProblemaOutput[] = [];
  if (!n.titolo.trim()) problemi.push({ campo: `${prefisso}.titolo`, messaggio: "titolo vuoto" });
  if (!urlHttpValido(n.url.trim())) {
    problemi.push({ campo: `${prefisso}.url`, messaggio: "atteso un URL assoluto http o https" });
  }
  const data = testoOpzionale(n.data);
  if (data !== null && !dataPlausibile(data, domani)) {
    problemi.push({ campo: `${prefisso}.data`, messaggio: "attesa una data reale AAAA-MM-GG, non futura" });
  }
  return problemi;
}

function notiziaPulita(n: z.infer<typeof notiziaTrovata>): NotiziaTrovata {
  return {
    titolo: n.titolo.trim(),
    url: normalizzaUrlNotizia(n.url),
    data: testoOpzionale(n.data),
    pubblicataDa: testoOpzionale(n.pubblicata_da),
    riassunto: n.riassunto.trim(),
    segnalaNovita: n.segnala_novita,
    attiCitati: n.atti_citati.map((a) => ({
      identificativoUfficiale: testoOpzionale(a.identificativo_ufficiale),
      titolo: a.titolo.trim(),
      giurisdizione: a.giurisdizione,
    })),
  };
}

function elencoTesti(valori: readonly string[]): string[] {
  return valori.map((v) => v.trim()).filter(Boolean);
}

function candidatoPulito(c: z.infer<typeof attoCandidato>): AttoCandidato {
  return {
    identificativoUfficiale: testoOpzionale(c.identificativo_ufficiale),
    titolo: c.titolo.trim(),
    giurisdizione: c.giurisdizione,
    tipo: c.tipo,
    stato: c.stato,
    dataStato: testoOpzionale(c.data_stato),
    urlTesto: testoOpzionale(c.url_testo),
    summary: c.summary.trim(),
    criteriTesto: c.criteri_testo.trim(),
    soglie: c.soglie.map((s) => ({
      campo: s.campo,
      minimo: s.minimo?.trim() ?? "",
      massimo: s.massimo?.trim() ?? "",
      paesi: elencoTesti(s.paesi),
    })),
    tuttiISettori: c.tutti_i_settori,
    settori: elencoTesti(c.settori),
    temi: elencoTesti(c.temi),
    daNotizia: c.da_notizia?.trim() && urlHttpValido(c.da_notizia.trim()) ? normalizzaUrlNotizia(c.da_notizia) : null,
    discrepanze: elencoTesti(c.discrepanze),
  };
}

// Per la validazione bastano gli elenchi: ogni Notizia e ogni candidato si
// controllano da soli. Un output senza atti_candidati vale come senza candidati.
const elencoNotizie = z.object({ notizie: z.array(z.unknown()), atti_candidati: z.array(z.unknown()).optional() });

// Senza l'elenco delle Notizie l'output non è valido e la Ricerca fallisce. Una
// Notizia che non supera i controlli (struttura, URL, titolo, data) si scarta
// da sola: le altre si salvano.
export function validaOutputRicerca(contenuto: unknown, ora: Date): EsitoOutputRicerca {
  const errori = { error: it().localeError };
  const elenco = elencoNotizie.safeParse(contenuto, errori);
  if (!elenco.success) {
    return {
      ok: false,
      errore: `Il risultato di Parallel non rispetta lo schema (v${VERSIONE_OUTPUT}): ${elencoProblemi(
        problemiDiStruttura(elenco.error, ""),
      )}.`,
    };
  }

  const domani = new Date(ora.getTime() + UN_GIORNO_MS);
  const notizie: NotiziaTrovata[] = [];
  const scartate: NotiziaScartata[] = [];
  elenco.data.notizie.forEach((grezza, i) => {
    const posizione = i + 1;
    const prefisso = `notizie.${posizione}`;
    const letta = notiziaTrovata.safeParse(grezza, errori);
    const problemi = letta.success
      ? problemiDiContenuto(letta.data, prefisso, domani)
      : problemiDiStruttura(letta.error, prefisso);
    if (letta.success && problemi.length === 0) notizie.push(notiziaPulita(letta.data));
    else scartate.push({ posizione, motivo: elencoProblemi(problemi) });
  });

  const candidati: AttoCandidato[] = [];
  const candidatiScartati: NotiziaScartata[] = [];
  (elenco.data.atti_candidati ?? []).forEach((grezzo, i) => {
    const posizione = i + 1;
    const letto = attoCandidato.safeParse(grezzo, errori);
    if (letto.success) candidati.push(candidatoPulito(letto.data));
    else {
      candidatiScartati.push({
        posizione,
        motivo: elencoProblemi(problemiDiStruttura(letto.error, `atti_candidati.${posizione}`)),
      });
    }
  });
  return { ok: true, notizie, scartate, candidati, candidatiScartati };
}
