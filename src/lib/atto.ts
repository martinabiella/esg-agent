import { idIntero } from "./id";
import { paeseValido, CODICI_UE } from "./paesi";
import { validaTipoAtto, type GiurisdizioneAtto, type TipoAtto } from "./tipi-atto";

export type CampoSoglia = "dipendenti" | "fatturato" | "paesi";

export type SogliaModulo = {
  campo: CampoSoglia;
  minimo: string;
  massimo: string;
  paesi: string[];
};

/**
 * Versione corrente della forma JSON delle soglie.
 * I valori numerici sono stringhe solo per il fatturato, così non si perdono
 * cifre durante il passaggio JavaScript/Postgres.
 */
export type CriteriSoglie = {
  versione: 1;
  minimoSoglie: number;
  soglie: (
    | { campo: "dipendenti"; minimo: number | null; massimo: number | null }
    | { campo: "fatturato"; minimo: string | null; massimo: string | null }
    | { campo: "paesi"; paesi: string[] }
  )[];
};

export type RelazioneModulo = {
  tipo: "recepisce" | "modifica" | "sostituisce";
  attoId: string;
};

export type ValoriModuloAtto = {
  titolo: string;
  identificativoUfficiale: string;
  giurisdizione: string;
  tipo: string;
  stato: string;
  dataStato: string;
  summary: string;
  urlTesto: string;
  recepimentoEntro: string;
  tuttiISettori: boolean;
  settori: string[];
  temi: string[];
  nuovoTema: string;
  criteriTesto: string;
  soglie: SogliaModulo[];
  minimoSoglie: string;
  relazioni: RelazioneModulo[];
  nonRilevante: boolean;
};

export type ErroriAtto = Partial<Record<keyof ValoriModuloAtto | "relazioni", string>>;

export type CampiAtto = {
  titolo: string;
  identificativoUfficiale: string | null;
  giurisdizione: GiurisdizioneAtto;
  tipo: TipoAtto;
  stato: "proposta" | "in_discussione" | "approvato" | "in_vigore" | "modificato" | "abrogato";
  dataStato: string;
  summary: string;
  urlTesto: string | null;
  recepimentoEntro: string | null;
  tuttiISettori: boolean;
  settori: number[];
  temi: number[];
  nuovoTema: string | null;
  criteriTesto: string;
  criteriSoglie: CriteriSoglie | null;
  relazioni: { tipo: RelazioneModulo["tipo"]; attoId: number }[];
  nonRilevante: boolean;
};

export type EsitoAtto =
  | { ok: true; valori: CampiAtto }
  | { ok: false; errori: ErroriAtto; valori: ValoriModuloAtto };

const STATI = ["proposta", "in_discussione", "approvato", "in_vigore", "modificato", "abrogato"] as const;
const TIPI_RELAZIONE = ["recepisce", "modifica", "sostituisce"] as const;
const INT4_MAX = 2147483647;

function testo(valore: unknown): string {
  return typeof valore === "string" ? valore : "";
}

function elenco(valore: unknown): string[] {
  return Array.isArray(valore) ? valore.filter((v): v is string => typeof v === "string") : [];
}

function dataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const [anno, mese, giorno] = data.split("-").map(Number);
  const d = new Date(Date.UTC(anno, mese - 1, giorno));
  return d.getUTCFullYear() === anno && d.getUTCMonth() === mese - 1 && d.getUTCDate() === giorno;
}

function decimale(valore: string): { intero: string; frazione: string } | null {
  const match = /^(\d{1,30})(?:[.,](\d{1,6}))?$/.exec(valore.trim());
  if (!match) return null;
  return {
    intero: match[1].replace(/^0+(?=\d)/, ""),
    frazione: (match[2] ?? "").padEnd(6, "0"),
  };
}

function confrontoDecimali(a: string, b: string): number {
  const aa = decimale(a);
  const bb = decimale(b);
  if (!aa || !bb) return 0;
  const interi = aa.intero.length - bb.intero.length || (aa.intero < bb.intero ? -1 : aa.intero > bb.intero ? 1 : 0);
  return interi || (aa.frazione < bb.frazione ? -1 : aa.frazione > bb.frazione ? 1 : 0);
}

function soglieDaInput(valore: string): { soglie: SogliaModulo[]; valido: boolean } {
  if (!valore.trim()) return { soglie: [], valido: true };
  try {
    const parsed: unknown = JSON.parse(valore);
    if (!Array.isArray(parsed)) return { soglie: [], valido: false };
    const soglie = parsed.map((s): SogliaModulo => {
      const voce = s && typeof s === "object" ? s as Record<string, unknown> : {};
      return {
        campo: voce.campo === "fatturato" || voce.campo === "paesi" ? voce.campo : "dipendenti",
        minimo: testo(voce.minimo),
        massimo: testo(voce.massimo),
        paesi: elenco(voce.paesi),
      };
    });
    return { soglie, valido: true };
  } catch {
    return { soglie: [], valido: false };
  }
}

