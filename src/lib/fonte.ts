// Validazione e regole delle Fonti, condivise tra modulo, azioni server e seed.
// Vocabolario: vedi GLOSSARY.md

import { idIntero } from "./id";
import { urlHttpValido } from "./url";

// La Fonte aperta nel drawer è nell'URL della pagina (?fonte=<id>).
export function fonteIdDaParams(params: Record<string, string | string[] | undefined>): number | null {
  const valore = params.fonte;
  return Array.isArray(valore) ? null : idIntero(valore);
}

export const TIPI_FONTE = ["ufficiale", "editoriale"] as const;
export type TipoFonte = (typeof TIPI_FONTE)[number];

export type InputFonte = {
  nome?: string | null;
  url?: string | null;
  tipo?: string | null;
};

// Valori pronti per il salvataggio.
export type CampiFonte = { nome: string; url: string; tipo: TipoFonte };

// Quanto digitato, per riempire di nuovo il modulo dopo un errore.
export type ValoriFonte = { nome: string; url: string; tipo: string };

export type ErroriFonte = Partial<Record<keyof ValoriFonte, string>>;

export type EsitoFonte =
  | { ok: true; valori: CampiFonte }
  | { ok: false; errori: ErroriFonte; valori: ValoriFonte };

// ---- Unicità ----
// URL e nome sono unici senza distinguere maiuscole né barra finale. Queste
// funzioni devono restare identiche agli indici unici di `fonte` in
// src/db/schema.ts: lower(rtrim(url, '/')) e lower(nome). Il lower() di
// Postgres (C.UTF-8) e toLowerCase coincidono sulle lettere accentate latine;
// divergono solo su casi rari come İ e il sigma finale, dove il DB rifiuta
// comunque il duplicato ma il modulo mostra un messaggio generico.

export function chiaveUrl(url: string): string {
  return url.toLowerCase().replace(/\/+$/, "");
}

export function chiaveNome(nome: string): string {
  return nome.toLowerCase();
}

// ---- Ultimo controllo di una Fonte, dall'ultima Ricerca ----
// Non è uno Stato (quello è degli Atti): dice se l'agente riesce a leggere la Fonte.

// L'ultima Ricerca per la Fonte che si è conclusa: quelle in corso non contano.
export type UltimaRicerca = {
  esito: "completata" | "fallita" | "saltata_per_tetto";
  avviataIl: Date;
  errore: string | null;
};

// `data` è l'avvio della Ricerca, lo stesso istante confrontato con il cambio di URL.
export type ControlloFonte =
  | { esito: "mai_controllata" }
  | { esito: "controllata"; data: Date }
  | { esito: "non_leggibile"; data: Date; motivo: string | null }
  | { esito: "saltata_per_tetto"; data: Date };

// Basta l'ultima Ricerca conclusa in assoluto: se ce n'è una avviata dopo il
// cambio di URL, è lei la più recente; altrimenti la Fonte riparte da "mai
// controllata". Stessa regola di ultimaRicercaRiuscita in src/db/ricerche.ts.
export function controlloFonte(urlModificatoIl: Date, ultima: UltimaRicerca | null): ControlloFonte {
  if (!ultima || ultima.avviataIl < urlModificatoIl) return { esito: "mai_controllata" };
  const data = ultima.avviataIl;
  switch (ultima.esito) {
    case "completata":
      return { esito: "controllata", data };
    case "fallita":
      return { esito: "non_leggibile", data, motivo: ultima.errore };
    case "saltata_per_tetto":
      return { esito: "saltata_per_tetto", data };
  }
}

export function validaFonte(input: InputFonte): EsitoFonte {
  const grezzi: ValoriFonte = {
    nome: input.nome ?? "",
    url: input.url ?? "",
    tipo: input.tipo ?? "",
  };
  const errori: ErroriFonte = {};

  const nome = grezzi.nome.trim();
  if (!nome) errori.nome = "Il nome è obbligatorio.";
  const url = grezzi.url.trim();
  if (!url) {
    errori.url = "L'URL è obbligatorio.";
  } else if (!urlHttpValido(url)) {
    errori.url = "Indica un URL valido che inizi con http:// o https://.";
  }
  const tipo = TIPI_FONTE.find((t) => t === grezzi.tipo);
  if (!tipo) errori.tipo = "Scegli se la Fonte è ufficiale o editoriale.";

  if (!tipo || Object.keys(errori).length > 0) return { ok: false, errori, valori: grezzi };

  return { ok: true, valori: { nome, url, tipo } };
}
