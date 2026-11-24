// Dipendenze reali dell'agente (solo lato server): client Parallel e
// database. Le variabili d'ambiente sono descritte nel README.

import { archivioRicerche } from "@/db/ricerche";
import { type DipendenzeEsecuzione, tettoRicerche } from "./esecuzione";
import { clientParallelHttp } from "./parallel";

export const PERCORSO_WEBHOOK = "/api/parallel/webhook";

function variabile(nome: string): string {
  const valore = process.env[nome];
  if (!valore) throw new Error(`Variabile d'ambiente ${nome} mancante`);
  return valore;
}

// PARALLEL_WEBHOOK_URL se impostata, altrimenti il dominio di produzione che
// Vercel espone a ogni deploy (anche le anteprime scrivono sullo stesso DB).
function urlWebhook(): string {
  const esplicito = process.env.PARALLEL_WEBHOOK_URL;
  if (esplicito) return esplicito;
  const produzione = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (produzione) return `https://${produzione}${PERCORSO_WEBHOOK}`;
  throw new Error("Variabile d'ambiente PARALLEL_WEBHOOK_URL mancante");
}

export function dipendenzeAgente(): DipendenzeEsecuzione {
  return {
    client: clientParallelHttp(variabile("PARALLEL_API_KEY")),
    archivio: archivioRicerche,
    // Serve solo all'avvio: il webhook funziona anche senza.
    get urlWebhook() {
      return urlWebhook();
    },
    ora: () => new Date(),
    tetto: tettoRicerche(process.env.TETTO_RICERCHE),
  };
}
