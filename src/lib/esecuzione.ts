// Esecuzione: le Ricerche avviate insieme, dal cron del lunedì o dal pulsante
// «Avvia ricerca ora» della pagina Fonti (ADR 0002). Non ha una tabella: sono
// le Ricerche registrate con lo stesso avviata_il.
// Vocabolario: vedi GLOSSARY.md

import { TIPI_FONTE } from "./fonte";
import {
  type ArchivioRicerche,
  type DipendenzeRicerca,
  type EsitoRicerca,
  type FonteRicerca,
  avviaRicercaPerFonte,
} from "./ricerca-fonte";

const UN_ORA_MS = 60 * 60 * 1000;

// Una Ricerca in corso da più di 2 ore non blocca nuove Esecuzioni ed è senza
// risposta: il processore "core" risponde di solito in pochi minuti. Resta però
// aperta, così un risultato in ritardo si salva lo stesso.
const ORE_BLOCCO = 2;
const inizioBlocco = (ora: Date) => new Date(ora.getTime() - ORE_BLOCCO * UN_ORA_MS);

// Parallel ritenta il webhook per 48 ore: dopo, il risultato non arriva più e
// la Ricerca si chiude come fallita (la Fonte risulta non leggibile). La
// pagina Fonti la mostra così già prima che la prossima Esecuzione la chiuda.
export const ORE_SCADENZA = 48;
// Neutro: la Ricerca può essere rimasta in corso anche senza che Parallel
// l'abbia mai ricevuta (per esempio se la funzione si è interrotta).
export const ERRORE_SCADUTA = "Il risultato della Ricerca non è mai arrivato.";

const ERRORE_IMPREVISTO = "Errore imprevisto: la Ricerca non è partita.";

// Tetto di Ricerche per Esecuzione, se TETTO_RICERCHE manca o non è valida:
// lascia spazio alle Fonti ufficiali, a una Ricerca per Tema e a quella
// generale, con margine per la crescita dell'elenco.
export const TETTO_PREDEFINITO = 20;

export function tettoRicerche(valore: string | undefined): number {
  const testo = valore?.trim() ?? "";
  if (/^\d+$/.test(testo) && Number(testo) > 0) return Number(testo);
  if (testo) console.warn(`TETTO_RICERCHE non valida (${JSON.stringify(valore)}): uso ${TETTO_PREDEFINITO}`);
  return TETTO_PREDEFINITO;
}

export type FonteDaControllare = FonteRicerca & {
  // Avvio dell'ultima Ricerca partita davvero (non saltata per tetto) dopo
  // l'ultimo cambio di URL; null se la Fonte non è mai partita.
  ultimaPartitaIl: Date | null;
};

export type SceltaRicerche = { daAvviare: FonteDaControllare[]; saltate: FonteDaControllare[] };

// Prima le Fonti ufficiali, poi le editoriali. A parità di tipo, prima le Fonti
// mai partite e poi quelle partite meno di recente: chi è saltato per tetto una
// settimana passa davanti la successiva.
export function scegliRicerche(fonti: readonly FonteDaControllare[], tetto: number): SceltaRicerche {
  const ordinate = [...fonti].sort(
    (a, b) =>
      TIPI_FONTE.indexOf(a.tipo) - TIPI_FONTE.indexOf(b.tipo) ||
      (a.ultimaPartitaIl?.getTime() ?? -Infinity) - (b.ultimaPartitaIl?.getTime() ?? -Infinity) ||
      a.id - b.id,
  );
  return { daAvviare: ordinate.slice(0, tetto), saltate: ordinate.slice(tetto) };
}

// ---- Avvio ----

export type NuovaEsecuzione = {
  avviataIl: Date;
  // Id delle Fonti.
  daAvviare: number[];
  saltate: number[];
  // Solo le Ricerche in corso avviate dopo questo istante bloccano l'esecuzione.
  bloccanteDal: Date;
};

export type AperturaEsecuzione =
  | { esito: "aperta"; ricerche: { fonteId: number; ricercaId: number }[] }
  // inCorsoDal: avvio dell'esecuzione in corso più recente.
  | { esito: "bloccata"; inCorsoDal: Date };

export interface ArchivioEsecuzioni extends ArchivioRicerche {
  fontiDaControllare(): Promise<FonteDaControllare[]>;
  // Atomica: se nessuna Ricerca avviata dopo bloccanteDal è ancora in corso,
  // registra le Ricerche dell'esecuzione, tutte con lo stesso avviata_il: in
  // corso senza run quelle da avviare, saltate per tetto le altre. Due avvii
  // contemporanei non aprono due esecuzioni.
  apriEsecuzione(esecuzione: NuovaEsecuzione): Promise<AperturaEsecuzione>;
  // Le Ricerche ancora in corso avviate prima di avviatePrima diventano
  // fallite con questo errore. Restituisce quante sono.
  chiudiRicercheScadute(avviatePrima: Date, errore: string): Promise<number>;
}

export type DipendenzeEsecuzione = Omit<DipendenzeRicerca, "archivio"> & {
  archivio: ArchivioEsecuzioni;
  tetto: number;
};

export type EsitoAvvioEsecuzione =
  | { esito: "avviata"; avviataIl: Date; avviate: number; fallite: number; saltate: number }
  | { esito: "gia_in_corso"; inCorsoDal: Date }
  | { esito: "nessuna_fonte" };

