// Vocabolario: vedi GLOSSARY.md (Notizia, Atto normativo)
//
// Valori iniziali del form di creazione Atto quando parte da una Notizia che
// segnala una nuova normativa. Sono solo suggerimenti: la persona li modifica.
import type { ValoriModuloAtto } from "./atto";
import { tipoAmmesso, type GiurisdizioneAtto, type TipoAtto } from "./tipi-atto";

function giurisdizioneSuggerita(titolo: string, url: string): GiurisdizioneAtto | "" {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {}
  if (host === "europa.eu" || host.endsWith(".europa.eu")) return "ue";
  if (host.endsWith(".it")) return "italia";
  const t = titolo.toLowerCase();
  if (/\b(ue|unione europea|commissione europea|parlamento europeo)\b/.test(t)) return "ue";
  if (/\b(italia|italiano|italiana|governo|gazzetta ufficiale)\b|decreto legislativo|disegno di legge|d\.lgs/.test(t)) return "italia";
  return "";
}

const INDIZI_TIPO: [RegExp, TipoAtto][] = [
  [/disegno di legge|\bddl\b/, "disegno_di_legge"],
  [/decreto legislativo|d\.lgs/, "decreto_legislativo"],
  [/\bdecreto\b/, "decreto"],
  [/\blegge\b/, "legge"],
  [/\bdirettiva\b/, "direttiva"],
  [/\bregolamento\b/, "regolamento"],
  [/\bdecisione\b/, "decisione"],
];

export function valoriAttoDaNotizia(
  notizia: { titolo: string; url: string },
  oggi: string = new Date().toISOString().slice(0, 10),
): ValoriModuloAtto {
  const giurisdizione = giurisdizioneSuggerita(notizia.titolo, notizia.url);
  const titolo = notizia.titolo.toLowerCase();
  const tipoTrovato = INDIZI_TIPO.find(([indizio]) => indizio.test(titolo))?.[1];
  const tipo = giurisdizione && tipoTrovato && tipoAmmesso(tipoTrovato, giurisdizione) ? tipoTrovato : "";
  return {
    titolo: notizia.titolo,
    identificativoUfficiale: "",
    giurisdizione,
    tipo,
    stato: "in_discussione",
    dataStato: oggi,
    summary: "",
    urlTesto: notizia.url,
    recepimentoEntro: "",
    tuttiISettori: false,
    settori: [],
    temi: [],
    nuovoTema: "",
    criteriTesto: "",
    soglie: [],
    minimoSoglie: "",
    relazioni: [],
    nonRilevante: false,
  };
}

// Il pulsante e l'azione valgono solo per una Notizia che segnala una novità e non ha Atti collegati.
export function puoCreareAttoDaNotizia(notizia: { segnalaNovita: boolean; atti: readonly unknown[] }): boolean {
  return notizia.segnalaNovita && notizia.atti.length === 0;
}
