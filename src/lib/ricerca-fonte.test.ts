import { test } from "node:test";
import assert from "node:assert/strict";
import type { AttoCatalogo } from "./atto-citato";
import { schemaOutputParallel } from "./output-ricerca";
import { type ClientParallel, ErroreParallel, type RichiestaTaskRun, type RisultatoTaskRun } from "./parallel";
import {
  type ArchivioRicerche,
  type DipendenzeRicerca,
  type FonteRicerca,
  type NotiziaDaSalvare,
  type NuovaRicerca,
  avviaRicercaPerFonte,
  avviaRicerchePerFonti,
  elaboraWebhook,
  finestraRicerca,
} from "./ricerca-fonte";

const ORA = new Date("2026-11-19T06:00:00Z");

test("finestraRicerca: senza Ricerche riuscite, gli ultimi 30 giorni", () => {
  assert.equal(finestraRicerca(null, ORA), "2026-10-20");
});

test("finestraRicerca: parte dal giorno in cui è stata avviata l'ultima Ricerca riuscita", () => {
  assert.equal(finestraRicerca(new Date("2026-11-12T05:59:00Z"), ORA), "2026-11-12");
});

// ---- Finti: client Parallel e archivio in memoria ----

type RicercaFinta = NuovaRicerca & { id: number; notizieCreate: number };
type NotiziaFinta = NotiziaDaSalvare & { id: number };

class ArchivioFinto implements ArchivioRicerche {
  ricerche: RicercaFinta[] = [];
  notizie: NotiziaFinta[] = [];
  ultimaRiuscita = new Map<number, Date>();
  atti: AttoCatalogo[] = [];

  async ultimaRicercaRiuscita(fonteId: number) {
    return this.ultimaRiuscita.get(fonteId) ?? null;
  }
  async registraRicerca(r: NuovaRicerca) {
    const id = this.ricerche.length + 1;
    this.ricerche.push({ ...r, id, notizieCreate: 0 });
    return id;
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
    const ultima = this.ultimaRiuscita.get(r.fonteId);
    if (!ultima || ultima < r.avviataIl) this.ultimaRiuscita.set(r.fonteId, r.avviataIl);
    return { notizieCreate: nuove.length };
  }
  async segnaFallita(id: number, errore: string) {
    const r = this.ricerche.find((x) => x.id === id);
    if (!r || r.esito !== "in_corso") return false;
    Object.assign(r, { esito: "fallita", errore });
    return true;
  }
}

