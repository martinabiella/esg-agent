// Accesso all'endpoint del cron di Vercel. Vercel manda il valore della
// variabile d'ambiente CRON_SECRET nell'header Authorization, come
// "Bearer <CRON_SECRET>": https://vercel.com/docs/cron-jobs/manage-cron-jobs

import { timingSafeEqual } from "node:crypto";

export type AccessoCron = "autorizzato" | "rifiutato" | "non_configurato";

// Senza segreto nell'ambiente non passa nessuno: "Bearer undefined" non deve
// aprire l'endpoint. Il confronto a tempo costante non rivela il segreto.
export function accessoCron(authorization: string | null, segreto: string | undefined): AccessoCron {
  if (!segreto) return "non_configurato";
  const atteso = Buffer.from(`Bearer ${segreto}`);
  const ricevuto = Buffer.from(authorization ?? "");
  return ricevuto.length === atteso.length && timingSafeEqual(ricevuto, atteso) ? "autorizzato" : "rifiutato";
}
