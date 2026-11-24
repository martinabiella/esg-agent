import { test } from "node:test";
import assert from "node:assert/strict";
import { ORA, dipendenze } from "./agente-finto";
import type { AttoCatalogo } from "./atto-citato";
import { type FonteDaControllare, avviaEsecuzione } from "./esecuzione";
import { schemaOutputParallel } from "./output-ricerca";
import { ErroreParallel } from "./parallel";
import { elaboraWebhook, finestraRicerca } from "./ricerca-fonte";

test("finestraRicerca: senza Ricerche riuscite, gli ultimi 30 giorni", () => {
  assert.equal(finestraRicerca(null, ORA), "2026-10-20");
});

test("finestraRicerca: parte dal giorno in cui è stata avviata l'ultima Ricerca riuscita", () => {
  assert.equal(finestraRicerca(new Date("2026-11-12T05:59:00Z"), ORA), "2026-11-12");
});

const EUR_LEX: FonteDaControllare = {
  id: 1,
  nome: "EUR-Lex",
  url: "https://eur-lex.europa.eu/",
  tipo: "ufficiale",
  ultimaPartitaIl: null,
};

// Un'esecuzione con la sola Fonte EUR-Lex.
function conEurLex() {
  const ambiente = dipendenze();
  ambiente.archivio.fonti = [EUR_LEX];
  return ambiente;
}

// ---- Avvio ----

test("avvio: parte su Parallel dalla finestra della Fonte e la Ricerca in corso riceve il run", async () => {
  const { archivio, client, deps } = conEurLex();
  archivio.ultimaRiuscita.set(1, new Date("2026-11-12T06:00:00Z"));

  await avviaEsecuzione(deps);

  const [richiesta] = client.richieste;
  assert.deepEqual(richiesta.source_policy, { include_domains: ["eur-lex.europa.eu"], after_date: "2026-11-12" });
  assert.deepEqual(richiesta.task_spec.output_schema, { type: "json", json_schema: schemaOutputParallel() });
  assert.deepEqual(richiesta.webhook, { url: deps.urlWebhook, event_types: ["task_run.status"] });
  assert.deepEqual(richiesta.metadata, { fonte_id: 1, fonte_nome: "EUR-Lex", versione_schema: 2 });
  assert.ok(richiesta.input.includes("EUR-Lex") && richiesta.input.includes("https://eur-lex.europa.eu/"));
  assert.ok(richiesta.input.includes("2026-11-12"));
  assert.deepEqual(archivio.ricerche, [
    { id: 1, fonteId: 1, avviataIl: ORA, parallelRunId: "trun_1", esito: "in_corso", errore: null, notizieCreate: 0, attiCreati: 0 },
  ]);
});

test("avvio: se Parallel rifiuta l'avvio, la Ricerca è fallita nel log con un motivo leggibile", async () => {
  const { archivio, client, deps } = conEurLex();
  client.falliscePer.set("EUR-Lex", new ErroreParallel(402, "Insufficient credit"));

  const esito = await avviaEsecuzione(deps);

  assert.deepEqual(esito, { esito: "avviata", avviataIl: ORA, avviate: 0, fallite: 1, saltate: 0 });
  assert.deepEqual(archivio.ricerche, [
    {
      id: 1,
      fonteId: 1,
      avviataIl: ORA,
      parallelRunId: null,
      esito: "fallita",
      errore: "Parallel non ha avviato la Ricerca: credito esaurito.",
      notizieCreate: 0,
      attiCreati: 0,
    },
  ]);
});

test("avvio: errori di rete o imprevisti diventano un motivo generico, senza dettagli tecnici", async () => {
  const { archivio, client, deps } = conEurLex();
  client.falliscePer.set("EUR-Lex", new TypeError("fetch failed: ECONNRESET 10.0.0.1"));

  await avviaEsecuzione(deps);

  assert.equal(archivio.ricerche[0].errore, "Parallel non è raggiungibile: la Ricerca non è partita.");
});

test("avvio: un errore del servizio Parallel non mostra codici agli utenti", async () => {
  const { archivio, client, deps } = conEurLex();
  client.falliscePer.set("EUR-Lex", new ErroreParallel(503, "Service Unavailable"));

  await avviaEsecuzione(deps);

  assert.equal(archivio.ricerche[0].errore, "Parallel non ha avviato la Ricerca: servizio non disponibile.");
});

// ---- Webhook ----

const METADATI_EUR_LEX = { fonte_id: 1, fonte_nome: "EUR-Lex", versione_schema: 2 };

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
  const ambiente = conEurLex();
  const avvio = await avviaEsecuzione(ambiente.deps);
  assert.equal(avvio.esito === "avviata" && avvio.avviate, 1);
  ambiente.client.risultati.set("trun_1", { metadata, contenuto });
  return ambiente;
}

test("elaboraWebhook: run completato con output valido, salva le Notizie e chiude la Ricerca", async () => {
  const { archivio, deps } = await ricercaAvviata({ notizie: [notiziaOutput()] });

  const esito = await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(esito, { esito: "completata", notizieCreate: 1, notizieScartate: 0, attiCreati: 0 });
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
  assert.match(archivio.ricerche[0].errore ?? "", /non rispetta lo schema \(v2\): notizie/);
});

