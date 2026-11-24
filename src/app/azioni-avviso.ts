"use server";

import { revalidatePath } from "next/cache";
import { utenteRichiesto } from "@/lib/auth";
import { NonAutenticatoError } from "@/lib/utente-richiesto";
import { segnaAttoControllato, segnaNotiziaControllata } from "@/db/avviso-di-conferma";
import { idIntero } from "@/lib/id";

export type StatoControllo = { errore?: string } | undefined;

const NON_AUTENTICATO = "Sessione scaduta: accedi di nuovo per segnare come controllato.";

async function senzaSessione(): Promise<string | null> {
  try {
    await utenteRichiesto();
    return null;
  } catch (e) {
    if (e instanceof NonAutenticatoError) return NON_AUTENTICATO;
    throw e;
  }
}

// Home, scheda di un Atto e Notizie leggono gli stessi dati (Provenienza, cambi di
// Stato visti, Notizie controllate): si rinnova tutto il sito.
function aggiornaPagine() {
  revalidatePath("/", "layout");
}

export async function segnaAttoControllatoAzione(
  _stato: StatoControllo,
  formData: FormData,
): Promise<StatoControllo> {
  const messaggio = await senzaSessione();
  if (messaggio) return { errore: messaggio };
  const id = idIntero(formData.get("id"));
  // Un Atto che non esiste più è già uscito dall'Avviso: niente da segnalare.
  if (id !== null) await segnaAttoControllato(id);
  aggiornaPagine();
  return undefined;
}

export async function segnaNotiziaControllataAzione(
  _stato: StatoControllo,
  formData: FormData,
): Promise<StatoControllo> {
  const messaggio = await senzaSessione();
  if (messaggio) return { errore: messaggio };
  const id = idIntero(formData.get("id"));
  if (id !== null) await segnaNotiziaControllata(id);
  aggiornaPagine();
  return undefined;
}
