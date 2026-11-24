import { test } from "node:test";
import assert from "node:assert/strict";
import { ORA, dipendenze } from "./agente-finto";
import { ErroreParallel } from "./parallel";
import { elaboraWebhook, type EsitoRicerca } from "./ricerca-fonte";
import {
  type DipendenzeEsecuzione,
  type FonteDaControllare,
  avviaEsecuzione,
  esitoEsecuzione,
  scegliRicerche,
  tettoRicerche,
} from "./esecuzione";

function fonte(id: number, tipo: FonteDaControllare["tipo"], ultimaPartitaIl: string | null): FonteDaControllare {
  return {
    id,
    nome: `Fonte ${id}`,
    url: `https://fonte${id}.example/`,
    tipo,
    ultimaPartitaIl: ultimaPartitaIl === null ? null : new Date(ultimaPartitaIl),
  };
}

// ---- Tetto e priorità ----

test("scegliRicerche: oltre il tetto partono prima le Fonti ufficiali, le altre sono saltate", () => {
  const fonti = [
    fonte(1, "editoriale", "2026-11-16T05:00:00Z"),
    fonte(2, "ufficiale", "2026-11-16T05:00:00Z"),
    fonte(3, "editoriale", "2026-11-16T05:00:00Z"),
    fonte(4, "ufficiale", "2026-11-16T05:00:00Z"),
  ];

  const scelta = scegliRicerche(fonti, 3);

  assert.deepEqual(scelta.daAvviare.map((f) => f.id), [2, 4, 1]);
  assert.deepEqual(scelta.saltate.map((f) => f.id), [3]);
});

test("scegliRicerche: a parità di tipo partono prima le Fonti mai partite, poi quelle partite meno di recente", () => {
  const fonti = [
    fonte(1, "editoriale", "2026-11-16T05:00:00Z"),
    fonte(2, "editoriale", "2026-11-09T05:00:00Z"),
    fonte(3, "editoriale", null),
    fonte(4, "editoriale", "2026-11-16T05:00:00Z"),
  ];

  const scelta = scegliRicerche(fonti, 3);

  assert.deepEqual(scelta.daAvviare.map((f) => f.id), [3, 2, 1]);
  assert.deepEqual(scelta.saltate.map((f) => f.id), [4]);
});

test("scegliRicerche: entro il tetto partono tutte", () => {
  const scelta = scegliRicerche([fonte(1, "editoriale", null), fonte(2, "ufficiale", null)], 20);

  assert.deepEqual(scelta.daAvviare.map((f) => f.id), [2, 1]);
  assert.deepEqual(scelta.saltate, []);
});

test("tettoRicerche: il valore di TETTO_RICERCHE, se è un intero positivo", () => {
  assert.equal(tettoRicerche("8"), 8);
  assert.equal(tettoRicerche(" 35 "), 35);
});

test("tettoRicerche: 20 se la variabile manca o non è valida", () => {
  for (const valore of [undefined, "", "  ", "zero", "0", "-3", "4.5", "12 Fonti"]) {
    assert.equal(tettoRicerche(valore), 20, `valore ${JSON.stringify(valore)}`);
  }
});

// ---- Avvio di un'esecuzione ----

test("avviaEsecuzione: le Fonti oltre il tetto sono registrate come saltate per tetto e non chiamano Parallel", async () => {
  const { archivio, client, deps } = dipendenze(2);
  archivio.fonti = [fonte(1, "ufficiale", null), fonte(2, "editoriale", null), fonte(3, "ufficiale", null)];

  const esito = await avviaEsecuzione(deps);

  assert.deepEqual(esito, { esito: "avviata", avviataIl: ORA, avviate: 2, fallite: 0, saltate: 1 });
  assert.deepEqual(client.richieste.map((r) => r.metadata.fonte_id), [1, 3]);
  assert.deepEqual(
    archivio.ricerche.map((r) => [r.fonteId, r.esito, r.parallelRunId, r.avviataIl]),
    [
      [1, "in_corso", "trun_1", ORA],
      [3, "in_corso", "trun_2", ORA],
      [2, "saltata_per_tetto", null, ORA],
    ],
  );
});