// Avvia un'esecuzione: una Ricerca per Fonte entro il tetto, una dopo l'altra.
// Nessun retry: una Ricerca fallita si recupera all'esecuzione successiva,
// perché la finestra temporale parte dall'ultima Ricerca riuscita.
export async function avviaEsecuzione(deps: DipendenzeEsecuzione): Promise<EsitoAvvioEsecuzione> {
  // Prima di registrare qualcosa: un errore di configurazione (URL del webhook
  // mancante) non è un problema delle Fonti e non va registrato come tale.
  void deps.urlWebhook;
  const avviataIl = deps.ora();
  await deps.archivio.chiudiRicercheScadute(new Date(avviataIl.getTime() - ORE_SCADENZA * UN_ORA_MS), ERRORE_SCADUTA);
  const fonti = await deps.archivio.fontiDaControllare();
  if (fonti.length === 0) return { esito: "nessuna_fonte" };
  const scelta = scegliRicerche(fonti, deps.tetto);

  const aperta = await deps.archivio.apriEsecuzione({
    avviataIl,
    daAvviare: scelta.daAvviare.map((f) => f.id),
    saltate: scelta.saltate.map((f) => f.id),
    bloccanteDal: inizioBlocco(avviataIl),
  });
  if (aperta.esito === "bloccata") return { esito: "gia_in_corso", inCorsoDal: aperta.inCorsoDal };

  // Una dopo l'altra: l'errore di una Fonte, anche imprevisto (per esempio il
  // database), non ferma le altre.
  let fallite = 0;
  for (const fonte of scelta.daAvviare) {
    const ricercaId = aperta.ricerche.find((r) => r.fonteId === fonte.id)?.ricercaId;
    if (ricercaId === undefined) continue;
    try {
      const avvio = await avviaRicercaPerFonte(fonte, { id: ricercaId, avviataIl }, deps);
      if (avvio.esito === "fallita") fallite++;
    } catch (e) {
      console.error(`Ricerca ${ricercaId} per la Fonte ${fonte.id} non avviata`, e);
      fallite++;
      // Se anche questa scrittura non riesce, la Ricerca resta in corso finché non scade.
      await deps.archivio.segnaFallita(ricercaId, ERRORE_IMPREVISTO).catch((errore: unknown) => {
        console.error(`Ricerca ${ricercaId} non segnata come fallita`, errore);
      });
    }
  }
  return {
    esito: "avviata",
    avviataIl,
    avviate: scelta.daAvviare.length - fallite,
    fallite,
    saltate: scelta.saltate.length,
  };
}

// ---- Esito dell'ultima esecuzione ----
// L'unica traccia del log nella UI: accanto al pulsante «Avvia ricerca ora».

export type RicercaDellEsecuzione = {
  // Nome della Fonte; null se nel frattempo è stata eliminata.
  fonte: string | null;
  esito: EsitoRicerca;
  notizieCreate: number;
};

export type UltimaEsecuzione = { avviataIl: Date; ricerche: RicercaDellEsecuzione[] };

export type EsitoEsecuzione = {
  stato: "in_corso" | "completata" | "fonti_non_leggibili";
  avviataIl: Date;
  descrizione: string;
};

function quante(n: number, singolare: string, plurale: string): string {
  return `${n} ${n === 1 ? singolare : plurale}`;
}

const nomi = (ricerche: readonly RicercaDellEsecuzione[]) => ricerche.map((r) => r.fonte ?? "Fonte eliminata").join(", ");

// Le Ricerche di un'esecuzione hanno tutte lo stesso avvio: dopo 2 ore quelle
// ancora in corso sono senza risposta (come per il blocco di nuovi avvii).
export function esitoEsecuzione({ avviataIl, ricerche }: UltimaEsecuzione, ora: Date): EsitoEsecuzione {
  const partite = ricerche.filter((r) => r.esito !== "saltata_per_tetto");
  const inCorso = partite.filter((r) => r.esito === "in_corso");
  const saltate = ricerche.length - partite.length;
  const frasi: string[] = [];
  let stato: EsitoEsecuzione["stato"];

  if (inCorso.length > 0 && avviataIl > inizioBlocco(ora)) {
    stato = "in_corso";
    const concluse = partite.length - inCorso.length;
    frasi.push(`${quante(concluse, "Ricerca conclusa", "Ricerche concluse")} su ${partite.length}.`);
  } else {
    const completate = partite.filter((r) => r.esito === "completata");
    const fallite = partite.filter((r) => r.esito === "fallita");
    const notizie = completate.reduce((somma, r) => somma + r.notizieCreate, 0);
    stato = fallite.length > 0 || inCorso.length > 0 ? "fonti_non_leggibili" : "completata";
    frasi.push(
      `${quante(completate.length, "Fonte controllata", "Fonti controllate")}, ${quante(notizie, "Notizia nuova", "Notizie nuove")}.`,
    );
    if (fallite.length > 0) frasi.push(`Non leggibili: ${nomi(fallite)}.`);
    if (inCorso.length > 0) frasi.push(`Senza risposta: ${nomi(inCorso)}.`);
  }
  if (saltate > 0) frasi.push(`${quante(saltate, "Fonte saltata", "Fonti saltate")} per tetto.`);
  return { stato, avviataIl, descrizione: frasi.join(" ") };
}
