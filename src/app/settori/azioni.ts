"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { utenteRichiesto } from "@/lib/auth";
import { NonAutenticatoError } from "@/lib/utente-richiesto";
import {
  aggiornaSettore,
  creaSettore,
  eliminaSettore,
  usiSettore,
} from "@/db/settori";
import {
  type CampiSettore,
  type EsitoSalvataggio,
  validaSettore,
  valutaEliminazione,
} from "@/lib/settore";
import { idIntero } from "@/lib/id";

export type StatoModulo =
  | {
      errori?: { nome?: string };
      errore?: string;
      valori?: CampiSettore;
    }
  | undefined;

// Senza sessione l'azione non scrive: rimanda all'accesso, poi alla pagina d'origine.
async function richiediSessione(dopo: string) {
  try {
    await utenteRichiesto();
  } catch (e) {
    if (e instanceof NonAutenticatoError) {
      redirect(`/accedi?dopo=${encodeURIComponent(dopo)}`);
    }
    throw e;
  }
}

function leggiCampi(formData: FormData) {
  const testo = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return validaSettore({ nome: testo("nome"), descrizione: testo("descrizione") });
}

// Il tipo garantisce che l'esito sia uno di quelli che esito.tsx sa mostrare.
function vaiA(percorso: string, esito: EsitoSalvataggio): never {
  redirect(`${percorso}?esito=${esito}`);
}

const NOME_DUPLICATO = "Esiste già un Settore con questo nome.";
const NON_TROVATO = "Il Settore non esiste più.";

export async function creaSettoreAzione(
  _stato: StatoModulo,
  formData: FormData,
): Promise<StatoModulo> {
  await richiediSessione("/settori/nuovo");
  const esito = leggiCampi(formData);
  if (!esito.ok) return { errori: esito.errori, valori: esito.valori };
  const scrittura = await creaSettore(esito.valori);
  if (!scrittura.ok) return { errori: { nome: NOME_DUPLICATO }, valori: esito.valori };
  revalidatePath("/settori");
  vaiA(`/settori/${scrittura.id}`, "creato");
}

export async function aggiornaSettoreAzione(
  _stato: StatoModulo,
  formData: FormData,
): Promise<StatoModulo> {
  const id = idIntero(formData.get("id"));
  await richiediSessione(id ? `/settori/${id}/modifica` : "/settori");
  const esito = leggiCampi(formData);
  if (id === null) return { errore: NON_TROVATO, valori: esito.valori };
  if (!esito.ok) return { errori: esito.errori, valori: esito.valori };
  const scrittura = await aggiornaSettore(id, esito.valori);
  if (!scrittura.ok) {
    return scrittura.motivo === "nome_duplicato"
      ? { errori: { nome: NOME_DUPLICATO }, valori: esito.valori }
      : { errore: NON_TROVATO, valori: esito.valori };
  }
  revalidatePath("/settori");
  revalidatePath(`/settori/${id}`);
  vaiA(`/settori/${id}`, "modificato");
}

export async function eliminaSettoreAzione(
  _stato: StatoModulo,
  formData: FormData,
): Promise<StatoModulo> {
  const id = idIntero(formData.get("id"));
  await richiediSessione(id ? `/settori/${id}/elimina` : "/settori");
  if (id === null) return { errore: NON_TROVATO };
  const decisione = valutaEliminazione(await usiSettore(id));
  if (!decisione.consentita) return { errore: decisione.messaggio };
  const scrittura = await eliminaSettore(id);
  if (!scrittura.ok) {
    return {
      errore:
        scrittura.motivo === "in_uso"
          ? "Il Settore è appena stato assegnato a un Cliente: non può essere eliminato."
          : NON_TROVATO,
    };
  }
  revalidatePath("/settori");
  vaiA("/settori", "eliminato");
}
