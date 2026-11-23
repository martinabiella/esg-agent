// Quali candidati Atto proposti dall'agente diventano Atti del catalogo. Pura:
// la scrittura atomica sta in src/db/ricerche.ts. Riusa la deduplica di
// atto-citato.ts e le regole di validaAtto, le stesse della creazione manuale.
// Vocabolario: vedi GLOSSARY.md

import { type CriteriSoglie, validaAtto } from "./atto";
import { type AttoCatalogo, chiaveIdentificativo, chiaveTitoloAtto, trovaAttoCitato } from "./atto-citato";
import { componiSummaryAgente } from "./avviso-agente";
import { dataPlausibile } from "./notizia";
import type { AttoCandidato } from "./output-ricerca";
import type { GiurisdizioneAtto, TipoAtto } from "./tipi-atto";

const MAX_TEMI = 5;
const UN_GIORNO_MS = 24 * 60 * 60 * 1000;

export type SettoreCatalogo = { id: number; nome: string };

// Un Atto pronto per la scrittura: Provenienza «agente», Criteri non
// confermati e Stato non confermato li fissa la scrittura.
export type AttoDaCreare = {
  identificativoUfficiale: string;
  titolo: string;
  giurisdizione: GiurisdizioneAtto;
  tipo: TipoAtto;
  stato: AttoCandidato["stato"];
  dataStato: string;
  summary: string;
  urlTesto: string | null;
  criteriTesto: string;
  criteriSoglie: CriteriSoglie | null;
  tuttiISettori: boolean;
  settori: number[];
  // Nomi: quelli che non esistono si creano, senza distinguere le maiuscole.
  temi: string[];
};

// Un candidato che l'agente ha proposto e non diventa Atto: il motivo va nel
// log del server, non alla UI.
export type CandidatoScartato = { posizione: number; titolo: string; motivo: string };

export type DecisioneAttiNuovi = { daCreare: AttoDaCreare[]; scartati: CandidatoScartato[] };

function temiUnici(temi: readonly string[]): string[] {
  const visti = new Set<string>();
  return temi
    .map((t) => t.trim())
    .filter((t) => t && !visti.has(t.toLowerCase()) && visti.add(t.toLowerCase()))
    .slice(0, MAX_TEMI);
}

function idSettori(candidato: AttoCandidato, settori: readonly SettoreCatalogo[]): number[] {
  if (candidato.tuttiISettori) return [];
  const ids = candidato.settori.flatMap((nome) => {
    const chiave = chiaveTitoloAtto(nome);
    const trovato = settori.find((s) => chiaveTitoloAtto(s.nome) === chiave);
    return trovato ? [trovato.id] : [];
  });
  return [...new Set(ids)];
}

// Un candidato diventa Atto solo con un identificativo ufficiale, se il catalogo
// non lo ha già (nemmeno come Non rilevante), se non è ambiguo e se supera
// validaAtto. Altrimenti non si crea nulla: resta la Notizia, col suo flag.
export function decidiAttiNuovi(
  candidati: readonly AttoCandidato[],
  atti: readonly AttoCatalogo[],
  settori: readonly SettoreCatalogo[],
  ora: Date,
): DecisioneAttiNuovi {
  const oggi = ora.toISOString().slice(0, 10);
  const domani = new Date(ora.getTime() + UN_GIORNO_MS);
  const daCreare: AttoDaCreare[] = [];
  const scartati: CandidatoScartato[] = [];
  const visti = new Set<string>();

  candidati.forEach((c, i) => {
    const scarta = (motivo: string) => scartati.push({ posizione: i + 1, titolo: c.titolo, motivo });
    const identificativo = c.identificativoUfficiale?.trim();
    if (!identificativo) return scarta("senza identificativo ufficiale");

    const chiave = chiaveIdentificativo(identificativo);
    // Un identificativo già deciso (Atto da creare, o già in catalogo) non si
    // riprova; uno scartato sì: un secondo candidato può essere valido.
    if (visti.has(chiave)) return;

    const esito = trovaAttoCitato(
      { identificativoUfficiale: identificativo, titolo: c.titolo, giurisdizione: c.giurisdizione },
      atti,
    );
    if (esito.esito === "collegato" || esito.esito === "non_rilevante") {
      visti.add(chiave);
      return;
    }
    if (esito.esito === "ambiguo") return scarta("il catalogo ha più Atti che potrebbero coincidere (ambiguo)");

    const dataStato = c.dataStato && dataPlausibile(c.dataStato, domani) && c.dataStato <= oggi ? c.dataStato : oggi;
    const validato = validaAtto({
      titolo: c.titolo,
      identificativoUfficiale: identificativo,
      giurisdizione: c.giurisdizione,
      tipo: c.tipo,
      stato: c.stato,
      dataStato,
      summary: componiSummaryAgente(c.summary, { daNotizia: c.daNotizia, discrepanze: c.discrepanze }),
      urlTesto: c.urlTesto ?? "",
      criteriTesto: c.criteriTesto,
      soglie: c.soglie,
      tuttiISettori: c.tuttiISettori,
      settori: idSettori(c, settori).map(String),
      temi: [],
    });
    if (!validato.ok) return scarta(Object.values(validato.errori).join(" "));

    const v = validato.valori;
    visti.add(chiave);
    daCreare.push({
      identificativoUfficiale: identificativo,
      titolo: v.titolo,
      giurisdizione: v.giurisdizione,
      tipo: v.tipo,
      stato: v.stato,
      dataStato: v.dataStato,
      summary: v.summary,
      urlTesto: v.urlTesto,
      criteriTesto: v.criteriTesto,
      criteriSoglie: v.criteriSoglie,
      tuttiISettori: v.tuttiISettori,
      settori: v.settori,
      temi: temiUnici(c.temi),
    });
  });
  return { daCreare, scartati };
}
