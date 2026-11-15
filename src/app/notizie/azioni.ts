"use server";

import { revalidatePath } from "next/cache";
import { utenteRichiesto } from "@/lib/auth";
import { NonAutenticatoError } from "@/lib/utente-richiesto";
import {
  aggiornaNotizia,
  creaNotizia,
  eliminaNotizia,
  type EsitoScritturaNotizia,
} from "@/db/notizie";
import { type ErroriNotizia, type ValoriNotizia, validaNotizia } from "@/lib/notizia";
import { idIntero } from "@/lib/id";

export type EsitoOperazione = "creata" | "modificata" | "eliminata";

// Stato restituito al modulo. Niente redirect: il drawer resta sulla pagina e
// mostra l'esito. I `valori` digitati tornano in tutti i percorsi di errore.
export type StatoModulo =
  | {
      errori?: ErroriNotizia;
      errore?: string;
      valori?: ValoriNotizia;
      // URL già usato: la Notizia esistente a cui rimandare.
      esistente?: { id: number; titolo: string };
      salvato?: { id: number; esito: EsitoOperazione };
    }
  | undefined;

const NON_AUTENTICATO = "Sessione scaduta: accedi di nuovo per salvare.";
const NON_TROVATA = "La Notizia non esiste più.";
const ATTO_INESISTENTE = "Uno degli Atti selezionati non esiste più: aggiorna la pagina.";
const URL_DUPLICATO = "Esiste già una Notizia con questo URL.";

// Senza sessione l'azione non scrive. Restituisce il messaggio d'errore, o null.
async function senzaSessione(): Promise<string | null> {
  try {
    await utenteRichiesto();
    return null;
  } catch (e) {
    if (e instanceof NonAutenticatoError) return NON_AUTENTICATO;
    throw e;
  }
}

function leggiModulo(formData: FormData): ValoriNotizia {
  const testo = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    titolo: testo("titolo"),
    fonte: testo("fonte"),
    url: testo("url"),
    data: testo("data"),
    riassunto: testo("riassunto"),
    atti: formData.getAll("atti").filter((v): v is string => typeof v === "string"),
  };
}

function erroreScrittura(
  scrittura: Extract<EsitoScritturaNotizia, { ok: false }>,
  valori: ValoriNotizia,
): StatoModulo {
  switch (scrittura.motivo) {
    case "non_trovata":
      return { errore: NON_TROVATA, valori };
    case "atto_inesistente":
      return { errore: ATTO_INESISTENTE, valori };
    case "url_duplicato":
      return {
        errori: { url: URL_DUPLICATO },
        esistente: scrittura.esistente,
        valori,
      };
  }
}

export async function creaNotiziaAzione(
  _stato: StatoModulo,
  formData: FormData,
): Promise<StatoModulo> {
  const messaggio = await senzaSessione();
  const valori = leggiModulo(formData);
  if (messaggio) return { errore: messaggio, valori };
  const esito = validaNotizia(valori);
  if (!esito.ok) return { errori: esito.errori, valori };
  const scrittura = await creaNotizia(esito.valori);
  if (!scrittura.ok) return erroreScrittura(scrittura, valori);
  revalidatePath("/notizie");
  return { salvato: { id: scrittura.id, esito: "creata" } };
}

export async function aggiornaNotiziaAzione(
  _stato: StatoModulo,
  formData: FormData,
): Promise<StatoModulo> {
  const messaggio = await senzaSessione();
  const id = idIntero(formData.get("id"));
  const valori = leggiModulo(formData);
  if (messaggio) return { errore: messaggio, valori };
  if (id === null) return { errore: NON_TROVATA, valori };
  const esito = validaNotizia(valori);
  if (!esito.ok) return { errori: esito.errori, valori };
  const scrittura = await aggiornaNotizia(id, esito.valori);
  if (!scrittura.ok) return erroreScrittura(scrittura, valori);
  revalidatePath("/notizie");
  return { salvato: { id, esito: "modificata" } };
}

export async function eliminaNotiziaAzione(
  _stato: StatoModulo,
  formData: FormData,
): Promise<StatoModulo> {
  const messaggio = await senzaSessione();
  if (messaggio) return { errore: messaggio };
  const id = idIntero(formData.get("id"));
  if (id === null) return { errore: NON_TROVATA };
  const scrittura = await eliminaNotizia(id);
  if (!scrittura.ok) return { errore: NON_TROVATA };
  revalidatePath("/notizie");
  return { salvato: { id, esito: "eliminata" } };
}