test("avviaEsecuzione: una Fonte che fallisce non impedisce l'avvio delle altre", async () => {
  const { archivio, client, deps } = dipendenze();
  archivio.fonti = [1, 2, 3, 4].map((id) => fonte(id, "ufficiale", null));
  client.falliscePer.set("Fonte 2", new ErroreParallel(429, "Too many requests"));
  // Un errore imprevisto del database su una Fonte.
  const originale = archivio.ultimaRicercaRiuscita.bind(archivio);
  archivio.ultimaRicercaRiuscita = async (fonteId) => {
    if (fonteId === 3) throw new Error("connessione al DB persa");
    return originale(fonteId);
  };

  const esito = await avviaEsecuzione(deps);

  assert.deepEqual(esito, { esito: "avviata", avviataIl: ORA, avviate: 2, fallite: 2, saltate: 0 });
  assert.deepEqual(client.richieste.map((r) => r.metadata.fonte_id), [1, 4]);
  assert.deepEqual(
    archivio.ricerche.map((r) => [r.fonteId, r.esito, r.errore]),
    [
      [1, "in_corso", null],
      [2, "fallita", "Parallel non ha avviato la Ricerca: troppe richieste, riprova più tardi."],
      [3, "fallita", "Errore imprevisto: la Ricerca non è partita."],
      [4, "in_corso", null],
    ],
  );
});

test("avviaEsecuzione: un errore di configurazione non apre l'esecuzione e non passa per un problema delle Fonti", async () => {
  const { archivio, client, deps } = dipendenze();
  archivio.fonti = [fonte(1, "ufficiale", null)];
  const senzaWebhook: DipendenzeEsecuzione = {
    ...deps,
    get urlWebhook(): string {
      throw new Error("Variabile d'ambiente PARALLEL_WEBHOOK_URL mancante");
    },
  };

  await assert.rejects(avviaEsecuzione(senzaWebhook), /PARALLEL_WEBHOOK_URL/);
  assert.deepEqual(client.richieste, []);
  assert.deepEqual(archivio.ricerche, []);
});

// ---- Esecuzione in corso ----

const ORE = (n: number) => n * 60 * 60 * 1000;

test("avviaEsecuzione: con un'esecuzione in corso un nuovo avvio non registra Ricerche e non chiama Parallel", async () => {
  const { archivio, client, deps } = dipendenze();
  archivio.fonti = [fonte(1, "ufficiale", null), fonte(2, "ufficiale", null)];
  const primoAvvio = new Date(ORA.getTime() - ORE(1));
  await avviaEsecuzione({ ...deps, ora: () => primoAvvio });

  const esito = await avviaEsecuzione(deps);

  assert.deepEqual(esito, { esito: "gia_in_corso", inCorsoDal: primoAvvio });
  assert.equal(client.richieste.length, 2);
  assert.equal(archivio.ricerche.length, 2);
});

test("avviaEsecuzione: basta una Ricerca ancora in corso per bloccare un nuovo avvio", async () => {
  const { archivio, client, deps } = dipendenze();
  archivio.fonti = [fonte(1, "ufficiale", null), fonte(2, "ufficiale", null)];
  const primoAvvio = new Date(ORA.getTime() - ORE(1));
  await avviaEsecuzione({ ...deps, ora: () => primoAvvio });
  await archivio.segnaFallita(1, "Parallel non è riuscito a completare la Ricerca.");

  const esito = await avviaEsecuzione(deps);

  assert.equal(esito.esito, "gia_in_corso");
  assert.equal(client.richieste.length, 2);
});

