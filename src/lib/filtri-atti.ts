// Filtri dell'elenco Atti letti dalla query string. I valori non validi sono
// ignorati (filtro vuoto), mai un errore.
import { stato } from "../db/schema";
import { idIntero } from "./id";

export type StatoAtto = (typeof stato.enumValues)[number];

export type FiltriAtti = {
  settoreId?: number;
  temaId?: number;
  stato?: StatoAtto;
};

type Params = Record<string, string | string[] | undefined>;

export function filtriAttiDaParams(params: Params): FiltriAtti {
  const filtri: FiltriAtti = {};
  const settoreId = idIntero(params.settore);
  if (settoreId !== null) filtri.settoreId = settoreId;
  const temaId = idIntero(params.tema);
  if (temaId !== null) filtri.temaId = temaId;
  const s = params.stato;
  if (typeof s === "string" && (stato.enumValues as readonly string[]).includes(s)) {
    filtri.stato = s as StatoAtto;
  }
  return filtri;
}
