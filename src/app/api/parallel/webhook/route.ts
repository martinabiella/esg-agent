// Webhook di Parallel a fine run (evento task_run.status). Si autentica con la
// firma di Parallel, non con la sessione: il proxy lo lascia passare.
// Ogni risposta non 2xx fa riprovare Parallel (backoff esponenziale fino a 48 ore).

import { dipendenzeAgente } from "@/lib/agente";
import { verificaFirmaWebhook } from "@/lib/parallel";
import { elaboraWebhook } from "@/lib/ricerca-fonte";

export async function POST(request: Request) {
  const segreto = process.env.PARALLEL_WEBHOOK_SECRET;
  if (!segreto) {
    console.error("Webhook Parallel: variabile d'ambiente PARALLEL_WEBHOOK_SECRET mancante");
    return new Response("Webhook non configurato", { status: 500 });
  }

  // La firma copre i byte esatti del corpo.
  const corpo = new Uint8Array(await request.arrayBuffer());
  const intestazioni = {
    id: request.headers.get("webhook-id"),
    timestamp: request.headers.get("webhook-timestamp"),
    firma: request.headers.get("webhook-signature"),
  };
  if (!verificaFirmaWebhook(segreto, intestazioni, corpo, new Date())) {
    return new Response("Firma non valida", { status: 401 });
  }

  let evento: unknown;
  try {
    evento = JSON.parse(new TextDecoder().decode(corpo));
  } catch {
    return new Response("Corpo non valido", { status: 400 });
  }

  try {
    const esito = await elaboraWebhook(evento, dipendenzeAgente());
    // Run non ancora registrato: Parallel riproverà.
    return Response.json(esito, { status: esito.esito === "sconosciuta" ? 404 : 200 });
  } catch (e) {
    console.error(`Webhook Parallel ${intestazioni.id} non elaborato`, e);
    return new Response("Errore interno", { status: 500 });
  }
}
