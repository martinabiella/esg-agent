// Vocabolario: vedi GLOSSARY.md (Applicabilità, Soglia, Criteri di applicabilità)
//
// Forma di criteriSoglie riconosciuta dal calcolo:
//   { richieste?: number, soglie: Soglia[] }
//   Soglia = { campo: "dipendenti" | "fatturato", min?: number, max?: number }
//          | { campo: "paesi", inclusi: string[] }
// `richieste` è il numero di Soglie da rispettare (default: tutte).
// Qualsiasi altra forma o altro `campo` è una Soglia sconosciuta: "da verificare".

export type Applicabilita = "applicabile" | "non_applicabile" | "da_verificare";

export type AttoPerCalcolo = {
  criteriSoglie: unknown;
  criteriTesto: string;
  tuttiISettori: boolean;
  settori: readonly number[];
};

export type ClientePerCalcolo = {
  dipendenti: number | null;
  // numeric di Postgres: arriva come stringa
  fatturato: string | null;
  paesi: readonly string[] | null;
  settori: readonly number[];
};

// Atti abrogati e non rilevanti non entrano nel calcolo.
export function attoCalcolabile(atto: { stato: string; nonRilevante: boolean }): boolean {
  return atto.stato !== "abrogato" && !atto.nonRilevante;
}

type EsitoSoglia = "rispettata" | "violata" | "sconosciuta";

const SCONOSCIUTA = Symbol("soglia sconosciuta");

function isOggetto(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function numeroOppure(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function confrontaIntervallo(valore: number | null, soglia: Record<string, unknown>): EsitoSoglia {
  const min = numeroOppure(soglia.min);
  const max = numeroOppure(soglia.max);
  // Nessun limite valido: la Soglia non dice nulla di calcolabile.
  if (min === undefined && max === undefined) return "sconosciuta";
  if (valore === null || Number.isNaN(valore)) return "sconosciuta";
  if (min !== undefined && valore < min) return "violata";
  if (max !== undefined && valore > max) return "violata";
  return "rispettata";
}

function valutaSoglia(soglia: unknown, cliente: ClientePerCalcolo): EsitoSoglia {
  if (!isOggetto(soglia)) return "sconosciuta";
  switch (soglia.campo) {
    case "dipendenti":
      return confrontaIntervallo(cliente.dipendenti, soglia);
    case "fatturato":
      return confrontaIntervallo(
        cliente.fatturato === null ? null : Number(cliente.fatturato),
        soglia,
      );
    case "paesi": {
      const inclusi = soglia.inclusi;
      if (!Array.isArray(inclusi) || inclusi.length === 0 || !inclusi.every((p) => typeof p === "string")) {
        return "sconosciuta";
      }
      if (cliente.paesi === null || cliente.paesi.length === 0) return "sconosciuta";
      return cliente.paesi.some((p) => inclusi.includes(p)) ? "rispettata" : "violata";
    }
    default:
      return "sconosciuta";
  }
}

// Legge criteriSoglie: elenco di Soglie e numero da rispettare.
// null = nessuna Soglia; forma non riconosciuta = una Soglia sconosciuta.
function leggiSoglie(criteriSoglie: unknown): { soglie: unknown[]; richieste: number } {
  if (criteriSoglie === null || criteriSoglie === undefined) return { soglie: [], richieste: 0 };
  if (!isOggetto(criteriSoglie) || !Array.isArray(criteriSoglie.soglie)) {
    return { soglie: [SCONOSCIUTA], richieste: 1 };
  }
  const soglie = criteriSoglie.soglie;
  const richieste = numeroOppure(criteriSoglie.richieste);
  const valida = richieste !== undefined && Number.isInteger(richieste) && richieste >= 1;
  return { soglie, richieste: valida ? Math.min(richieste, soglie.length) : soglie.length };
}

function esitoSoglie(atto: AttoPerCalcolo, cliente: ClientePerCalcolo): Applicabilita {
  const { soglie, richieste } = leggiSoglie(atto.criteriSoglie);
  if (soglie.length === 0) return atto.tuttiISettori ? "applicabile" : "da_verificare";

  let rispettate = 0;
  let violate = 0;
  for (const s of soglie) {
    const esito = s === SCONOSCIUTA ? "sconosciuta" : valutaSoglia(s, cliente);
    if (esito === "rispettata") rispettate++;
    else if (esito === "violata") violate++;
  }
  // Certo solo se non cambierebbe con qualsiasi valore dei dati mancanti.
  if (rispettate >= richieste) return "applicabile";
  if (violate > soglie.length - richieste) return "non_applicabile";
  return "da_verificare";
}

export function calcolaApplicabilita(atto: AttoPerCalcolo, cliente: ClientePerCalcolo): Applicabilita {
  const settoreDiverso =
    !atto.tuttiISettori && !cliente.settori.some((id) => atto.settori.includes(id));
  const esito: Applicabilita = settoreDiverso ? "non_applicabile" : esitoSoglie(atto, cliente);

  // Il testo libero non è calcolabile: impedisce un esito certo.
  if (atto.criteriTesto.trim() !== "") return "da_verificare";
  return esito;
}