test("elaboraWebhook: una Notizia non valida si scarta, le altre si salvano e la Ricerca è completata", async () => {
  const { archivio, deps } = await ricercaAvviata({
    notizie: [notiziaOutput(), notiziaOutput({ url: "non-un-url", titolo: "Seconda" })],
  });

  const esito = await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(esito, { esito: "completata", notizieCreate: 1, notizieScartate: 1, attiCreati: 0 });
  assert.deepEqual(archivio.notizie.map((n) => n.titolo), ["Omnibus: rinvio degli obblighi CSRD"]);
  assert.equal(archivio.ricerche[0].esito, "completata");
});

test("elaboraWebhook: se tutte le Notizie sono invalide la Ricerca fallisce", async () => {
  const { archivio, deps } = await ricercaAvviata({
    notizie: [notiziaOutput({ url: "non-un-url" }), { titolo: "Senza gli altri campi" }],
  });

  assert.equal((await elaboraWebhook(eventoCompletato("trun_1"), deps)).esito, "fallita");
  assert.equal(archivio.ricerche[0].esito, "fallita");
  assert.match(archivio.ricerche[0].errore ?? "", /Notizie non valide/);
  assert.deepEqual(archivio.notizie, []);
});

test("elaboraWebhook: un risultato prodotto con un'altra versione dello schema non viene letto", async () => {
  const { archivio, deps } = await ricercaAvviata({ notizie: [notiziaOutput()] }, { ...METADATI_EUR_LEX, versione_schema: 0 });

  const esito = await elaboraWebhook(eventoCompletato("trun_1"), deps);

  const errore = "La Ricerca è stata avviata con un'altra versione dello schema dei risultati (ora v2): il risultato non è stato letto.";
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

  await avviaEsecuzione(deps);
  const stessaNotizia = notiziaOutput({ url: "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:52025PC0081#top" });
  const nuovo = notiziaOutput({ url: "https://eur-lex.europa.eu/nuovo", titolo: "Nuovo" });
  client.risultati.set("trun_2", { metadata: METADATI_EUR_LEX, contenuto: { notizie: [stessaNotizia, nuovo, nuovo] } });
  const esito = await elaboraWebhook(eventoCompletato("trun_2"), deps);

  assert.deepEqual(esito, { esito: "completata", notizieCreate: 1, notizieScartate: 0, attiCreati: 0 });
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

// ---- Atti nuovi (#45) ----

const SETTORI = [
  { id: 1, nome: "Energia", descrizione: "Produzione e distribuzione di energia." },
  { id: 2, nome: "Finanza e assicurazioni", descrizione: "Banche, assicurazioni e fondi." },
];

function candidatoOutput(modifiche: Record<string, unknown> = {}) {
  return {
    identificativo_ufficiale: "32024L1760",
    titolo: "Direttiva CSDDD",
    giurisdizione: "ue",
    tipo: "direttiva",
    stato: "in_vigore",
    url_testo: "https://eur-lex.europa.eu/eli/dir/2024/1760/oj",
    summary: "Obbliga le grandi imprese alla due diligence.",
    criteri_testo: "Grandi imprese.",
    soglie: [],
    tutti_i_settori: false,
    settori: ["Energia", "Esplorazione spaziale"],
    temi: ["Due diligence", "due diligence"],
    da_notizia: "https://eur-lex.europa.eu/a",
    discrepanze: [],
    ...modifiche,
  };
}

function notiziaCheCitaCsddd(url = "https://eur-lex.europa.eu/a") {
  return notiziaOutput({ url, atti_citati: [citato("32024L1760", "CSDDD", "ue")] });
}

async function conCatalogoDiSettori(contenuto: unknown) {
  const ambiente = await ricercaAvviata(contenuto);
  ambiente.archivio.settori = SETTORI;
  return ambiente;
}

test("atti nuovi: Atto creato con la Fonte di origine, Notizia collegata e col flag, esito con il conteggio", async () => {
  const { archivio, deps } = await conCatalogoDiSettori({
    notizie: [notiziaCheCitaCsddd()],
    atti_candidati: [candidatoOutput()],
  });

  const esito = await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(esito, { esito: "completata", notizieCreate: 1, notizieScartate: 0, attiCreati: 1 });
  assert.equal(archivio.attiCreati.length, 1);
  const [atto] = archivio.attiCreati;
  assert.equal(atto.identificativoUfficiale, "32024L1760");
  assert.equal(atto.fonteId, 1);
  assert.deepEqual(atto.settori, [1]);
  assert.match(atto.summary, /^\[Agente\] Dati presi da: https:\/\/eur-lex\.europa\.eu\/a\n\nObbliga/);
  assert.equal(archivio.notizie[0].segnalaNovita, true);
  assert.deepEqual(archivio.notizie[0].atti, [atto.id]);
  assert.equal(archivio.ricerche[0].attiCreati, 1);
});

test("atti nuovi: lo stesso candidato in un secondo run non crea un duplicato e la Notizia nuova si collega", async () => {
  const { archivio, client, deps } = await conCatalogoDiSettori({
    notizie: [notiziaCheCitaCsddd()],
    atti_candidati: [candidatoOutput()],
  });
  await elaboraWebhook(eventoCompletato("trun_1"), deps);

  await avviaEsecuzione(deps);
  client.risultati.set("trun_2", {
    metadata: METADATI_EUR_LEX,
    contenuto: { notizie: [notiziaCheCitaCsddd("https://eur-lex.europa.eu/b")], atti_candidati: [candidatoOutput()] },
  });
  const esito = await elaboraWebhook(eventoCompletato("trun_2"), deps);

  assert.deepEqual(esito, { esito: "completata", notizieCreate: 1, notizieScartate: 0, attiCreati: 0 });
  assert.equal(archivio.attiCreati.length, 1);
  assert.deepEqual(archivio.notizie[1].atti, [archivio.attiCreati[0].id]);
  assert.equal(archivio.notizie[1].segnalaNovita, false);
});

test("atti nuovi: lo stesso evento ricevuto due volte non crea un secondo Atto", async () => {
  const { archivio, client, deps } = await conCatalogoDiSettori({
    notizie: [notiziaCheCitaCsddd()],
    atti_candidati: [candidatoOutput()],
  });
  await elaboraWebhook(eventoCompletato("trun_1"), deps);
  client.risultati.clear();

  const seconda = await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(seconda, { esito: "ignorato", motivo: "Ricerca già elaborata" });
  assert.equal(archivio.attiCreati.length, 1);
});

test("atti nuovi: candidato non valido, senza identificativo o ambiguo: nessun Atto, la Notizia resta col flag", async () => {
  const { archivio, deps } = await conCatalogoDiSettori({
    notizie: [notiziaCheCitaCsddd()],
    atti_candidati: [
      candidatoOutput({ tipo: "decreto_legislativo" }),
      candidatoOutput({ identificativo_ufficiale: null, titolo: "Altro" }),
    ],
  });

  const esito = await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(esito, { esito: "completata", notizieCreate: 1, notizieScartate: 0, attiCreati: 0 });
  assert.deepEqual(archivio.attiCreati, []);
  assert.equal(archivio.notizie[0].segnalaNovita, true);
  assert.deepEqual(archivio.notizie[0].atti, []);
});

test("atti nuovi: un Atto Non rilevante del catalogo non viene riproposto", async () => {
  const { archivio, deps } = await conCatalogoDiSettori({
    notizie: [notiziaCheCitaCsddd()],
    atti_candidati: [candidatoOutput()],
  });
  archivio.atti = [
    { id: 20, titolo: "CSDDD", identificativoUfficiale: "32024L1760", giurisdizione: "ue", nonRilevante: true },
  ];

  await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(archivio.attiCreati, []);
  assert.equal(archivio.notizie[0].segnalaNovita, false);
  assert.deepEqual(archivio.notizie[0].atti, []);
});

test("atti nuovi: i Settori non si creano mai, i Temi nuovi sì e senza duplicati tra Atti", async () => {
  const { archivio, deps } = await conCatalogoDiSettori({
    notizie: [notiziaCheCitaCsddd()],
    atti_candidati: [
      candidatoOutput(),
      candidatoOutput({ identificativo_ufficiale: "32022L2464", titolo: "CSRD", temi: ["DUE DILIGENCE", "Rendicontazione"] }),
    ],
  });
  archivio.temi = ["Clima"];

  await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(archivio.settori, SETTORI);
  assert.deepEqual(archivio.temi, ["Clima", "Due diligence", "Rendicontazione"]);
});

test("avvio: le istruzioni elencano i Settori esistenti con la descrizione e i Temi già usati", async () => {
  const { archivio, client, deps } = conEurLex();
  archivio.settori = SETTORI;
  archivio.temi = ["Clima"];

  await avviaEsecuzione(deps);

  const { input } = client.richieste[0];
  assert.ok(input.includes("Energia: Produzione e distribuzione di energia."));
  assert.ok(input.includes("Finanza e assicurazioni: Banche, assicurazioni e fondi."));
  assert.ok(input.includes("Clima"));
});

test("elaboraWebhook: un run avviato con lo schema v1 è ancora leggibile, senza candidati", async () => {
  const { archivio, deps } = await ricercaAvviata(
    { notizie: [notiziaOutput()] },
    { ...METADATI_EUR_LEX, versione_schema: 1 },
  );

  const esito = await elaboraWebhook(eventoCompletato("trun_1"), deps);

  assert.deepEqual(esito, { esito: "completata", notizieCreate: 1, notizieScartate: 0, attiCreati: 0 });
  assert.equal(archivio.notizie.length, 1);
});

test("avvio: le istruzioni escludono gli atti di routine su singole sostanze e gli atti abrogati", async () => {
  const { client, deps } = conEurLex();

  await avviaEsecuzione(deps);

  const { input } = client.richieste[0];
  assert.ok(input.includes("singola sostanza"), "regola sugli atti di routine");
  assert.ok(input.includes("abrogati"), "regola sugli atti abrogati");
});
