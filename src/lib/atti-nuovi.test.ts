import { test } from "node:test";
import assert from "node:assert/strict";
import type { AttoCatalogo } from "./atto-citato";
import { decidiAttiNuovi } from "./atti-nuovi";
import type { AttoCandidato } from "./output-ricerca";

const ORA = new Date("2026-11-19T10:00:00Z");

const settori = [
  { id: 1, nome: "Energia" },
  { id: 2, nome: "Finanza e assicurazioni" },
];

const candidato: AttoCandidato = {
  identificativoUfficiale: "32022L2464",
  titolo: "Direttiva CSRD",
  giurisdizione: "ue",
  tipo: "direttiva",
  stato: "in_vigore",
  urlTesto: "https://eur-lex.europa.eu/eli/dir/2022/2464/oj",
  summary: "Estende la rendicontazione di sostenibilità.",
  criteriTesto: "Grandi imprese.",
  soglie: [{ campo: "dipendenti", minimo: "250", massimo: "", paesi: [] }],
  tuttiISettori: false,
  settori: ["Energia"],
  temi: ["Rendicontazione"],
  daNotizia: "https://www.esempio.it/omnibus",
  discrepanze: [],
};

const catalogo = (...atti: Partial<AttoCatalogo>[]): AttoCatalogo[] =>
  atti.map((a, i) => ({
    id: i + 1,
    titolo: "Altro atto",
    identificativoUfficiale: null,
    giurisdizione: "ue",
    nonRilevante: false,
    ...a,
  }));

test("un candidato nuovo con identificativo diventa un Atto da creare, con origine nel summary", () => {
  const { daCreare, scartati } = decidiAttiNuovi([candidato], [], settori, ORA);
  assert.deepEqual(scartati, []);
  assert.deepEqual(daCreare, [
    {
      identificativoUfficiale: "32022L2464",
      titolo: "Direttiva CSRD",
      giurisdizione: "ue",
      tipo: "direttiva",
      stato: "in_vigore",
      summary: "[Agente] Dati presi da: https://www.esempio.it/omnibus\n\nEstende la rendicontazione di sostenibilità.",
      urlTesto: "https://eur-lex.europa.eu/eli/dir/2022/2464/oj",
      criteriTesto: "Grandi imprese.",
      criteriSoglie: { versione: 1, minimoSoglie: 1, soglie: [{ campo: "dipendenti", minimo: 250, massimo: null }] },
      tuttiISettori: false,
      settori: [1],
      temi: ["Rendicontazione"],
    },
  ]);
});

test("le discordanze segnalate dall'agente finiscono in testa al summary", () => {
  const { daCreare } = decidiAttiNuovi(
    [{ ...candidato, discrepanze: ["Stato: «proposta» secondo A, «in vigore» secondo B."] }],
    [],
    settori,
    ORA,
  );
  assert.match(
    daCreare[0].summary,
    /^\[Agente\] Dati presi da: .*\n\[Agente\] Dati discordanti: Stato: «proposta» secondo A, «in vigore» secondo B\.\n\nEstende/,
  );
});

test("senza identificativo ufficiale non si crea nessun Atto", () => {
  for (const identificativoUfficiale of [null, "   "]) {
    const { daCreare, scartati } = decidiAttiNuovi([{ ...candidato, identificativoUfficiale }], [], settori, ORA);
    assert.deepEqual(daCreare, []);
    assert.equal(scartati.length, 1);
    assert.match(scartati[0].motivo, /identificativo/i);
  }
});

test("un Atto già in catalogo non si ricrea, anche se l'identificativo ha spazi o maiuscole diverse", () => {
  const { daCreare, scartati } = decidiAttiNuovi(
    [{ ...candidato, identificativoUfficiale: "32022l 2464" }],
    catalogo({ identificativoUfficiale: "32022L2464", titolo: "CSRD" }),
    settori,
    ORA,
  );
  assert.deepEqual(daCreare, []);
  assert.deepEqual(scartati, []);
});

test("un Atto Non rilevante non viene riproposto", () => {
  const { daCreare, scartati } = decidiAttiNuovi(
    [candidato],
    catalogo({ identificativoUfficiale: "32022L2464", nonRilevante: true }),
    settori,
    ORA,
  );
  assert.deepEqual(daCreare, []);
  assert.deepEqual(scartati, []);
});

test("un candidato ambiguo (due Atti senza identificativo con lo stesso titolo) non crea nulla", () => {
  const { daCreare, scartati } = decidiAttiNuovi(
    [candidato],
    catalogo({ titolo: "Direttiva CSRD" }, { titolo: "direttiva csrd" }),
    settori,
    ORA,
  );
  assert.deepEqual(daCreare, []);
  assert.equal(scartati.length, 1);
  assert.match(scartati[0].motivo, /ambigu/i);
});

