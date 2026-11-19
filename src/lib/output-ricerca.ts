// Output strutturato di una Ricerca per Fonte: lo schema chiesto a Parallel e
// la sua validazione. Lo schema è versionato: la versione viaggia nei metadati
// della Ricerca, così un risultato arrivato dopo un cambio di schema non viene
// letto con le regole nuove.
// Vocabolario: vedi GLOSSARY.md

import { z } from "zod";
import { it } from "zod/locales";
import type { AttoCitato } from "./atto-citato";
import { dataPlausibile } from "./notizia";
import { normalizzaUrlNotizia, urlHttpValido } from "./url";

export const VERSIONE_OUTPUT = 1;

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

const outputRicerca = z.object({
  notizie: z
    .array(notiziaTrovata)
    .describe("Articoli pubblicati dalla fonte nel periodo richiesto; vuoto se non ce ne sono"),
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

// Una Notizia dell'output che non supera i controlli: si scarta da sola.
export type NotiziaScartata = { posizione: number; motivo: string };

export type EsitoOutputRicerca =
  | { ok: true; notizie: NotiziaTrovata[]; scartate: NotiziaScartata[] }
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

// Per la validazione basta l'elenco: ogni Notizia si controlla da sola.
const elencoNotizie = z.object({ notizie: z.array(z.unknown()) });

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
  return { ok: true, notizie, scartate };
}