test("avviaEsecuzione: una Ricerca in corso da più di 2 ore non blocca un nuovo avvio e resta aperta", async () => {
  const { archivio, client, deps } = dipendenze();
  archivio.fonti = [fonte(1, "ufficiale", null)];
  const primoAvvio = new Date(ORA.getTime() - ORE(2) - 1000);
  await avviaEsecuzione({ ...deps, ora: () => primoAvvio });

  const esito = await avviaEsecuzione(deps);

  assert.deepEqual(esito, { esito: "avviata", avviataIl: ORA, avviate: 1, fallite: 0, saltate: 0 });
  assert.equal(client.richieste.length, 2);
  assert.deepEqual(
    archivio.ricerche.map((r) => [r.avviataIl, r.esito]),
    [
      [primoAvvio, "in_corso"],
      [ORA, "in_corso"],
    ],
  );
});

test("avviaEsecuzione: senza Fonti non registra nulla", async () => {
  const { archivio, client, deps } = dipendenze();

  assert.deepEqual(await avviaEsecuzione(deps), { esito: "nessuna_fonte" });
  assert.deepEqual(archivio.ricerche, []);
  assert.deepEqual(client.richieste, []);
});

test("avviaEsecuzione: dopo 48 ore chiude le Ricerche rimaste senza run Parallel", async () => {
  const { archivio, deps } = dipendenze();
  archivio.fonti = [fonte(1, "ufficiale", null)];
  const scaduta = new Date(ORA.getTime() - ORE(48) - 1000);
  const recente = new Date(ORA.getTime() - ORE(45));
  await archivio.apriEsecuzione({ avviataIl: scaduta, daAvviare: [1], saltate: [], bloccanteDal: scaduta });
  await avviaEsecuzione({ ...deps, ora: () => recente });

  await avviaEsecuzione(deps);

  assert.deepEqual(
    archivio.ricerche.map((r) => [r.avviataIl, r.esito, r.errore]),
    [
      [scaduta, "fallita", "Il risultato della Ricerca non è mai arrivato."],
      [recente, "in_corso", null],
      [ORA, "in_corso", null],
    ],
  );
});

test("avviaEsecuzione: un webhook oltre le 48 ore salva ancora il risultato di un run registrato", async () => {
  const { archivio, client, deps } = dipendenze();
  archivio.fonti = [fonte(1, "ufficiale", null)];
  const primoAvvio = new Date(ORA.getTime() - ORE(49));
  await avviaEsecuzione({ ...deps, ora: () => primoAvvio });
  await avviaEsecuzione(deps);
  client.risultati.set("trun_1", {
    metadata: client.richieste[0].metadata,
    contenuto: {
      notizie: [{
        titolo: "Notizia arrivata in ritardo",
        url: "https://fonte1.example/notizia",
        data: null,
        pubblicata_da: null,
        riassunto: "",
        segnala_novita: false,
        atti_citati: [],
      }],
    },
  });

  const webhook = { type: "task_run.status", data: { run_id: "trun_1", status: "completed" } };
  assert.deepEqual(await elaboraWebhook(webhook, deps), {
    esito: "completata",
    notizieCreate: 1,
    notizieScartate: 0,
    attiCreati: 0,
    cambiDiStato: 0,
  });
  assert.deepEqual(archivio.ricerche.map((r) => r.esito), ["completata", "in_corso"]);
  assert.deepEqual(archivio.notizie.map((n) => n.url), ["https://fonte1.example/notizia"]);
});

// ---- Esito dell'ultima esecuzione (accanto al pulsante «Avvia ricerca ora») ----

function ricerca(fonte: string | null, esito: EsitoRicerca, notizieCreate = 0, attiCreati = 0) {
  return { fonte, esito, notizieCreate, attiCreati };
}

test("esitoEsecuzione: con Ricerche ancora in corso, quante sono concluse e quante saltate", () => {
  const avviataIl = new Date(ORA.getTime() - ORE(1));
  const ricerche = [
    ricerca("A", "completata", 2),
    ricerca("B", "fallita"),
    ricerca("C", "in_corso"),
    ricerca("D", "in_corso"),
    ricerca("E", "saltata_per_tetto"),
  ];

  assert.deepEqual(esitoEsecuzione({ avviataIl, ricerche }, ORA), {
    stato: "in_corso",
    avviataIl,
    descrizione: "2 Ricerche concluse su 4. 1 Fonte saltata per tetto.",
  });
});

