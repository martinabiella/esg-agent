import { idIntero } from "./id";
import { urlHttpValido } from "./url";

type ParametriNotizia = Record<string, string | string[] | undefined>;

export function notiziaIdDaParams(params: ParametriNotizia): number | null {
  const valore = params.notizia;
  return Array.isArray(valore) ? null : idIntero(valore);
}

// ---- Validazione, condivisa tra modulo e azioni server ----

export type InputNotizia = {
  titolo?: string | null;
  fonte?: string | null;
  url?: string | null;
  data?: string | null;
  riassunto?: string | null;
  atti?: readonly string[];
};

// Valori pronti per il salvataggio: la data facoltativa vuota è null.
export type CampiNotizia = {
  titolo: string;
  fonte: string;
  url: string;
  data: string | null;
  riassunto: string;
  atti: number[];
};

// Quanto digitato, per riempire di nuovo il modulo dopo un errore.
export type ValoriNotizia = {
  titolo: string;
  fonte: string;
  url: string;
  data: string;
  riassunto: string;
  atti: string[];
};

export type ErroriNotizia = Partial<Record<keyof ValoriNotizia, string>>;

export type EsitoNotizia =
  | { ok: true; valori: CampiNotizia }
  | { ok: false; errori: ErroriNotizia; valori: ValoriNotizia };

const ANNO_MINIMO = 1900;

// Data reale (YYYY-MM-DD) tra il 1900 e oggi.
function dataPlausibile(testo: string, oggi: Date): boolean {
  const parti = /^(\d{4})-(\d{2})-(\d{2})$/.exec(testo);
  if (!parti) return false;
  const [anno, mese, giorno] = [Number(parti[1]), Number(parti[2]), Number(parti[3])];
  const d = new Date(Date.UTC(anno, mese - 1, giorno));
  if (d.getUTCFullYear() !== anno || d.getUTCMonth() !== mese - 1 || d.getUTCDate() !== giorno) {
    return false;
  }
  return anno >= ANNO_MINIMO && testo <= oggi.toISOString().slice(0, 10);
}

export function validaNotizia(input: InputNotizia, oggi: Date = new Date()): EsitoNotizia {
  const grezzi: ValoriNotizia = {
    titolo: input.titolo ?? "",
    fonte: input.fonte ?? "",
    url: input.url ?? "",
    data: input.data ?? "",
    riassunto: input.riassunto ?? "",
    atti: [...(input.atti ?? [])],
  };
  const errori: ErroriNotizia = {};

  const titolo = grezzi.titolo.trim();
  if (!titolo) errori.titolo = "Il titolo è obbligatorio.";
  const fonte = grezzi.fonte.trim();
  if (!fonte) errori.fonte = "Indica chi ha pubblicato la Notizia.";

  const url = grezzi.url.trim();
  if (!url) {
    errori.url = "L'URL è obbligatorio.";
  } else if (!urlHttpValido(url)) {
    errori.url = "Indica un URL valido che inizi con http:// o https://.";
  }

  const testoData = grezzi.data.trim();
  if (testoData && !dataPlausibile(testoData, oggi)) {
    errori.data = `Indica una data valida (AAAA-MM-GG) tra il ${ANNO_MINIMO} e oggi.`;
  }

  const idAtti = grezzi.atti.map((a) => idIntero(a));
  if (idAtti.some((id) => id === null)) errori.atti = "Atto non valido.";
  const atti = [...new Set(idAtti.filter((id): id is number => id !== null))];

  if (Object.keys(errori).length > 0) return { ok: false, errori, valori: grezzi };

  return {
    ok: true,
    valori: { titolo, fonte, url, data: testoData || null, riassunto: grezzi.riassunto.trim(), atti },
  };
}