function soglieValide(
  soglie: SogliaModulo[],
  minimoSoglie: string,
  errori: ErroriAtto,
): CriteriSoglie | null {
  const risultato: CriteriSoglie["soglie"] = [];
  for (const soglia of soglie) {
    if (soglia.campo === "paesi") {
      const paesi = [...new Set(soglia.paesi)];
      if (paesi.length === 0 || paesi.some((p) => p !== "UE" && !paeseValido(p))) {
        errori.soglie = "Indica almeno un Paese valido per ogni Soglia sui paesi.";
      } else if (paesi.includes("UE") && paesi.length > 1) {
        errori.soglie = "La scorciatoia UE non può essere usata insieme ad altri paesi.";
      } else {
        risultato.push({ campo: "paesi", paesi });
      }
      continue;
    }

    const minimo = soglia.campo === "dipendenti"
      ? (/^\d+$/.test(soglia.minimo.trim()) && Number(soglia.minimo) <= INT4_MAX ? Number(soglia.minimo) : null)
      : (soglia.minimo.trim() ? decimale(soglia.minimo) ? soglia.minimo.trim().replace(",", ".") : null : null);
    const massimo = soglia.campo === "dipendenti"
      ? (/^\d+$/.test(soglia.massimo.trim()) && Number(soglia.massimo) <= INT4_MAX ? Number(soglia.massimo) : null)
      : (soglia.massimo.trim() ? decimale(soglia.massimo) ? soglia.massimo.trim().replace(",", ".") : null : null);

    if (soglia.minimo.trim() && minimo === null) errori.soglie = "Le soglie devono contenere numeri validi.";
    if (soglia.massimo.trim() && massimo === null) errori.soglie = "Le soglie devono contenere numeri validi.";
    if (minimo !== null && massimo !== null) {
      const confronto = soglia.campo === "dipendenti"
        ? Number(minimo) - Number(massimo)
        : confrontoDecimali(String(minimo), String(massimo));
      if (confronto >= 0) errori.soglie = "Il minimo deve essere minore del massimo.";
    }
    risultato.push({ campo: soglia.campo, minimo, massimo } as CriteriSoglie["soglie"][number]);
  }

  let minimo = minimoSoglie.trim() ? Number(minimoSoglie) : risultato.length;
  if (!Number.isInteger(minimo) || minimo < 1 || minimo > risultato.length) {
    if (risultato.length === 0 && !minimoSoglie.trim()) minimo = 0;
    else errori.minimoSoglie = `Indica un numero tra 1 e ${risultato.length}.`;
  }
  if (Object.keys(errori).some((k) => k === "soglie" || k === "minimoSoglie")) return null;
  return { versione: 1, minimoSoglie: minimo, soglie: risultato };
}

function valoriGrezzi(input: Partial<ValoriModuloAtto> & { soglieJson?: string }): ValoriModuloAtto {
  const soglie = input.soglie ?? soglieDaInput(input.soglieJson ?? "").soglie;
  return {
    titolo: testo(input.titolo),
    identificativoUfficiale: testo(input.identificativoUfficiale),
    giurisdizione: testo(input.giurisdizione),
    tipo: testo(input.tipo),
    stato: testo(input.stato),
    dataStato: testo(input.dataStato),
    summary: testo(input.summary),
    urlTesto: testo(input.urlTesto),
    recepimentoEntro: testo(input.recepimentoEntro),
    tuttiISettori: input.tuttiISettori === true,
    settori: elenco(input.settori),
    temi: elenco(input.temi),
    nuovoTema: testo(input.nuovoTema),
    criteriTesto: testo(input.criteriTesto),
    soglie,
    minimoSoglie: testo(input.minimoSoglie),
    relazioni: input.relazioni ?? [],
    nonRilevante: input.nonRilevante === true,
  };
}

