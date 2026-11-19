// Integrazione con Parallel (Task API asincrona con webhook).
// Documentazione: https://docs.parallel.ai/task-api/webhooks e
// https://docs.parallel.ai/resources/webhook-setup

import { createHmac, timingSafeEqual } from "node:crypto";

// ---- Firma dei webhook (Standard Webhooks) ----
// HMAC-SHA256 su "<webhook-id>.<webhook-timestamp>.<corpo>", con la chiave
// ottenuta decodificando in base64 il segreto senza il prefisso "whsec_".
// L'header webhook-signature può contenere più firme "v1,<base64>" separate da
// spazi (durante la rotazione del segreto): basta che una corrisponda.

export type IntestazioniWebhook = {
  id: string | null;
  timestamp: string | null;
  firma: string | null;
};

// webhook-timestamp è l'istante del tentativo (a ogni retry cambia): oltre
// questa distanza da adesso la richiesta è una ripetizione e si rifiuta.
const TOLLERANZA_SECONDI = 5 * 60;

function chiaveFirma(segreto: string): Buffer {
  return Buffer.from(segreto.startsWith("whsec_") ? segreto.slice("whsec_".length) : segreto, "base64");
}

export function verificaFirmaWebhook(
  segreto: string,
  intestazioni: IntestazioniWebhook,
  corpo: string | Uint8Array,
  ora: Date,
): boolean {
  const { id, timestamp, firma } = intestazioni;
  if (!id || !timestamp || !firma || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(ora.getTime() / 1000 - Number(timestamp)) > TOLLERANZA_SECONDI) return false;
  const attesa = Buffer.from(
    createHmac("sha256", chiaveFirma(segreto))
      .update(`${id}.${timestamp}.`)
      .update(corpo)
      .digest("base64"),
  );
  return firma.split(" ").some((parte) => {
    const [versione, valore] = parte.split(",", 2);
    if (versione !== "v1" || !valore) return false;
    const ricevuta = Buffer.from(valore);
    return ricevuta.length === attesa.length && timingSafeEqual(ricevuta, attesa);
  });
}

// ---- Client della Task API ----
// Interfaccia minima usata dall'agente: nei test si passa un client finto.

// Corpo di POST /v1/tasks/runs, con i soli campi che usiamo.
export type RichiestaTaskRun = {
  input: string;
  processor: string;
  task_spec: { output_schema: { type: "json"; json_schema: Record<string, unknown> } };
  source_policy: { include_domains: string[]; after_date: string };
  metadata: Record<string, string | number>;
  webhook: { url: string; event_types: ["task_run.status"] };
};

export type RisultatoTaskRun = {
  metadata: Record<string, unknown> | null;
  // output.content: un oggetto per gli output JSON, una stringa per quelli testuali.
  contenuto: unknown;
};

// Risposta HTTP non riuscita della Task API, con il suo codice di stato.
export class ErroreParallel extends Error {
  constructor(
    readonly stato: number,
    messaggio: string,
  ) {
    super(messaggio);
    this.name = "ErroreParallel";
  }
}

export interface ClientParallel {
  avviaTaskRun(richiesta: RichiestaTaskRun): Promise<{ runId: string }>;
  // Solo per run completati: per gli altri Parallel risponde con un errore.
  risultatoTaskRun(runId: string): Promise<RisultatoTaskRun>;
}

const API_PARALLEL = "https://api.parallel.ai";

async function erroreDaRisposta(risposta: Response, operazione: string): Promise<ErroreParallel> {
  // Corpo degli errori: { type: "error", error: { ref_id, message, detail } }.
  const corpo = (await risposta.json().catch(() => null)) as { error?: { message?: string; ref_id?: string } } | null;
  const dettaglio = [corpo?.error?.message, corpo?.error?.ref_id && `ref ${corpo.error.ref_id}`]
    .filter(Boolean)
    .join(", ");
  return new ErroreParallel(risposta.status, `${operazione}: HTTP ${risposta.status}${dettaglio ? ` (${dettaglio})` : ""}`);
}

// Client reale: POST /v1/tasks/runs e GET /v1/tasks/runs/{run_id}/result,
// autenticati con l'header x-api-key.
export function clientParallelHttp(chiaveApi: string, richiestaHttp: typeof fetch = fetch): ClientParallel {
  const intestazioni = { "x-api-key": chiaveApi, "content-type": "application/json" };
  return {
    async avviaTaskRun(richiesta) {
      const risposta = await richiestaHttp(`${API_PARALLEL}/v1/tasks/runs`, {
        method: "POST",
        headers: intestazioni,
        body: JSON.stringify(richiesta),
      });
      if (!risposta.ok) throw await erroreDaRisposta(risposta, "Avvio del task run");
      const run = (await risposta.json()) as { run_id: string };
      return { runId: run.run_id };
    },
    async risultatoTaskRun(runId) {
      // Il run è già concluso: un timeout breve basta, oltre Parallel risponde 408.
      const risposta = await richiestaHttp(
        `${API_PARALLEL}/v1/tasks/runs/${encodeURIComponent(runId)}/result?timeout=30`,
        { headers: intestazioni },
      );
      if (!risposta.ok) throw await erroreDaRisposta(risposta, `Risultato del task run ${runId}`);
      const risultato = (await risposta.json()) as {
        run: { metadata: Record<string, unknown> | null };
        output: { content: unknown };
      };
      return { metadata: risultato.run.metadata, contenuto: risultato.output.content };
    },
  };
}
