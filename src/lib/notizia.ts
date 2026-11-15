import { idIntero } from "./id";

type ParametriNotizia = Record<string, string | string[] | undefined>;

export function notiziaIdDaParams(params: ParametriNotizia): number | null {
  const valore = params.notizia;
  return Array.isArray(valore) ? null : idIntero(valore);
}
