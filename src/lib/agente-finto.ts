// Solo per i test: client Parallel e archivio delle Ricerche in memoria, con le
// stesse regole del database (src/db/ricerche.ts).

import type { AttoDaCreare } from "./atti-nuovi";
import { type AttoCatalogo, chiaveIdentificativo } from "./atto-citato";
import type { CambioApplicato, StatoAtto } from "./cambi-di-stato";
import type { ArchivioEsecuzioni, DipendenzeEsecuzione, FonteDaControllare, NuovaEsecuzione } from "./esecuzione";
import type { ClientParallel, RichiestaTaskRun, RisultatoTaskRun } from "./parallel";
import type { EsitoRicerca, NotiziaDaSalvare, SettoreConDescrizione } from "./ricerca-fonte";

export const ORA = new Date("2026-11-19T06:00:00Z");

export type RicercaFinta = {
  id: number;
  fonteId: number;
  avviataIl: Date;
  parallelRunId: string | null;
  esito: EsitoRicerca;
  errore: string | null;
  notizieCreate: number;
  attiCreati: number;
};

// Salvata: i collegamenti agli Atti nuovi sono già risolti in `atti`.
export type NotiziaFinta = Omit<NotiziaDaSalvare, "attiNuovi"> & { id: number };

export class ArchivioFinto implements ArchivioEsecuzioni {
  fonti: FonteDaControllare[] = [];
  ricerche: RicercaFinta[] = [];
  notizie: NotiziaFinta[] = [];
  ultimaRiuscita = new Map<number, Date>();
  atti: AttoCatalogo[] = [];
  stati: StatoAtto[] = [];
  // Le voci aggiunte allo storico dall'agente e la data di conferma dello Stato.
  storico: { attoId: number; stato: CambioApplicato["stato"]; data: string }[] = [];
  statoConfermatoIl = new Map<number, Date>();
  settori: SettoreConDescrizione[] = [];
  temi: string[] = [];
  // Gli Atti nati da una Ricerca, con la Fonte di origine.
  attiCreati: (AttoDaCreare & { id: number; fonteId: number })[] = [];

  async fontiDaControllare() {
    return this.fonti;
  }
  // Come il DB: l'esecuzione non si apre se c'è una Ricerca in corso avviata
  // dopo bloccanteDal.
  async apriEsecuzione({ avviataIl, daAvviare, saltate, bloccanteDal }: NuovaEsecuzione) {
    const bloccanti = this.ricerche.filter((r) => r.esito === "in_corso" && r.avviataIl > bloccanteDal);
    if (bloccanti.length > 0) {
      const inCorsoDal = new Date(Math.max(...bloccanti.map((r) => r.avviataIl.getTime())));
      return { esito: "bloccata" as const, inCorsoDal };
    }
    const registra = (fonteId: number, esito: EsitoRicerca) => {
      const id = this.ricerche.length + 1;
      this.ricerche.push({ id, fonteId, avviataIl, parallelRunId: null, esito, errore: null, notizieCreate: 0, attiCreati: 0 });
      return { fonteId, ricercaId: id };
    };
    const ricerche = daAvviare.map((fonteId) => registra(fonteId, "in_corso"));
    for (const fonteId of saltate) registra(fonteId, "saltata_per_tetto");
    return { esito: "aperta" as const, ricerche };
  }
  async chiudiRicercheScadute(avviatePrima: Date, errore: string) {
    const scadute = this.ricerche.filter(
      (r) => r.esito === "in_corso" && r.parallelRunId === null && r.avviataIl < avviatePrima,
    );
    for (const r of scadute) Object.assign(r, { esito: "fallita", errore });
    return scadute.length;
  }