test("esitoEsecuzione: tutte le Fonti controllate, con le Notizie nuove", () => {
  const ricerche = [ricerca("A", "completata", 2), ricerca("B", "completata", 1)];

  assert.deepEqual(esitoEsecuzione({ avviataIl: ORA, ricerche }, ORA), {
    stato: "completata",
    avviataIl: ORA,
    descrizione: "2 Fonti controllate, 3 Notizie nuove, 0 Atti nuovi.",
  });
  assert.equal(
    esitoEsecuzione({ avviataIl: ORA, ricerche: [ricerca("A", "completata", 1)] }, ORA).descrizione,
    "1 Fonte controllata, 1 Notizia nuova, 0 Atti nuovi.",
  );
});

test("esitoEsecuzione: le Fonti fallite sono non leggibili, anche se eliminate nel frattempo", () => {
  const ricerche = [
    ricerca("A", "completata", 1),
    ricerca("B", "fallita"),
    ricerca(null, "fallita"),
    ricerca("C", "saltata_per_tetto"),
  ];

  assert.deepEqual(esitoEsecuzione({ avviataIl: ORA, ricerche }, ORA), {
    stato: "fonti_non_leggibili",
    avviataIl: ORA,
    descrizione: "1 Fonte controllata, 1 Notizia nuova, 0 Atti nuovi. Non leggibili: B, Fonte eliminata. 1 Fonte saltata per tetto.",
  });
});

test("esitoEsecuzione: dopo 2 ore una Ricerca ancora in corso è senza risposta e l'esecuzione non è più in corso", () => {
  const avviataIl = new Date(ORA.getTime() - ORE(3));
  const ricerche = [ricerca("A", "completata", 0), ricerca("B", "in_corso")];

  assert.deepEqual(esitoEsecuzione({ avviataIl, ricerche }, ORA), {
    stato: "fonti_non_leggibili",
    avviataIl,
    descrizione: "1 Fonte controllata, 0 Notizie nuove, 0 Atti nuovi. Senza risposta: B.",
  });
});

test("avviaEsecuzione: se il run partito su Parallel non si registra, la Ricerca lo dice e le altre partono", async () => {
  const { archivio, client, deps } = dipendenze();
  archivio.fonti = [fonte(1, "ufficiale", null), fonte(2, "ufficiale", null)];
  const originale = archivio.assegnaRun.bind(archivio);
  archivio.assegnaRun = async (ricercaId, runId) => {
    if (ricercaId === 1) throw new Error("connessione al DB persa");
    return originale(ricercaId, runId);
  };

  const esito = await avviaEsecuzione(deps);

  assert.deepEqual(esito, { esito: "avviata", avviataIl: ORA, avviate: 1, fallite: 1, saltate: 0 });
  assert.equal(client.richieste.length, 2);
  assert.deepEqual(
    archivio.ricerche.map((r) => [r.fonteId, r.esito, r.errore]),
    [
      [1, "fallita", "La Ricerca è partita su Parallel ma non è stato possibile registrarla: il risultato andrà perso."],
      [2, "in_corso", null],
    ],
  );
});

test("esitoEsecuzione: gli Atti nuovi creati dalle Ricerche compaiono nell'esito, al singolare se è uno", () => {
  const ricerche = [ricerca("A", "completata", 4, 2), ricerca("B", "completata", 1, 1)];
  assert.equal(
    esitoEsecuzione({ avviataIl: ORA, ricerche }, ORA).descrizione,
    "2 Fonti controllate, 5 Notizie nuove, 3 Atti nuovi.",
  );
  assert.equal(
    esitoEsecuzione({ avviataIl: ORA, ricerche: [ricerca("A", "completata", 1, 1)] }, ORA).descrizione,
    "1 Fonte controllata, 1 Notizia nuova, 1 Atto nuovo.",
  );
});
