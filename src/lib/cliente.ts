// Vocabolario: vedi GLOSSARY.md

import { idIntero } from "./id";
import { validaPaesi } from "./paesi";

// Numeric di Postgres arriva come stringa. La formattazione manuale mantiene
// tutte le cifre, anche quando l'importo supera la precisione di un Number.
export function formattaFatturato(fatturato: string): string {
  const parti = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(fatturato.trim());
  if (!parti) return fatturato;

  const segno = parti[1] === "-" ? "-" : "";
  const intero = parti[2].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimali = parti[3] ? `,${parti[3]}` : "";
  return `${segno}${intero}${decimali} €`;
}

// ---- Validazione, condivisa tra modulo e azioni server ----


// Quanto arriva dal modulo: tutto testo, anche i numeri.
export type InputCliente = {
  ragioneSociale?: string | null;
  attivitaSpecifica?: string | null;
  settori?: readonly string[];
  dipendenti?: string | null;
  fatturato?: string | null;
  annoRiferimento?: string | null;
  paesi?: readonly string[];
  note?: string | null;
};

// Valori pronti per il salvataggio: un facoltativo vuoto è null (assente).
export type CampiCliente = {
  ragioneSociale: string;
  attivitaSpecifica: string;
  settori: number[];
  dipendenti: number | null;
  fatturato: string | null;
  annoRiferimento: number | null;
  paesi: string[] | null;
  note: string | null;
};

// Quanto digitato, per riempire di nuovo il modulo dopo un errore.
export type ValoriModulo = {
  ragioneSociale: string;
  attivitaSpecifica: string;
  settori: string[];
  dipendenti: string;
  fatturato: string;
  annoRiferimento: string;
  paesi: string[];
  note: string;
};

export type ErroriCliente = Partial<Record<keyof ValoriModulo, string>>;

export type EsitoCliente =
  | { ok: true; valori: CampiCliente }
  | { ok: false; errori: ErroriCliente; valori: ValoriModulo };

const INT4_MAX = 2147483647;
const ANNO_MINIMO = 1900;

export function validaCliente(
  input: InputCliente,
  annoCorrente: number = new Date().getFullYear(),
): EsitoCliente {
  const grezzi: ValoriModulo = {
    ragioneSociale: input.ragioneSociale ?? "",
    attivitaSpecifica: input.attivitaSpecifica ?? "",
    settori: [...(input.settori ?? [])],
    dipendenti: input.dipendenti ?? "",
    fatturato: input.fatturato ?? "",
    annoRiferimento: input.annoRiferimento ?? "",
    paesi: [...(input.paesi ?? [])],
    note: input.note ?? "",
  };
  const errori: ErroriCliente = {};

  const ragioneSociale = grezzi.ragioneSociale.trim();
  if (!ragioneSociale) errori.ragioneSociale = "La ragione sociale è obbligatoria.";
  const attivitaSpecifica = grezzi.attivitaSpecifica.trim();
  if (!attivitaSpecifica) errori.attivitaSpecifica = "L'attività specifica è obbligatoria.";

  const idSettori = grezzi.settori.map((s) => idIntero(s));
  if (idSettori.length === 0) {
    errori.settori = "Seleziona almeno un Settore.";
  } else if (idSettori.some((id) => id === null)) {
    errori.settori = "Settore non valido.";
  }
  const settori = [...new Set(idSettori.filter((id): id is number => id !== null))];

  let dipendenti: number | null = null;
  const testoDipendenti = grezzi.dipendenti.trim();
  if (testoDipendenti) {
    if (!/^\d+$/.test(testoDipendenti) || Number(testoDipendenti) > INT4_MAX) {
      errori.dipendenti = "Indica un numero intero maggiore o uguale a 0.";
    } else {
      dipendenti = Number(testoDipendenti);
    }
  }

  let fatturato: string | null = null;
  const testoFatturato = grezzi.fatturato.trim();
  if (testoFatturato) {
    if (!/^\d{1,30}([.,]\d{1,6})?$/.test(testoFatturato)) {
      errori.fatturato =
        "Indica un importo in euro maggiore o uguale a 0 (es. 1500000 o 1500000,50).";
    } else {
      fatturato = testoFatturato.replace(",", ".");
    }
  }

  let annoRiferimento: number | null = null;
  const testoAnno = grezzi.annoRiferimento.trim();
  if (testoAnno) {
    const anno = Number(testoAnno);
    if (!/^\d{4}$/.test(testoAnno) || anno < ANNO_MINIMO || anno > annoCorrente) {
      errori.annoRiferimento = `Indica un anno tra ${ANNO_MINIMO} e ${annoCorrente}.`;
    } else {
      annoRiferimento = anno;
    }
  } else if (fatturato !== null || errori.fatturato) {
    errori.annoRiferimento = "L'anno di riferimento è obbligatorio se indichi il fatturato.";
  }

  const paesi = [...new Set(grezzi.paesi)];
  const esitoPaesi = validaPaesi(paesi);
  if (!esitoPaesi.ok) errori.paesi = `Paese non valido: ${esitoPaesi.nonValidi.join(", ")}.`;

  if (Object.keys(errori).length > 0) return { ok: false, errori, valori: grezzi };

  return {
    ok: true,
    valori: {
      ragioneSociale,
      attivitaSpecifica,
      settori,
      dipendenti,
      fatturato,
      annoRiferimento,
      paesi: paesi.length > 0 ? paesi : null,
      note: grezzi.note.trim() || null,
    },
  };
}
