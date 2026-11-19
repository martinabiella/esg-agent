"use server";

import { revalidatePath } from "next/cache";
import { utenteRichiesto } from "@/lib/auth";
import { NonAutenticatoError } from "@/lib/utente-richiesto";
import {
  aggiornaFonte,
  creaFonte,
  eliminaFonte,
  type ConflittiFonte,
  type EsitoScritturaFonte,
} from "@/db/fonti";
import { type ErroriFonte, type ValoriFonte, validaFonte } from "@/lib/fonte";
import { idIntero } from "@/lib/id";

export type EsitoOperazione = "creata" | "modificata" | "eliminata";

// Stato restituito al modulo. Niente redirect: il drawer resta sulla pagina e
// mostra l'esito. I `valori` digitati tornano in tutti i percorsi di errore.
export type StatoModulo =
  | {
      errori?: ErroriFonte;
      errore?: string;
      valori?: ValoriFonte;
      // URL o nome già usati: le Fonti esistenti a cui rimandare.
      conflitti?: ConflittiFonte;
      salvato?: { id: number; esito: EsitoOperazione };
    }
  | undefined;

const NON_AUTENTICATO = "Sessione scaduta: accedi di nuovo per salvare.";
const NON_TROVATA = "La Fonte non esiste più.";
const URL_DUPLICATO = "Esiste già una Fonte con questo URL.";
const NOME_DUPLICATO = "Esiste già una Fonte con questo nome.";
const DUPLICATA = "Esiste già una Fonte con questo URL o questo nome.";

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

function leggiModulo(formData: FormData): ValoriFonte {
  const testo = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return { nome: testo("nome"), url: testo("url"), tipo: testo("tipo") };
}

function erroreScrittura(
  scrittura: Extract<EsitoScritturaFonte, { ok: false }>,
  valori: ValoriFonte,
): StatoModulo {
  if (scrittura.motivo === "non_trovata") return { errore: NON_TROVATA, valori };
  const { conflitti } = scrittura;
  const errori: ErroriFonte = {};
  if (conflitti.url) errori.url = URL_DUPLICATO;
  if (conflitti.nome) errori.nome = NOME_DUPLICATO;
  // La Fonte in conflitto è sparita nel frattempo: messaggio generico.
  if (!conflitti.url && !conflitti.nome) return { errore: DUPLICATA, valori };
  return { errori, conflitti, valori };
}

export async function creaFonteAzione(
  _stato: StatoModulo,
  formData: FormData,
): Promise<StatoModulo> {
  const messaggio = await senzaSessione();
  const valori = leggiModulo(formData);
  if (messaggio) return { errore: messaggio, valori };
  const esito = validaFonte(valori);
  if (!esito.ok) return { errori: esito.errori, valori };
  const scrittura = await creaFonte(esito.valori);
  if (!scrittura.ok) return erroreScrittura(scrittura, valori);
  revalidatePath("/fonti");
  return { salvato: { id: scrittura.id, esito: "creata" } };
}

export async function aggiornaFonteAzione(
  _stato: StatoModulo,
  formData: FormData,
): Promise<StatoModulo> {
  const messaggio = await senzaSessione();
  const id = idIntero(formData.get("id"));
  const valori = leggiModulo(formData);
  if (messaggio) return { errore: messaggio, valori };
  if (id === null) return { errore: NON_TROVATA, valori };
  const esito = validaFonte(valori);
  if (!esito.ok) return { errori: esito.errori, valori };
  const scrittura = await aggiornaFonte(id, esito.valori);
  if (!scrittura.ok) return erroreScrittura(scrittura, valori);
  revalidatePath("/fonti");
  return { salvato: { id, esito: "modificata" } };
}

export async function eliminaFonteAzione(
  _stato: StatoModulo,
  formData: FormData,
): Promise<StatoModulo> {
  const messaggio = await senzaSessione();
  if (messaggio) return { errore: messaggio };
  const id = idIntero(formData.get("id"));
  if (id === null) return { errore: NON_TROVATA };
  const scrittura = await eliminaFonte(id);
  if (!scrittura.ok) return { errore: NON_TROVATA };
  revalidatePath("/fonti");
  return { salvato: { id, esito: "eliminata" } };
}
