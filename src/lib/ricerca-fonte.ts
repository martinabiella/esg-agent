// Ricerca per Fonte: l'avvio su Parallel e l'elaborazione del webhook che ne
// porta il risultato (ADR 0002). Client Parallel e database arrivano come
// dipendenze: nei test si usano versioni finte.
// Vocabolario: vedi GLOSSARY.md

import { z } from "zod";
import type { esitoRicerca } from "../db/schema";
import { type AttoCatalogo, trovaAttoCitato } from "./atto-citato";
import type { TipoFonte } from "./fonte";
import { type NotiziaTrovata, VERSIONE_OUTPUT, schemaOutputParallel, validaOutputRicerca } from "./output-ricerca";
import { type ClientParallel, ErroreParallel, type RichiestaTaskRun } from "./parallel";

const GIORNI_PRIMA_RICERCA = 30;
const UN_GIORNO_MS = 24 * 60 * 60 * 1000;

// Processore della Task API: "core" regge output di media complessità (un
// elenco di Notizie con gli Atti citati) in pochi minuti.
const PROCESSORE = "core";

export type FonteRicerca = { id: number; nome: string; url: string; tipo: TipoFonte };

// Dall'enum esito_ricerca del database (import solo di tipo: i test non
// caricano il DB).
export type EsitoRicerca = (typeof esitoRicerca.enumValues)[number];

export type NuovaRicerca = {
  fonteId: number;
  avviataIl: Date;
  parallelRunId: string | null;
  esito: "in_corso" | "fallita";
  // Compare agli utenti come motivo: italiano leggibile, niente dettagli tecnici.
  errore: string | null;
};

// Una Notizia trovata dall'agente, pronta per il salvataggio.
export type NotiziaDaSalvare = {
  titolo: string;
  // Chi ha pubblicato la Notizia (colonna notizia.fonte): non è la Fonte monitorata.
  pubblicataDa: string;
  data: string | null;
  url: string;
  riassunto: string;
  segnalaNovita: boolean;
  atti: number[];
};

// Le letture e scritture sul database che servono alle Ricerche.
export interface ArchivioRicerche {
  // avviata_il dell'ultima Ricerca riuscita dopo l'ultimo cambio di URL.
  ultimaRicercaRiuscita(fonteId: number): Promise<Date | null>;
  registraRicerca(ricerca: NuovaRicerca): Promise<number>;
  ricercaPerRunId(runId: string): Promise<{ id: number; esito: EsitoRicerca } | null>;
  attiCatalogo(): Promise<AttoCatalogo[]>;
  // Atomica: salva le Notizie nuove (gli URL già presenti si saltano) con i
  // collegamenti e chiude la Ricerca come completata. null se la Ricerca non
  // era più in corso: nulla è stato scritto.
  completaRicerca(id: number, notizie: NotiziaDaSalvare[]): Promise<{ notizieCreate: number } | null>;
  // false se la Ricerca non era più in corso.
  segnaFallita(id: number, errore: string): Promise<boolean>;
}

export type DipendenzeRicerca = {
  client: ClientParallel;
  archivio: ArchivioRicerche;
  // Dove Parallel manda il webhook a fine run.
  urlWebhook: string;
  ora: () => Date;
};

// Data da cui cercare (after_date di Parallel, AAAA-MM-GG in UTC): il giorno in
// cui è stata avviata l'ultima Ricerca riuscita, altrimenti gli ultimi 30
// giorni. Un run fallito non sposta la finestra; il cambio di URL della Fonte
// lo gestisce ultimaRicercaRiuscita, che ignora le Ricerche precedenti.
export function finestraRicerca(ultimaRiuscitaAvviataIl: Date | null, ora: Date): string {
  const dal = ultimaRiuscitaAvviataIl ?? new Date(ora.getTime() - GIORNI_PRIMA_RICERCA * UN_GIORNO_MS);
  return dal.toISOString().slice(0, 10);
}

