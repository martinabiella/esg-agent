"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { utenteRichiesto } from "@/lib/auth";
import { NonAutenticatoError } from "@/lib/utente-richiesto";
import { aggiornaAtto, creaAtto, eliminaAtto, giurisdizioniAtti, trovaAtto } from "@/db/atti";
import {
  type ErroriAtto,
  type EsitoAtto,
  type RelazioneModulo,
  type ValoriModuloAtto,
  validaAtto,
  validaRelazioni,
} from "@/lib/atto";
import { idIntero } from "@/lib/id";

// Stato restituito a useActionState. I valori digitati restano nel form dopo un errore.
export type StatoModuloAtto =
  | {
      errori?: ErroriAtto;
      errore?: string;
      valori?: ValoriModuloAtto;
      salvato?: { id: number; esito: "creato" | "modificato" };
      duplicatoId?: number;
    }
  | undefined;

type InputAzione = {
  testo: Record<string, string>;
  elenco: Record<string, string[]>;
  relazioni: RelazioneModulo[];
  soglieJson: string;
};

function leggiInput(formData: FormData): InputAzione {
  const testo = (nome: string) => {
    const valore = formData.get(nome);
    return typeof valore === "string" ? valore : "";
  };
  const elenco = (nome: string) => formData.getAll(nome).filter((v): v is string => typeof v === "string");
  let relazioni: RelazioneModulo[] = [];
  try {
    const valore: unknown = JSON.parse(testo("relazioni"));
    if (Array.isArray(valore)) {
      relazioni = valore.map((r) => {
        if (r !== null && typeof r === "object" && typeof r.tipo === "string" && typeof r.attoId === "string") {
          return r as RelazioneModulo;
        }
        return { tipo: "" as RelazioneModulo["tipo"], attoId: "" };
      });
    } else {
      relazioni = [{ tipo: "" as RelazioneModulo["tipo"], attoId: "" }];
    }
  } catch {
    relazioni = [{ tipo: "" as RelazioneModulo["tipo"], attoId: "" }];
  }
  return {
    testo: Object.fromEntries(
      [
        "titolo",
        "identificativoUfficiale",
        "giurisdizione",
        "tipo",
        "stato",
        "dataStato",
        "summary",
        "urlTesto",
        "nuovoTema",
        "criteriTesto",
        "minimoSoglie",
      ].map((nome) => [nome, testo(nome)]),
    ),
    elenco: { settori: elenco("settori"), temi: elenco("temi") },
    relazioni,
    soglieJson: testo("soglie"),
  };
}

function validaModulo(formData: FormData): EsitoAtto {
  const input = leggiInput(formData);
  return validaAtto({
    ...input.testo,
    ...input.elenco,
    relazioni: input.relazioni,
    soglieJson: input.soglieJson,
    tuttiISettori: formData.get("tuttiISettori") === "on",
    nonRilevante: formData.get("nonRilevante") === "on",
  });
}

async function sessione(): Promise<string | null> {
  try {
    await utenteRichiesto();
    return null;
  } catch (e) {
    if (e instanceof NonAutenticatoError) return "Sessione scaduta: accedi di nuovo per salvare.";
    throw e;
  }
}

async function validaCollegamenti(
  id: number | null,
  esito: Extract<EsitoAtto, { ok: true }>,
): Promise<string | null> {
  const destinazioni = await giurisdizioniAtti(esito.valori.relazioni.map((r) => r.attoId));
  return validaRelazioni(esito.valori.relazioni, id, esito.valori.giurisdizione, destinazioni);
}

function erroreScrittura(motivo: "identificativo_duplicato" | "collegamento_inesistente" | "non_trovato", duplicatoId?: number | null) {
  if (motivo === "identificativo_duplicato") {
    return { campo: "identificativoUfficiale" as const, messaggio: "Esiste già un Atto con questo identificativo ufficiale.", duplicatoId: duplicatoId ?? undefined };
  }
  if (motivo === "collegamento_inesistente") {
    return { campo: "relazioni" as const, messaggio: "Un Settore, Tema o Atto collegato non esiste più: aggiorna la pagina." };
  }
  return { campo: "generale" as const, messaggio: "L'Atto non esiste più." };
}

