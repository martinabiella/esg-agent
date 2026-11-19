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
        "Identificativo ufficiale dell'atto se l'articolo lo riporta (numero CELEX, numero COM, numero e anno di legge, decreto o DDL), altrimenti null",
      ),
    titolo: z.string().describe("Titolo o nome dell'atto come citato nell'articolo"),
    giurisdizione: z
      .enum(["ue", "italia"])
      .nullable()
      .describe("ue per atti dell'Unione europea, italia per atti italiani, null se non è chiaro"),
  })
  .describe("Un atto normativo citato nell'articolo");

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
      .describe("Chi ha pubblicato l'articolo (testata, ente o istituzione), null se non è chiaro"),
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

export type EsitoOutputRicerca =
  | { ok: true; notizie: NotiziaTrovata[] }
  // Il testo compare agli utenti come motivo per cui la Fonte non è leggibile.
  | { ok: false; errore: string };

function testoOpzionale(testo: string | null): string | null {
  return testo?.trim() || null;
}

// Un campo dell'output che non va, per il motivo mostrato agli utenti.
type ProblemaOutput = { campo: string; messaggio: string };

const PROBLEMI_MOSTRATI = 3;

// "notizie.1.url: …": le posizioni partono da 1, per chi legge il motivo.
function motivoNonValido(problemi: readonly ProblemaOutput[]): string {
  const elenco = problemi
    .slice(0, PROBLEMI_MOSTRATI)
    .map((p) => (p.campo ? `${p.campo}: ${p.messaggio}` : p.messaggio))
    .join("; ");
  const altri = problemi.length - PROBLEMI_MOSTRATI;
  return `Il risultato di Parallel non rispetta lo schema (v${VERSIONE_OUTPUT}): ${elenco}${
    altri > 0 ? ` (e altri ${altri})` : ""
  }.`;
}

function campoDaPercorso(percorso: readonly PropertyKey[]): string {
  return percorso.map((p) => (typeof p === "number" ? String(p + 1) : String(p))).join(".");
}

const UN_GIORNO_MS = 24 * 60 * 60 * 1000;

// Quello che lo schema JSON di Parallel non sa esprimere (niente format né
// minLength). La data può essere domani: la Notizia è datata col fuso di chi
// pubblica, il server ragiona in UTC.
function problemiDiContenuto(notizie: z.infer<typeof outputRicerca>["notizie"], ora: Date): ProblemaOutput[] {
  const domani = new Date(ora.getTime() + UN_GIORNO_MS);
  return notizie.flatMap((n, i) => {
    const problemi: ProblemaOutput[] = [];
    const posizione = `notizie.${i + 1}`;
    if (!n.titolo.trim()) problemi.push({ campo: `${posizione}.titolo`, messaggio: "titolo vuoto" });
    if (!urlHttpValido(n.url.trim())) {
      problemi.push({ campo: `${posizione}.url`, messaggio: "atteso un URL assoluto http o https" });
    }
    const data = testoOpzionale(n.data);
    if (data !== null && !dataPlausibile(data, domani)) {
      problemi.push({ campo: `${posizione}.data`, messaggio: "attesa una data reale AAAA-MM-GG, non futura" });
    }
    return problemi;
  });
}

export function validaOutputRicerca(contenuto: unknown, ora: Date): EsitoOutputRicerca {
  const esito = outputRicerca.safeParse(contenuto, { error: it().localeError });
  if (!esito.success) {
    return {
      ok: false,
      errore: motivoNonValido(esito.error.issues.map((i) => ({ campo: campoDaPercorso(i.path), messaggio: i.message }))),
    };
  }
  const problemi = problemiDiContenuto(esito.data.notizie, ora);
  if (problemi.length > 0) return { ok: false, errore: motivoNonValido(problemi) };
  return {
    ok: true,
    notizie: esito.data.notizie.map((n) => ({
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
    })),
  };
}
