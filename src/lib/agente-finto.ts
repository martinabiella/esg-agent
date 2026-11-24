// Solo per i test: client Parallel e archivio delle Ricerche in memoria, con le
// stesse regole del database (src/db/ricerche.ts).

import type { AttoCatalogo } from "./atto-citato";
import type { ArchivioEsecuzioni, DipendenzeEsecuzione, FonteDaControllare, NuovaEsecuzione } from "./esecuzione";
import type { ClientParallel, RichiestaTaskRun, RisultatoTaskRun } from "./parallel";
import type { EsitoRicerca, NotiziaDaSalvare } from "./ricerca-fonte";

export const ORA = new Date("2026-11-19T06:00:00Z");

export type RicercaFinta = {
  id: number;
  fonteId: number;
  avviataIl: Date;
  parallelRunId: string | null;
  esito: EsitoRicerca;
  errore: string | null;
  notizieCreate: number;
};

export type NotiziaFinta = NotiziaDaSalvare & { id: number };

export class ArchivioFinto implements ArchivioEsecuzioni {
  fonti: FonteDaControllare[] = [];
  ricerche: RicercaFinta[] = [];
  notizie: NotiziaFinta[] = [];
  ultimaRiuscita = new Map<number, Date>();
  atti: AttoCatalogo[] = [];

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
      this.ricerche.push({ id, fonteId, avviataIl, parallelRunId: null, esito, errore: null, notizieCreate: 0 });
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
  // Come il DB: solo se la Ricerca è ancora in corso, e un URL già presente non
  // crea una seconda Notizia (vincolo unique su notizia.url).
  async completaRicerca(id: number, notizie: NotiziaDaSalvare[]) {
    const r = this.ricerche.find((x) => x.id === id);
    if (!r || r.esito !== "in_corso") return null;
    const nuove = notizie.filter((n) => !this.notizie.some((e) => e.url === n.url));
    for (const n of nuove) this.notizie.push({ ...n, id: this.notizie.length + 1 });
    Object.assign(r, { esito: "completata", notizieCreate: nuove.length });
    return { notizieCreate: nuove.length };
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