// Il dominio della Fonte, sottodomini compresi (source_policy di Parallel).
function dominio(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

function istruzioni(fonte: FonteRicerca, dal: string): string {
  const tipo = fonte.tipo === "ufficiale" ? "una fonte ufficiale" : "una fonte editoriale";
  return [
    `Sei un analista di normativa di sostenibilità (ESG) per un team di consulenza italiano.`,
    `Esamina «${fonte.nome}» (${fonte.url}), ${tipo}.`,
    `Elenca gli articoli, i comunicati e le pagine pubblicati da questa fonte dal ${dal} a oggi che riguardano normativa di sostenibilità dell'Unione europea o italiana: proposte, direttive, regolamenti, decisioni, leggi, decreti, disegni di legge, il loro iter, recepimenti, rinvii e modifiche.`,
    `Ignora i contenuti che non riguardano normativa di sostenibilità.`,
    `Per ogni articolo riporta gli atti normativi citati, con l'identificativo ufficiale quando l'articolo lo indica.`,
  ].join("\n");
}

export type EsitoAvvio =
  | { esito: "avviata"; ricercaId: number; runId: string }
  | { esito: "fallita"; errore: string };

// Il motivo compare agli utenti nella pagina Fonti: niente messaggi tecnici.
// I dettagli restano nel log del server.
function motivoAvvioFallito(e: unknown): string {
  if (!(e instanceof ErroreParallel)) return "Parallel non è raggiungibile: la Ricerca non è partita.";
  const motivo =
    e.stato === 401 || e.stato === 403
      ? "chiave API rifiutata"
      : e.stato === 402
        ? "credito esaurito"
        : e.stato === 429
          ? "troppe richieste, riprova più tardi"
          : e.stato >= 500
            ? "servizio non disponibile"
            : "richiesta non valida";
  return `Parallel non ha avviato la Ricerca: ${motivo}.`;
}

export async function avviaRicercaPerFonte(fonte: FonteRicerca, deps: DipendenzeRicerca): Promise<EsitoAvvio> {
  const avviataIl = deps.ora();
  const ultimaRiuscita = await deps.archivio.ultimaRicercaRiuscita(fonte.id);
  const dal = finestraRicerca(ultimaRiuscita, avviataIl);
  // Fuori dal try: un errore di configurazione (URL del webhook mancante) non
  // è un problema di Parallel e non va registrato come tale.
  const richiesta: RichiestaTaskRun = {
    input: istruzioni(fonte, dal),
    processor: PROCESSORE,
    task_spec: { output_schema: { type: "json", json_schema: schemaOutputParallel() } },
    source_policy: { include_domains: [dominio(fonte.url)], after_date: dal },
    metadata: { fonte_id: fonte.id, fonte_nome: fonte.nome, versione_schema: VERSIONE_OUTPUT },
    webhook: { url: deps.urlWebhook, event_types: ["task_run.status"] },
  };

  let runId: string;
  try {
    ({ runId } = await deps.client.avviaTaskRun(richiesta));
  } catch (e) {
    console.error(`Avvio della Ricerca per la Fonte ${fonte.id} non riuscito`, e);
    const errore = motivoAvvioFallito(e);
    await deps.archivio.registraRicerca({ fonteId: fonte.id, avviataIl, parallelRunId: null, esito: "fallita", errore });
    return { esito: "fallita", errore };
  }

  const ricercaId = await deps.archivio.registraRicerca({
    fonteId: fonte.id,
    avviataIl,
    parallelRunId: runId,
    esito: "in_corso",
    errore: null,
  });
  return { esito: "avviata", ricercaId, runId };
}

export type EsitoAvvioFonte = { fonteId: number } & EsitoAvvio;

// Avvia una Ricerca per ogni Fonte, una dopo l'altra: l'errore di una Fonte,
// anche imprevisto (per esempio il database), non ferma le altre.
export async function avviaRicerchePerFonti(
  fonti: readonly FonteRicerca[],
  deps: DipendenzeRicerca,
): Promise<EsitoAvvioFonte[]> {
  const esiti: EsitoAvvioFonte[] = [];
  for (const fonte of fonti) {
    try {
      esiti.push({ fonteId: fonte.id, ...(await avviaRicercaPerFonte(fonte, deps)) });
    } catch (e) {
      console.error(`Ricerca per la Fonte ${fonte.id} non avviata`, e);
      esiti.push({ fonteId: fonte.id, esito: "fallita", errore: "Errore imprevisto: la Ricerca non è partita." });
    }
  }
  return esiti;
}

// ---- Webhook di fine run ----

export type EsitoWebhook =
  // notizieScartate: Notizie dell'output che non superavano i controlli.
  | { esito: "completata"; notizieCreate: number; notizieScartate: number }
  | { esito: "fallita"; errore: string }
  // Evento che non riguarda una Ricerca da chiudere: si conferma e basta.
  | { esito: "ignorato"; motivo: string }
  // Run che il log non conosce: può arrivare prima che l'avvio l'abbia
  // registrato, quindi Parallel deve riprovare.
  | { esito: "sconosciuta" };

const GIA_ELABORATA: EsitoWebhook = { esito: "ignorato", motivo: "Ricerca già elaborata" };

// Una Notizia ripetuta nell'output (stesso URL normalizzato) conta una volta.
function senzaDoppioni(notizie: readonly NotiziaTrovata[]): NotiziaTrovata[] {
  const visti = new Set<string>();
  return notizie.filter((n) => !visti.has(n.url) && visti.add(n.url));
}

// Collega gli Atti riconosciuti con certezza. Un Atto citato ma assente dal
// catalogo, o ambiguo, fa segnalare una novità: Parallel non conosce il
// catalogo, quindi lo decide il codice. Un Atto Non rilevante non si collega e
// non fa scattare la segnalazione; una Notizia che cita solo Atti Non rilevanti
// non segnala mai una novità, così non entra nell'Avviso di conferma.
// «Pubblicata da»: l'editore indicato dall'agente, altrimenti il nome della
// Fonte (o, se manca anche quello, il dominio della Notizia).
function notizieDaSalvare(
  notizie: readonly NotiziaTrovata[],
  atti: readonly AttoCatalogo[],
  nomeFonte: string,
): NotiziaDaSalvare[] {
  return senzaDoppioni(notizie).map((n) => {
    const esiti = n.attiCitati.map((c) => trovaAttoCitato(c, atti));
    const collegati = esiti.flatMap((e) => (e.esito === "collegato" ? [e.attoId] : []));
    const daControllare = esiti.some((e) => e.esito === "assente" || e.esito === "ambiguo");
    const soloNonRilevanti = esiti.length > 0 && esiti.every((e) => e.esito === "non_rilevante");
    return {
      titolo: n.titolo,
      pubblicataDa: n.pubblicataDa ?? (nomeFonte || new URL(n.url).hostname),
      data: n.data,
      url: n.url,
      riassunto: n.riassunto,
      segnalaNovita: !soloNonRilevanti && (n.segnalaNovita || daControllare),
      atti: [...new Set(collegati)],
    };
  });
}

// Payload del webhook: { timestamp, type, data: TaskRun }. Solo i campi usati.
const eventoStato = z.object({
  type: z.literal("task_run.status"),
  data: z.object({
    run_id: z.string().min(1),
    status: z.string(),
    error: z.object({ message: z.string().nullish() }).nullish(),
  }),
});

// Stati finali di un task run: gli altri (queued, running…) non chiudono nulla.
const STATI_CONCLUSI = ["completed", "failed", "cancelled"] as const;
type StatoConcluso = (typeof STATI_CONCLUSI)[number];

function statoConcluso(stato: string): stato is StatoConcluso {
  return (STATI_CONCLUSI as readonly string[]).includes(stato);
}

// Il messaggio di Parallel (in inglese, tecnico) resta nel log del server.
function motivoRunNonCompletato(stato: Exclude<StatoConcluso, "completed">): string {
  return stato === "cancelled"
    ? "La Ricerca è stata annullata su Parallel."
    : "Parallel non è riuscito a completare la Ricerca.";
}

// Elabora un evento task_run.status già verificato (firma). Il contenuto
// arriva dalla Task API, non dal corpo del webhook. Gli errori imprevisti
// (database, rete) si propagano: la rotta risponde 500 e Parallel riprova.
export async function elaboraWebhook(evento: unknown, deps: DipendenzeRicerca): Promise<EsitoWebhook> {
  const letto = eventoStato.safeParse(evento);
  if (!letto.success) return { esito: "ignorato", motivo: "Evento non riconosciuto" };
  const { run_id: runId, status, error } = letto.data.data;
  if (!statoConcluso(status)) return { esito: "ignorato", motivo: `Run non concluso (${status})` };

  const ricerca = await deps.archivio.ricercaPerRunId(runId);
  if (!ricerca) return { esito: "sconosciuta" };
  if (ricerca.esito !== "in_corso") return GIA_ELABORATA;

  const fallita = async (errore: string): Promise<EsitoWebhook> => {
    const chiusa = await deps.archivio.segnaFallita(ricerca.id, errore);
    return chiusa ? { esito: "fallita", errore } : GIA_ELABORATA;
  };

  if (status !== "completed") {
    console.error(`Run Parallel ${runId} concluso con stato ${status}`, error?.message ?? "");
    return fallita(motivoRunNonCompletato(status));
  }

  const risultato = await deps.client.risultatoTaskRun(runId);
  if (risultato.metadata?.versione_schema !== VERSIONE_OUTPUT) {
    return fallita(
      `La Ricerca è stata avviata con un'altra versione dello schema dei risultati (ora v${VERSIONE_OUTPUT}): il risultato non è stato letto.`,
    );
  }
  const output = validaOutputRicerca(risultato.contenuto, deps.ora());
  if (!output.ok) return fallita(output.errore);
  for (const s of output.scartate) {
    console.warn(`Run Parallel ${runId}: Notizia ${s.posizione} scartata (${s.motivo})`);
  }

  // Il nome viaggia nei metadati del run: la Fonte potrebbe essere stata
  // eliminata o rinominata nel frattempo.
  const nomeFonte = String(risultato.metadata?.fonte_nome ?? "");
  const atti = await deps.archivio.attiCatalogo();
  // Un altro recapito dello stesso evento può averla chiusa nel frattempo.
  const scritto = await deps.archivio.completaRicerca(ricerca.id, notizieDaSalvare(output.notizie, atti, nomeFonte));
  return scritto
    ? { esito: "completata", notizieCreate: scritto.notizieCreate, notizieScartate: output.scartate.length }
    : GIA_ELABORATA;
}
