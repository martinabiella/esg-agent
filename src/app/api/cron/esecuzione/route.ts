// Esecuzione settimanale delle Ricerche, chiamata dal cron di Vercel
// (vercel.json) con una GET sul deploy di produzione. Si autentica con
// CRON_SECRET, non con la sessione: il proxy la lascia passare.
// Vercel non ritenta un cron fallito: la Ricerca persa si recupera
// all'esecuzione successiva grazie alla finestra temporale.

import { dipendenzeAgente } from "@/lib/agente";
import { accessoCron } from "@/lib/cron";
import { avviaEsecuzione } from "@/lib/esecuzione";

export async function GET(request: Request) {
  const accesso = accessoCron(request.headers.get("authorization"), process.env.CRON_SECRET);
  if (accesso === "non_configurato") {
    console.error("Cron delle Ricerche: variabile d'ambiente CRON_SECRET mancante");
    return new Response("Cron non configurato", { status: 500 });
  }
  if (accesso === "rifiutato") return new Response("Non autorizzato", { status: 401 });

  try {
    const esito = await avviaEsecuzione(dipendenzeAgente());
    console.info("Cron delle Ricerche", esito);
    return Response.json(esito);
  } catch (e) {
    console.error("Cron delle Ricerche: esecuzione non avviata", e);
    return new Response("Errore interno", { status: 500 });
  }
}