class ClientFinto implements ClientParallel {
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

function dipendenze() {
  const archivio = new ArchivioFinto();
  const client = new ClientFinto();
  const deps: DipendenzeRicerca = {
    archivio,
    client,
    urlWebhook: "https://esg.esempio.it/api/parallel/webhook",
    ora: () => ORA,
  };
  return { archivio, client, deps };
}

const EUR_LEX: FonteRicerca = { id: 1, nome: "EUR-Lex", url: "https://eur-lex.europa.eu/", tipo: "ufficiale" };
const GAZZETTA: FonteRicerca = { id: 2, nome: "Gazzetta Ufficiale", url: "https://www.gazzettaufficiale.it/", tipo: "ufficiale" };

// ---- Avvio ----

test("avviaRicercaPerFonte: avvia su Parallel dalla finestra della Fonte e registra la Ricerca in corso", async () => {
  const { archivio, client, deps } = dipendenze();
  archivio.ultimaRiuscita.set(1, new Date("2026-11-12T06:00:00Z"));

  const esito = await avviaRicercaPerFonte(EUR_LEX, deps);

  assert.deepEqual(esito, { esito: "avviata", ricercaId: 1, runId: "trun_1" });
  const [richiesta] = client.richieste;
  assert.deepEqual(richiesta.source_policy, { include_domains: ["eur-lex.europa.eu"], after_date: "2026-11-12" });
  assert.deepEqual(richiesta.task_spec.output_schema, { type: "json", json_schema: schemaOutputParallel() });
  assert.deepEqual(richiesta.webhook, { url: deps.urlWebhook, event_types: ["task_run.status"] });
  assert.deepEqual(richiesta.metadata, { fonte_id: 1, fonte_nome: "EUR-Lex", versione_schema: 1 });
  assert.ok(richiesta.input.includes("EUR-Lex") && richiesta.input.includes("https://eur-lex.europa.eu/"));
  assert.ok(richiesta.input.includes("2026-11-12"));
  assert.deepEqual(archivio.ricerche, [
    { id: 1, fonteId: 1, avviataIl: ORA, parallelRunId: "trun_1", esito: "in_corso", errore: null, notizieCreate: 0 },
  ]);
});

test("avviaRicercaPerFonte: se Parallel rifiuta l'avvio, la Ricerca è fallita nel log con un motivo leggibile", async () => {
  const { archivio, client, deps } = dipendenze();
  client.falliscePer.set("EUR-Lex", new ErroreParallel(402, "Insufficient credit"));

  const esito = await avviaRicercaPerFonte(EUR_LEX, deps);

  const errore = "Parallel non ha avviato la Ricerca: credito esaurito.";
  assert.deepEqual(esito, { esito: "fallita", errore });
  assert.deepEqual(archivio.ricerche, [
    { id: 1, fonteId: 1, avviataIl: ORA, parallelRunId: null, esito: "fallita", errore, notizieCreate: 0 },
  ]);
});

test("avviaRicercaPerFonte: errori di rete o imprevisti diventano un motivo generico, senza dettagli tecnici", async () => {
  const { archivio, client, deps } = dipendenze();
  client.falliscePer.set("EUR-Lex", new TypeError("fetch failed: ECONNRESET 10.0.0.1"));

  const esito = await avviaRicercaPerFonte(EUR_LEX, deps);

  assert.deepEqual(esito, { esito: "fallita", errore: "Parallel non è raggiungibile: la Ricerca non è partita." });
  assert.equal(archivio.ricerche[0].errore, "Parallel non è raggiungibile: la Ricerca non è partita.");
});

test("avviaRicerchePerFonti: una Fonte che fallisce non impedisce l'avvio delle altre", async () => {
  const { archivio, client, deps } = dipendenze();
  const CAMERA: FonteRicerca = { id: 3, nome: "Camera dei deputati", url: "https://www.camera.it/", tipo: "ufficiale" };
  const SENATO: FonteRicerca = { id: 4, nome: "Senato della Repubblica", url: "https://www.senato.it/", tipo: "ufficiale" };
  client.falliscePer.set("Gazzetta Ufficiale", new ErroreParallel(429, "Too many requests"));
  // Un errore imprevisto del database su una Fonte.
  const originale = archivio.ultimaRicercaRiuscita.bind(archivio);
  archivio.ultimaRicercaRiuscita = async (fonteId) => {
    if (fonteId === 3) throw new Error("connessione al DB persa");
    return originale(fonteId);
  };

  const esiti = await avviaRicerchePerFonti([EUR_LEX, GAZZETTA, CAMERA, SENATO], deps);

  assert.deepEqual(
    esiti.map((e) => [e.fonteId, e.esito]),
    [
      [1, "avviata"],
      [2, "fallita"],
      [3, "fallita"],
      [4, "avviata"],
    ],
  );
  assert.deepEqual(
    client.richieste.map((r) => r.metadata.fonte_nome),
    ["EUR-Lex", "Senato della Repubblica"],
  );
  assert.deepEqual(
    archivio.ricerche.map((r) => [r.fonteId, r.esito]),
    [
      [1, "in_corso"],
      [2, "fallita"],
      [4, "in_corso"],
    ],
  );
});

// ---- Webhook ----

const METADATI_EUR_LEX = { fonte_id: 1, fonte_nome: "EUR-Lex", versione_schema: 1 };

function notiziaOutput(modifiche: Record<string, unknown> = {}) {
  return {
    titolo: "Omnibus: rinvio degli obblighi CSRD",
    url: "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:52025PC0081&utm_source=x",
    data: "2026-11-18",
    pubblicata_da: "Commissione europea",
    riassunto: "La Commissione propone di rinviare gli obblighi.",
    segnala_novita: false,
    atti_citati: [],
    ...modifiche,
  };
}

function eventoCompletato(runId: string) {
  return { type: "task_run.status", timestamp: "2026-11-19T06:05:00Z", data: { run_id: runId, status: "completed" } };
}

async function ricercaAvviata(contenuto: unknown, metadata: Record<string, unknown> = METADATI_EUR_LEX) {
  const ambiente = dipendenze();
  const avvio = await avviaRicercaPerFonte(EUR_LEX, ambiente.deps);
  assert.equal(avvio.esito, "avviata");
  ambiente.client.risultati.set("trun_1", { metadata, contenuto });
  return ambiente;
}

test("elaboraWebhook: run completato con output valido, salva le Notizie e chiude la Ricerca", async () => {
  const { archivio, deps } = await ricercaAvviata({ notizie: [notiziaOutput()] });

  const esito = await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(esito, { esito: "completata", notizieCreate: 1, notizieScartate: 0 });
  assert.deepEqual(
    archivio.notizie,
    [
      {
        id: 1,
        titolo: "Omnibus: rinvio degli obblighi CSRD",
        pubblicataDa: "Commissione europea",
        data: "2026-11-18",
        url: "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:52025PC0081",
        riassunto: "La Commissione propone di rinviare gli obblighi.",
        segnalaNovita: false,
        atti: [],
      },
    ],
  );
  assert.equal(archivio.ricerche[0].esito, "completata");
  assert.equal(archivio.ricerche[0].notizieCreate, 1);
});

test("elaboraWebhook: output non valido, nessuna scrittura e Ricerca fallita nel log", async () => {
  const { archivio, deps } = await ricercaAvviata({ notizie: "nessun elenco" });

  const esito = await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.equal(esito.esito, "fallita");
  assert.deepEqual(archivio.notizie, []);
  assert.equal(archivio.ricerche[0].esito, "fallita");
  assert.match(archivio.ricerche[0].errore ?? "", /non rispetta lo schema \(v1\): notizie/);
});

test("elaboraWebhook: una Notizia non valida si scarta, le altre si salvano e la Ricerca è completata", async () => {
  const { archivio, deps } = await ricercaAvviata({
    notizie: [notiziaOutput(), notiziaOutput({ url: "non-un-url", titolo: "Seconda" })],
  });

  const esito = await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(esito, { esito: "completata", notizieCreate: 1, notizieScartate: 1 });
  assert.deepEqual(archivio.notizie.map((n) => n.titolo), ["Omnibus: rinvio degli obblighi CSRD"]);
  assert.equal(archivio.ricerche[0].esito, "completata");
});

test("elaboraWebhook: se tutte le Notizie sono invalide la Ricerca fallisce e la finestra non cambia", async () => {
  const { archivio, client, deps } = await ricercaAvviata({
    notizie: [notiziaOutput({ url: "non-un-url" }), { titolo: "Senza gli altri campi" }],
  });
  archivio.ultimaRiuscita.set(EUR_LEX.id, new Date("2026-11-12T06:00:00Z"));

  assert.equal((await elaboraWebhook(eventoCompletato("trun_1"), deps)).esito, "fallita");
  assert.equal(archivio.ricerche[0].esito, "fallita");
  assert.match(archivio.ricerche[0].errore ?? "", /Notizie non valide/);
  assert.deepEqual(archivio.notizie, []);

  await avviaRicercaPerFonte(EUR_LEX, deps);
  assert.equal(client.richieste[1].source_policy.after_date, "2026-11-12");
});

test("elaboraWebhook: un elenco vuoto è una Ricerca riuscita senza Notizie", async () => {
  const { archivio, client, deps } = await ricercaAvviata({ notizie: [] });

  assert.deepEqual(await elaboraWebhook(eventoCompletato("trun_1"), deps), {
    esito: "completata",
    notizieCreate: 0,
    notizieScartate: 0,
  });
  assert.equal(archivio.ricerche[0].esito, "completata");

  await avviaRicercaPerFonte(EUR_LEX, deps);
  assert.equal(client.richieste[1].source_policy.after_date, "2026-11-19");
});

test("elaboraWebhook: un risultato prodotto con un'altra versione dello schema non viene letto", async () => {
  const { archivio, deps } = await ricercaAvviata({ notizie: [notiziaOutput()] }, { ...METADATI_EUR_LEX, versione_schema: 0 });

  const esito = await elaboraWebhook(eventoCompletato("trun_1"), deps);

  const errore = "La Ricerca è stata avviata con un'altra versione dello schema dei risultati (ora v1): il risultato non è stato letto.";
  assert.deepEqual(esito, { esito: "fallita", errore });
  assert.deepEqual(archivio.notizie, []);
  assert.equal(archivio.ricerche[0].errore, errore);
});

test("elaboraWebhook: lo stesso evento ricevuto due volte non crea Notizie duplicate", async () => {
  const { archivio, client, deps } = await ricercaAvviata({ notizie: [notiziaOutput()] });

  await elaboraWebhook(eventoCompletato("trun_1"), deps);
  client.risultati.clear(); // il secondo giro non deve neanche chiedere il risultato
  const seconda = await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(seconda, { esito: "ignorato", motivo: "Ricerca già elaborata" });
  assert.equal(archivio.notizie.length, 1);
  assert.equal(archivio.ricerche[0].notizieCreate, 1);
});

test("elaboraWebhook: la stessa Notizia in una Ricerca successiva o ripetuta nell'output non si duplica", async () => {
  const { archivio, client, deps } = await ricercaAvviata({ notizie: [notiziaOutput()] });
  await elaboraWebhook(eventoCompletato("trun_1"), deps);

  await avviaRicercaPerFonte(EUR_LEX, deps);
  const stessaNotizia = notiziaOutput({ url: "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:52025PC0081#top" });
  const nuovo = notiziaOutput({ url: "https://eur-lex.europa.eu/nuovo", titolo: "Nuovo" });
  client.risultati.set("trun_2", { metadata: METADATI_EUR_LEX, contenuto: { notizie: [stessaNotizia, nuovo, nuovo] } });
  const esito = await elaboraWebhook(eventoCompletato("trun_2"), deps);

  assert.deepEqual(esito, { esito: "completata", notizieCreate: 1, notizieScartate: 0 });
  assert.deepEqual(
    archivio.notizie.map((n) => n.titolo),
    ["Omnibus: rinvio degli obblighi CSRD", "Nuovo"],
  );
});

const CATALOGO: AttoCatalogo[] = [
  { id: 7, titolo: "Direttiva CSRD", identificativoUfficiale: "32022L2464", giurisdizione: "ue", nonRilevante: false },
  { id: 8, titolo: "Regolamento Tassonomia", identificativoUfficiale: "32020R0852", giurisdizione: "ue", nonRilevante: true },
  { id: 9, titolo: "Decreto CAM", identificativoUfficiale: null, giurisdizione: "italia", nonRilevante: false },
  { id: 10, titolo: "Decreto C.A.M.", identificativoUfficiale: null, giurisdizione: "italia", nonRilevante: false },
];

function citato(identificativo: string | null, titolo: string, giurisdizione: "ue" | "italia" | null = null) {
  return { identificativo_ufficiale: identificativo, titolo, giurisdizione };
}

test("elaboraWebhook: collega gli Atti presenti; assenti, ambigui o Non rilevanti restano senza collegamento", async () => {
  const { archivio, deps } = await ricercaAvviata({
    notizie: [
      notiziaOutput({ url: "https://eur-lex.europa.eu/a", atti_citati: [citato("32022l2464", "CSRD")] }),
      notiziaOutput({ url: "https://eur-lex.europa.eu/b", atti_citati: [citato(null, "Decreto CAM", "italia")] }),
      notiziaOutput({ url: "https://eur-lex.europa.eu/c", atti_citati: [citato("32020R0852", "Tassonomia")] }),
      notiziaOutput({ url: "https://eur-lex.europa.eu/d", atti_citati: [citato("32024L1760", "CSDDD", "ue")] }),
    ],
  });
  archivio.atti = CATALOGO;

  await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(
    archivio.notizie.map((n) => [n.url.slice(-1), n.atti]),
    [
      ["a", [7]],
      ["b", []],
      ["c", []],
      ["d", []],
    ],
  );
});

test("elaboraWebhook: una Notizia che cita un Atto assente o ambiguo segnala una novità, anche se l'agente non l'ha detto", async () => {
  const { archivio, deps } = await ricercaAvviata({
    notizie: [
      notiziaOutput({ url: "https://eur-lex.europa.eu/presente", atti_citati: [citato("32022L2464", "CSRD")] }),
      notiziaOutput({ url: "https://eur-lex.europa.eu/assente", atti_citati: [citato("32024L1760", "CSDDD", "ue")] }),
      notiziaOutput({ url: "https://eur-lex.europa.eu/ambiguo", atti_citati: [citato(null, "Decreto CAM", "italia")] }),
      notiziaOutput({ url: "https://eur-lex.europa.eu/escluso", atti_citati: [citato("32020R0852", "Tassonomia")] }),
      notiziaOutput({ url: "https://eur-lex.europa.eu/agente", segnala_novita: true }),
    ],
  });
  archivio.atti = CATALOGO;

  await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(
    archivio.notizie.map((n) => [n.url.split("/").pop(), n.segnalaNovita]),
    [
      ["presente", false],
      ["assente", true],
      ["ambiguo", true],
      ["escluso", false],
      ["agente", true],
    ],
  );
});

test("elaboraWebhook: senza editore nell'output, «Pubblicata da» è il nome della Fonte", async () => {
  const { archivio, deps } = await ricercaAvviata({ notizie: [notiziaOutput({ pubblicata_da: null })] });

  await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.equal(archivio.notizie[0].pubblicataDa, "EUR-Lex");
});

test("elaboraWebhook: un run fallito o annullato su Parallel chiude la Ricerca come fallita", async () => {
  const { archivio, deps } = await ricercaAvviata({ notizie: [] });

  const esito = await elaboraWebhook(
    {
      type: "task_run.status",
      data: { run_id: "trun_1", status: "failed", error: { message: "Task execution failed", details: "trace…" } },
    },
    deps,
  );

  const errore = "Parallel non è riuscito a completare la Ricerca.";
  assert.deepEqual(esito, { esito: "fallita", errore });
  assert.equal(archivio.ricerche[0].esito, "fallita");
  assert.equal(archivio.ricerche[0].errore, errore);

  const annullata = await ricercaAvviata({ notizie: [] });
  await elaboraWebhook({ type: "task_run.status", data: { run_id: "trun_1", status: "cancelled", error: null } }, annullata.deps);
  assert.equal(annullata.archivio.ricerche[0].errore, "La Ricerca è stata annullata su Parallel.");
});

test("elaboraWebhook: eventi di altro tipo, malformati o di run ancora attivi si ignorano senza scrivere", async () => {
  const { archivio, deps } = await ricercaAvviata({ notizie: [notiziaOutput()] });
  const eventi = [
    { type: "task_run.progress", data: { run_id: "trun_1", status: "completed" } },
    { type: "task_run.status", data: { run_id: "trun_1", status: "running" } },
    { type: "task_run.status", data: {} },
    { type: "task_run.status" },
    null,
    "testo",
  ];
  for (const evento of eventi) {
    const esito = await elaboraWebhook(evento, deps);
    assert.equal(esito.esito, "ignorato", JSON.stringify(evento));
  }
  assert.equal(archivio.ricerche[0].esito, "in_corso");
  assert.deepEqual(archivio.notizie, []);
});

test("elaboraWebhook: un run che il log non conosce va ritentato", async () => {
  const { deps } = dipendenze();
  assert.deepEqual(await elaboraWebhook(eventoCompletato("trun_ignoto"), deps), { esito: "sconosciuta" });
});

test("elaboraWebhook: senza versione dello schema nei metadati il risultato non viene letto", async () => {
  const { archivio, deps } = await ricercaAvviata({ notizie: [notiziaOutput()] }, { fonte_id: 1, fonte_nome: "EUR-Lex" });

  const esito = await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.equal(esito.esito, "fallita");
  assert.equal(archivio.ricerche[0].errore?.includes("undefined"), false);
  assert.deepEqual(archivio.notizie, []);
});

test("avviaRicercaPerFonte: un errore del servizio Parallel non mostra codici agli utenti", async () => {
  const { archivio, client, deps } = dipendenze();
  client.falliscePer.set("EUR-Lex", new ErroreParallel(503, "Service Unavailable"));

  await avviaRicercaPerFonte(EUR_LEX, deps);

  assert.equal(archivio.ricerche[0].errore, "Parallel non ha avviato la Ricerca: servizio non disponibile.");
});

test("avviaRicercaPerFonte: un errore di configurazione non passa per un problema di Parallel", async () => {
  const { archivio, client, deps } = dipendenze();
  const senzaWebhook: DipendenzeRicerca = {
    ...deps,
    get urlWebhook(): string {
      throw new Error("Variabile d'ambiente PARALLEL_WEBHOOK_URL mancante");
    },
  };

  await assert.rejects(avviaRicercaPerFonte(EUR_LEX, senzaWebhook), /PARALLEL_WEBHOOK_URL/);
  assert.deepEqual(client.richieste, []);
  assert.deepEqual(archivio.ricerche, []);
});

test("elaboraWebhook: una Notizia che cita solo Atti Non rilevanti non segnala una novità, anche se l'agente lo dice", async () => {
  const { archivio, deps } = await ricercaAvviata({
    notizie: [
      notiziaOutput({ url: "https://eur-lex.europa.eu/solo-escluso", segnala_novita: true, atti_citati: [citato("32020R0852", "Tassonomia")] }),
      notiziaOutput({
        url: "https://eur-lex.europa.eu/escluso-e-presente",
        segnala_novita: true,
        atti_citati: [citato("32020R0852", "Tassonomia"), citato("32022L2464", "CSRD")],
      }),
    ],
  });
  archivio.atti = CATALOGO;

  await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(
    archivio.notizie.map((n) => [n.url.split("/").pop(), n.segnalaNovita, n.atti]),
    [
      ["solo-escluso", false, []],
      ["escluso-e-presente", true, [7]],
    ],
  );
});

test("elaboraWebhook: una norma citata solo per nome e non trovata non fa scattare la novità; con identificativo sì", async () => {
  const { archivio, deps } = await ricercaAvviata({
    notizie: [
      notiziaOutput({ url: "https://eur-lex.europa.eu/per-nome", atti_citati: [citato(null, "EU Taxonomy", "ue")] }),
      notiziaOutput({ url: "https://eur-lex.europa.eu/per-nome-agente", segnala_novita: true, atti_citati: [citato(null, "EU Taxonomy", "ue")] }),
      notiziaOutput({ url: "https://eur-lex.europa.eu/con-identificativo", atti_citati: [citato("32024L1760", "CSDDD", "ue")] }),
    ],
  });
  archivio.atti = CATALOGO;

  await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(
    archivio.notizie.map((n) => [n.url.split("/").pop(), n.segnalaNovita]),
    [
      ["per-nome", false],
      ["per-nome-agente", true],
      ["con-identificativo", true],
    ],
  );
});
