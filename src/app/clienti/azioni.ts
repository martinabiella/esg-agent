"use server";

import { revalidatePath } from "next/cache";
import { utenteRichiesto } from "@/lib/auth";
import { NonAutenticatoError } from "@/lib/utente-richiesto";
import { aggiornaCliente, creaCliente, eliminaCliente } from "@/db/clienti";
import { type ErroriCliente, type ValoriModulo, validaCliente } from "@/lib/cliente";
import { idIntero } from "@/lib/id";

export type EsitoOperazione = "creato" | "modificato" | "eliminato";

// Stato restituito al modulo. Niente redirect: il drawer resta sulla pagina e
// mostra l'esito (il drawer di dettaglio non ha un indirizzo proprio).
export type StatoModulo =
  | {
      errori?: ErroriCliente;
      errore?: string;
      valori?: ValoriModulo;
      // Salvataggio riuscito: id del Cliente e messaggio da mostrare.
      salvato?: { id: number; esito: EsitoOperazione };
    }
  | undefined;

const NON_AUTENTICATO = "Sessione scaduta: accedi di nuovo per salvare.";
const NON_TROVATO = "Il Cliente non esiste più.";
const SETTORE_INESISTENTE = "Uno dei Settori selezionati non esiste più: aggiorna la pagina.";

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

function leggiModulo(formData: FormData): ValoriModulo {
  const testo = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  const elenco = (k: string) =>
    formData.getAll(k).filter((v): v is string => typeof v === "string");
  return {
    ragioneSociale: testo("ragioneSociale"),
    attivitaSpecifica: testo("attivitaSpecifica"),
    settori: elenco("settori"),
    dipendenti: testo("dipendenti"),
    fatturato: testo("fatturato"),
    annoRiferimento: testo("annoRiferimento"),
    paesi: elenco("paesi"),
    note: testo("note"),
  };
}

export async function creaClienteAzione(
  _stato: StatoModulo,
  formData: FormData,
): Promise<StatoModulo> {
  const messaggio = await senzaSessione();
  const valori = leggiModulo(formData);
  if (messaggio) return { errore: messaggio, valori };
  const esito = validaCliente(valori);
  if (!esito.ok) return { errori: esito.errori, valori };
  const scrittura = await creaCliente(esito.valori);
  if (!scrittura.ok) return { errore: SETTORE_INESISTENTE, valori };
  revalidatePath("/clienti");
  return { salvato: { id: scrittura.id, esito: "creato" } };
}

export async function aggiornaClienteAzione(
  _stato: StatoModulo,
  formData: FormData,
): Promise<StatoModulo> {
  const messaggio = await senzaSessione();
  const id = idIntero(formData.get("id"));
  const valori = leggiModulo(formData);
  if (messaggio) return { errore: messaggio, valori };
  if (id === null) return { errore: NON_TROVATO, valori };
  const esito = validaCliente(valori);
  if (!esito.ok) return { errori: esito.errori, valori };
  const scrittura = await aggiornaCliente(id, esito.valori);
  if (!scrittura.ok) {
    return {
      errore: scrittura.motivo === "non_trovato" ? NON_TROVATO : SETTORE_INESISTENTE,
      valori,
    };
  }
  revalidatePath("/clienti");
  return { salvato: { id, esito: "modificato" } };
}

export async function eliminaClienteAzione(
  _stato: StatoModulo,
  formData: FormData,
): Promise<StatoModulo> {
  const messaggio = await senzaSessione();
  if (messaggio) return { errore: messaggio };
  const id = idIntero(formData.get("id"));
  if (id === null) return { errore: NON_TROVATO };
  const scrittura = await eliminaCliente(id);
  if (!scrittura.ok) return { errore: NON_TROVATO };
  revalidatePath("/clienti");
  return { salvato: { id, esito: "eliminato" } };
}
