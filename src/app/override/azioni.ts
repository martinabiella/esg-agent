"use server";

import { revalidatePath } from "next/cache";
import { utenteRichiesto } from "@/lib/auth";
import { NonAutenticatoError } from "@/lib/utente-richiesto";
import { rimuoviOverride, salvaOverride } from "@/db/override";
import { idIntero } from "@/lib/id";
import { validaOverride, type ErroriOverride } from "@/lib/override";

// Stato restituito al dialog: ok = salvato, il dialog si chiude.
export type StatoOverride =
  | { ok?: boolean; errori?: ErroriOverride; errore?: string; motivazione?: string }
  | undefined;

const NON_AUTENTICATO = "Sessione scaduta: accedi di nuovo per salvare.";
const NON_TROVATO = "Il Cliente o l'Atto non esiste più: aggiorna la pagina.";

// Gli Override compaiono nella scheda dell'Atto e nel drawer dei Clienti.
function aggiornaPagine(attoId: number) {
  revalidatePath("/clienti");
  revalidatePath(`/normative/${attoId}`);
}

async function autore(): Promise<{ autore: string } | { errore: string }> {
  try {
    const utente = await utenteRichiesto();
    return { autore: utente.name?.trim() || utente.email };
  } catch (e) {
    if (e instanceof NonAutenticatoError) return { errore: NON_AUTENTICATO };
    throw e;
  }
}

function testo(formData: FormData, nome: string) {
  const v = formData.get(nome);
  return typeof v === "string" ? v : "";
}

export async function salvaOverrideAzione(
  _stato: StatoOverride,
  formData: FormData,
): Promise<StatoOverride> {
  const motivazione = testo(formData, "motivazione");
  const chi = await autore();
  if ("errore" in chi) return { errore: chi.errore, motivazione };

  const clienteId = idIntero(formData.get("clienteId"));
  const attoId = idIntero(formData.get("attoId"));
  if (clienteId === null || attoId === null) return { errore: NON_TROVATO, motivazione };

  const esito = validaOverride({ esito: testo(formData, "esito"), motivazione });
  if (!esito.ok) return { errori: esito.errori, motivazione };

  const scrittura = await salvaOverride({ clienteId, attoId, ...esito.valori, autore: chi.autore });
  if (!scrittura.ok) return { errore: NON_TROVATO, motivazione };
  aggiornaPagine(attoId);
  return { ok: true };
}

export async function rimuoviOverrideAzione(
  _stato: StatoOverride,
  formData: FormData,
): Promise<StatoOverride> {
  const chi = await autore();
  if ("errore" in chi) return { errore: chi.errore };
  const clienteId = idIntero(formData.get("clienteId"));
  const attoId = idIntero(formData.get("attoId"));
  if (clienteId === null || attoId === null) return { errore: NON_TROVATO };
  await rimuoviOverride(clienteId, attoId);
  aggiornaPagine(attoId);
  return { ok: true };
}
