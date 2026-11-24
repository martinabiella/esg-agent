// L'avviso dell'agente in testa al summary di un Atto: da quale articolo
// vengono i dati e su cosa gli articoli trovati sono in disaccordo. Sta nel
// summary, come righe con un prefisso fisso, così la scheda dell'Atto può
// mostrarlo in un riquadro a parte e una persona può toglierlo cancellando le righe.
// Vocabolario: vedi GLOSSARY.md

export type AvvisoAgente = { daNotizia: string | null; discrepanze: string[] };

const PREFISSO = "[Agente] ";
const ORIGINE = "Dati presi da: ";
const DISCORDANZA = "Dati discordanti: ";

// Una riga sola: un a capo spezzerebbe l'avviso e il resto finirebbe nel summary.
const inUnaRiga = (testo: string) => testo.replace(/\s+/g, " ").trim();

export function componiSummaryAgente(summary: string, avviso: AvvisoAgente): string {
  const righe = [
    ...(avviso.daNotizia ? [`${PREFISSO}${ORIGINE}${inUnaRiga(avviso.daNotizia)}`] : []),
    ...avviso.discrepanze.map((d) => `${PREFISSO}${DISCORDANZA}${inUnaRiga(d)}`),
  ];
  return righe.length === 0 ? summary : `${righe.join("\n")}\n\n${summary}`;
}

// Solo le righe in testa con il prefisso contano: lo stesso testo più in basso
// è summary come un altro.
export function separaAvvisoAgente(summary: string): { avviso: AvvisoAgente | null; testo: string } {
  const righe = summary.split("\n");
  const avviso: AvvisoAgente = { daNotizia: null, discrepanze: [] };
  let i = 0;
  for (; i < righe.length && righe[i].startsWith(PREFISSO); i++) {
    const corpo = righe[i].slice(PREFISSO.length);
    if (corpo.startsWith(ORIGINE)) avviso.daNotizia = corpo.slice(ORIGINE.length);
    else if (corpo.startsWith(DISCORDANZA)) avviso.discrepanze.push(corpo.slice(DISCORDANZA.length));
    else break;
  }
  if (i === 0) return { avviso: null, testo: summary };
  return { avviso, testo: righe.slice(i).join("\n").replace(/^\n+/, "") };
}