export function validaAtto(input: Partial<ValoriModuloAtto> & { soglieJson?: string }): EsitoAtto {
  const parsingSoglie = input.soglie === undefined ? soglieDaInput(input.soglieJson ?? "") : { soglie: input.soglie, valido: true };
  const valori = valoriGrezzi({ ...input, soglie: parsingSoglie.soglie });
  const errori: ErroriAtto = {};
  if (!parsingSoglie.valido) errori.soglie = "Il formato delle Soglie non è valido.";
  const titolo = valori.titolo.trim();
  if (!titolo) errori.titolo = "Il Titolo è obbligatorio.";

  const identificativo = valori.identificativoUfficiale.trim() || null;
  const giurisdizione = valori.giurisdizione;
  if (giurisdizione !== "ue" && giurisdizione !== "italia") errori.giurisdizione = "La Giurisdizione è obbligatoria.";
  const validazioneTipo = validaTipoAtto(valori.tipo, giurisdizione === "ue" ? "ue" : "italia");
  if (giurisdizione !== "ue" && giurisdizione !== "italia") errori.tipo = "Scegli prima una Giurisdizione.";
  else if (!validazioneTipo.ok) errori.tipo = validazioneTipo.errore;
  if (!STATI.includes(valori.stato as typeof STATI[number])) errori.stato = "Lo Stato è obbligatorio.";
  if (!dataValida(valori.dataStato)) errori.dataStato = "Indica una data valida.";
  const recepimentoEntro = valori.recepimentoEntro.trim() || null;
  if (recepimentoEntro !== null && !dataValida(recepimentoEntro)) {
    errori.recepimentoEntro = "Indica una data valida.";
  }

  let urlTesto: string | null = null;
  if (valori.urlTesto.trim()) {
    try {
      const url = new URL(valori.urlTesto.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      urlTesto = url.toString();
    } catch {
      errori.urlTesto = "Il link deve iniziare con http:// o https://.";
    }
  }

  const settori = [...new Set(valori.settori.map(idIntero).filter((id): id is number => id !== null))];
  if (valori.settori.some((id) => idIntero(id) === null)) errori.settori = "Settore non valido.";
  if (valori.tuttiISettori && settori.length > 0) errori.settori = "Scegli tutti i Settori oppure Settori specifici, non entrambi.";

  const temi = [...new Set(valori.temi.map(idIntero).filter((id): id is number => id !== null))];
  if (valori.temi.some((id) => idIntero(id) === null)) errori.temi = "Tema non valido.";
  const relazioni: { tipo: RelazioneModulo["tipo"]; attoId: number }[] = [];
  let relazioniValide = true;
  for (const relazione of valori.relazioni) {
    const tipo = TIPI_RELAZIONE.includes(relazione.tipo) ? relazione.tipo : null;
    const attoId = idIntero(relazione.attoId);
    if (!tipo || attoId === null) relazioniValide = false;
    else relazioni.push({ tipo, attoId });
  }
  if (!relazioniValide) errori.relazioni = "Ogni Relazione deve avere un tipo e un Atto valido.";

  const soglie = soglieValide(valori.soglie, valori.minimoSoglie, errori);
  if (valori.soglie.length === 0 && valori.minimoSoglie.trim()) errori.minimoSoglie = "Non puoi indicare un minimo senza Soglie.";

  if (Object.keys(errori).length > 0 || !soglie) return { ok: false, errori, valori };
  return {
    ok: true,
    valori: {
      titolo,
      identificativoUfficiale: identificativo,
      giurisdizione: giurisdizione as GiurisdizioneAtto,
      tipo: valori.tipo as TipoAtto,
      stato: valori.stato as CampiAtto["stato"],
      dataStato: valori.dataStato,
      summary: valori.summary.trim(),
      urlTesto,
      recepimentoEntro,
      tuttiISettori: valori.tuttiISettori,
      settori,
      temi,
      nuovoTema: valori.nuovoTema.trim() || null,
      criteriTesto: valori.criteriTesto.trim(),
      criteriSoglie: soglie.soglie.length > 0 ? soglie : null,
      relazioni,
      nonRilevante: valori.nonRilevante,
    },
  };
}

export function validaRelazioni(
  relazioni: { tipo: RelazioneModulo["tipo"]; attoId: number }[],
  attoId: number | null,
  giurisdizione: GiurisdizioneAtto,
  giurisdizioniDestinazioni: Map<number, GiurisdizioneAtto>,
): string | null {
  const viste = new Set<string>();
  for (const relazione of relazioni) {
    if (attoId !== null && relazione.attoId === attoId) return "Un Atto non può essere collegato a se stesso.";
    const chiave = `${relazione.tipo}:${relazione.attoId}`;
    if (viste.has(chiave)) return "La stessa Relazione non può essere inserita due volte.";
    viste.add(chiave);
    const destinazione = giurisdizioniDestinazioni.get(relazione.attoId);
    if (!destinazione) return "Uno degli Atti collegati non esiste più.";
    if (relazione.tipo === "recepisce" && (giurisdizione !== "italia" || destinazione !== "ue")) {
      return "Una Relazione recepisce richiede un Atto italiano che recepisca un Atto UE.";
    }
  }
  return null;
}

export function sogliaModuloDaJson(valore: unknown): { soglie: SogliaModulo[]; minimoSoglie: string } {
  if (!valore || typeof valore !== "object") return { soglie: [], minimoSoglie: "" };
  const obj = valore as { soglie?: unknown; minimoSoglie?: unknown; minimo_soglie?: unknown };
  const soglie = Array.isArray(obj.soglie)
    ? obj.soglie.map((s): SogliaModulo => {
        const voce = s as Record<string, unknown>;
        return {
          campo: voce.campo === "fatturato" || voce.campo === "paesi" ? voce.campo : "dipendenti",
          minimo: voce.minimo == null ? "" : String(voce.minimo),
          massimo: voce.massimo == null ? "" : String(voce.massimo),
          paesi: elenco(voce.paesi),
        };
      })
    : [];
  return { soglie, minimoSoglie: obj.minimoSoglie == null ? String(obj.minimo_soglie ?? "") : String(obj.minimoSoglie) };
}

export function paeseUe(codice: string): boolean {
  return (CODICI_UE as readonly string[]).includes(codice);
}