test("Tipo incoerente con la Giurisdizione: nessun Atto, il motivo dice quale", () => {
  const { daCreare, scartati } = decidiAttiNuovi([{ ...candidato, tipo: "decreto_legislativo" }], [], settori, ORA);
  assert.deepEqual(daCreare, []);
  assert.match(scartati[0].motivo, /non è un Tipo valido/);
});

test("soglie non valide: nessun Atto", () => {
  const soglie = [{ campo: "dipendenti" as const, minimo: "500", massimo: "100", paesi: [] }];
  const { daCreare, scartati } = decidiAttiNuovi([{ ...candidato, soglie }], [], settori, ORA);
  assert.deepEqual(daCreare, []);
  assert.match(scartati[0].motivo, /minimo/i);
});

test("un Settore inesistente non si crea: l'Atto nasce con i soli Settori noti, anche scritti con altre maiuscole", () => {
  const { daCreare } = decidiAttiNuovi(
    [{ ...candidato, settori: ["energia", "Esplorazione spaziale", "FINANZA E ASSICURAZIONI"] }],
    [],
    settori,
    ORA,
  );
  assert.deepEqual(daCreare[0].settori, [1, 2]);
});

test("«tutti i Settori» esclude i Settori specifici", () => {
  const tutti = decidiAttiNuovi([{ ...candidato, tuttiISettori: true, settori: ["Energia"] }], [], settori, ORA);
  assert.equal(tutti.daCreare[0].tuttiISettori, true);
  assert.deepEqual(tutti.daCreare[0].settori, []);
});

test("i Temi si ripuliscono dai doppioni che differiscono per maiuscole e si limitano a cinque", () => {
  const temi = ["Rendicontazione", "rendicontazione", " RENDICONTAZIONE ", "A", "B", "C", "D", "E"];
  const { daCreare } = decidiAttiNuovi([{ ...candidato, temi }], [], settori, ORA);
  assert.deepEqual(daCreare[0].temi, ["Rendicontazione", "A", "B", "C", "D"]);
});

test("lo stesso Atto proposto due volte nell'output si crea una volta sola", () => {
  const { daCreare } = decidiAttiNuovi(
    [candidato, { ...candidato, identificativoUfficiale: "32022l2464", titolo: "CSRD (bis)" }],
    [],
    settori,
    ORA,
  );
  assert.deepEqual(daCreare.map((a) => a.titolo), ["Direttiva CSRD"]);
});


test("se il primo candidato con un identificativo non è valido, il secondo con lo stesso identificativo si prova", () => {
  const { daCreare, scartati } = decidiAttiNuovi(
    [{ ...candidato, tipo: "decreto_legislativo" }, { ...candidato, titolo: "CSRD corretta" }],
    [],
    settori,
    ORA,
  );
  assert.equal(scartati.length, 1);
  assert.deepEqual(daCreare.map((a) => a.titolo), ["CSRD corretta"]);
});

test("un candidato valido senza Settori del catalogo diventa un Atto senza Settori", () => {
  const senzaSettori = { ...candidato, settori: ["Settore inventato"] };
  const esito = decidiAttiNuovi([senzaSettori], [], settori, ORA);
  assert.deepEqual(esito.daCreare.map((a) => a.settori), [[]]);
  assert.deepEqual(esito.scartati, []);

  const perTutti = decidiAttiNuovi([{ ...senzaSettori, tuttiISettori: true }], [], settori, ORA);
  assert.equal(perTutti.daCreare.length, 1);
});

test("oltre 20 candidati validi per Ricerca si creano i primi 20, gli altri si scartano con il motivo", () => {
  const molti = Array.from({ length: 22 }, (_, i) => ({
    ...candidato,
    identificativoUfficiale: `3202R${1000 + i}`,
    titolo: `Regolamento numero ${i}`,
  }));
  const { daCreare, scartati } = decidiAttiNuovi(molti, [], settori, ORA);
  assert.deepEqual(daCreare.map((a) => a.identificativoUfficiale), molti.slice(0, 20).map((c) => c.identificativoUfficiale));
  assert.deepEqual(scartati.map((s) => s.posizione), [21, 22]);
  assert.match(scartati[0].motivo, /tetto di 20/);
});

test("un candidato già abrogato non diventa Atto: l'agente non porta nel catalogo norme che non valgono più", () => {
  const { daCreare, scartati } = decidiAttiNuovi([{ ...candidato, stato: "abrogato" }], [], settori, ORA);
  assert.deepEqual(daCreare, []);
  assert.match(scartati[0].motivo, /abrogato/);
});