  async ultimaRicercaRiuscita(fonteId: number) {
    return this.ultimaRiuscita.get(fonteId) ?? null;
  }
  async assegnaRun(ricercaId: number, runId: string) {
    const r = this.ricerche.find((x) => x.id === ricercaId);
    if (r) r.parallelRunId = runId;
  }
  async ricercaPerRunId(runId: string) {
    const r = this.ricerche.find((x) => x.parallelRunId === runId);
    return r ? { id: r.id, esito: r.esito } : null;
  }
  async attiCatalogo() {
    return this.atti;
  }
  async statiAtti() {
    return this.stati;
  }
  async settoriCatalogo() {
    return this.settori;
  }
  async nomiTemi() {
    return this.temi;
  }
  // Come il DB: solo se la Ricerca è ancora in corso. Un URL già presente non
  // crea una seconda Notizia (vincolo unique su notizia.url); un identificativo
  // già presente non crea un secondo Atto (unique su identificativo_ufficiale);
  // i Temi nuovi si creano senza distinguere le maiuscole; i Settori mai.
  // I cambi di Stato valgono solo per Atti non Non rilevanti né abrogati, con data
  // successiva all'ultima dello storico; le voci identiche non si duplicano.
  async completaRicerca(id: number, notizie: NotiziaDaSalvare[], atti: AttoDaCreare[], cambi: CambioApplicato[] = []) {
    const r = this.ricerche.find((x) => x.id === id);
    if (!r || r.esito !== "in_corso") return null;

    const nuoviAtti = atti.filter(
      (a) => !this.atti.some((e) => e.identificativoUfficiale && chiaveIdentificativo(e.identificativoUfficiale) === chiaveIdentificativo(a.identificativoUfficiale)),
    );
    for (const a of nuoviAtti) {
      const nuovo = { ...a, id: this.atti.length + 1, fonteId: r.fonteId };
      this.attiCreati.push(nuovo);
      this.atti.push({
        id: nuovo.id,
        titolo: a.titolo,
        identificativoUfficiale: a.identificativoUfficiale,
        giurisdizione: a.giurisdizione,
        nonRilevante: false,
      });
      for (const t of a.temi) {
        if (!this.temi.some((e) => e.toLowerCase() === t.toLowerCase())) this.temi.push(t);
      }
    }

    const nuove = notizie.filter((n) => !this.notizie.some((e) => e.url === n.url));
    for (const { attiNuovi, ...n } of nuove) {
      const daNuovi = this.atti.filter(
        (a) =>
          !a.nonRilevante &&
          a.identificativoUfficiale !== null &&
          attiNuovi.some((i) => chiaveIdentificativo(i) === chiaveIdentificativo(a.identificativoUfficiale ?? "")),
      );
      const collegati = [...new Set([...n.atti, ...daNuovi.map((a) => a.id)])];
      this.notizie.push({ ...n, atti: collegati, id: this.notizie.length + 1 });
    }
    let cambiDiStato = 0;
    for (const c of [...cambi].sort((a, b) => a.data.localeCompare(b.data))) {
      const stato = this.stati.find((s) => s.attoId === c.attoId);
      const atto = this.atti.find((a) => a.id === c.attoId);
      if (!stato || !atto || atto.nonRilevante || stato.stato === "abrogato") continue;
      if (stato.ultimaDataStato !== null && c.data <= stato.ultimaDataStato) continue;
      if (this.storico.some((v) => v.attoId === c.attoId && v.stato === c.stato && v.data === c.data)) continue;
      this.storico.push({ attoId: c.attoId, stato: c.stato, data: c.data });
      Object.assign(stato, { stato: c.stato, ultimaDataStato: c.data });
      this.statoConfermatoIl.set(c.attoId, ORA);
      cambiDiStato++;
    }
    Object.assign(r, { esito: "completata", notizieCreate: nuove.length, attiCreati: nuoviAtti.length });
    return { notizieCreate: nuove.length, attiCreati: nuoviAtti.length, cambiDiStato };
  }
  async segnaFallita(id: number, errore: string) {
    const r = this.ricerche.find((x) => x.id === id);
    if (!r || r.esito !== "in_corso") return false;
    Object.assign(r, { esito: "fallita", errore });
    return true;
  }
}

export class ClientFinto implements ClientParallel {
  richieste: RichiestaTaskRun[] = [];
  risultati = new Map<string, RisultatoTaskRun>();
  falliscePer = new Map<string, Error>();

  async avviaTaskRun(richiesta: RichiestaTaskRun) {
    const errore = this.falliscePer.get(String(richiesta.metadata.fonte_nome));
    if (errore) throw errore;
    this.richieste.push(richiesta);
    return { runId: `trun_${this.richieste.length}` };
  }
  async risultatoTaskRun(runId: string) {
    const risultato = this.risultati.get(runId);
    if (!risultato) throw new Error(`run ${runId} sconosciuto`);
    return risultato;
  }
}

export function dipendenze(tetto = 20) {
  const archivio = new ArchivioFinto();
  const client = new ClientFinto();
  const deps: DipendenzeEsecuzione = {
    archivio,
    client,
    urlWebhook: "https://esg.esempio.it/api/parallel/webhook",
    ora: () => ORA,
    tetto,
  };
  return { archivio, client, deps };
}