function conErrore(valori: ValoriModuloAtto, campo: string, messaggio: string, duplicatoId?: number): StatoModuloAtto {
  if (campo === "generale") return { errore: messaggio, valori };
  return { errori: { [campo]: messaggio }, valori, duplicatoId };
}

export async function creaAttoAzione(_stato: StatoModuloAtto, formData: FormData): Promise<StatoModuloAtto> {
  const valoriInput = validaModulo(formData);
  const raw = leggiInput(formData);
  const sessioneMancante = await sessione();
  if (sessioneMancante) return { errore: sessioneMancante, valori: moduloDaEsito(raw, valoriInput) };
  if (!valoriInput.ok) return { errori: valoriInput.errori, valori: valoriInput.valori };

  const erroreRelazione = await validaCollegamenti(null, valoriInput);
  if (erroreRelazione) return conErrore(valoriDaInput(raw, valoriInput), "relazioni", erroreRelazione);
  const scrittura = await creaAtto(valoriInput.valori);
  if (!scrittura.ok) {
    const errore = erroreScrittura(scrittura.motivo, scrittura.motivo === "identificativo_duplicato" ? scrittura.duplicatoId : undefined);
    return conErrore(valoriDaInput(raw, valoriInput), errore.campo, errore.messaggio, errore.duplicatoId);
  }
  revalidatePath("/normative");
  revalidatePath(`/normative/${scrittura.id}`);
  return { salvato: { id: scrittura.id, esito: "creato" } };
}

export async function aggiornaAttoAzione(_stato: StatoModuloAtto, formData: FormData): Promise<StatoModuloAtto> {
  const id = idIntero(formData.get("id"));
  const valoriInput = validaModulo(formData);
  const raw = leggiInput(formData);
  const sessioneMancante = await sessione();
  if (sessioneMancante) return { errore: sessioneMancante, valori: moduloDaEsito(raw, valoriInput) };
  if (id === null) return { errore: "L'Atto non esiste più.", valori: moduloDaEsito(raw, valoriInput) };
  if (!valoriInput.ok) return { errori: valoriInput.errori, valori: valoriInput.valori };

  const esistente = await trovaAtto(id);
  if (!esistente) return { errore: "L'Atto non esiste più.", valori: valoriDaInput(raw, valoriInput) };
  const erroreRelazione = await validaCollegamenti(id, valoriInput);
  if (erroreRelazione) return conErrore(valoriDaInput(raw, valoriInput), "relazioni", erroreRelazione);
  const scrittura = await aggiornaAtto(id, valoriInput.valori);
  if (!scrittura.ok) {
    const errore = erroreScrittura(scrittura.motivo, scrittura.motivo === "identificativo_duplicato" ? scrittura.duplicatoId : undefined);
    return conErrore(valoriDaInput(raw, valoriInput), errore.campo, errore.messaggio, errore.duplicatoId);
  }
  revalidatePath("/normative");
  revalidatePath(`/normative/${id}`);
  return { salvato: { id, esito: "modificato" } };
}

export async function eliminaAttoAzione(
  _stato: StatoModuloAtto,
  formData: FormData,
): Promise<StatoModuloAtto> {
  const id = idIntero(formData.get("id"));
  const sessioneMancante = await sessione();
  if (sessioneMancante) return { errore: sessioneMancante };
  if (id === null) return { errore: "L'Atto non esiste più." };

  const scrittura = await eliminaAtto(id);
  if (!scrittura.ok) return { errore: "L'Atto non esiste più." };
  revalidatePath("/normative");
  redirect("/normative?esito=eliminato");
}

function moduloDaEsito(input: InputAzione, esito: EsitoAtto): ValoriModuloAtto {
  return esito.ok ? valoriDaInput(input, esito) : esito.valori;
}

function valoriDaInput(input: InputAzione, esito: Extract<EsitoAtto, { ok: true }>): ValoriModuloAtto {
  return {
    ...input.testo,
    ...input.elenco,
    tuttiISettori: esito.valori.tuttiISettori,
    nonRilevante: esito.valori.nonRilevante,
    soglie: JSON.parse(input.soglieJson || "[]") as ValoriModuloAtto["soglie"],
    relazioni: input.relazioni,
  } as ValoriModuloAtto;
}
