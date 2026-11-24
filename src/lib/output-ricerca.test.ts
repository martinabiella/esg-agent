import { test } from "node:test";
import assert from "node:assert/strict";
import { schemaOutputParallel, validaOutputRicerca } from "./output-ricerca";

const ORA = new Date("2026-11-19T10:00:00Z");

const notiziaValida = {
  titolo: "  Omnibus: rinviati gli obblighi CSRD  ",
  url: "https://www.esempio.it/omnibus?utm_source=nl",
  data: "2026-11-18",
  pubblicata_da: " Il Sole 24 Ore ",
  riassunto: " La Commissione propone di rinviare di due anni. ",
  segnala_novita: true,
  atti_citati: [{ identificativo_ufficiale: "32022L2464", titolo: "CSRD", giurisdizione: "ue" }],
};

test("validaOutputRicerca: un output valido diventa l'elenco delle Notizie trovate, ripulito", () => {
  assert.deepEqual(validaOutputRicerca({ notizie: [notiziaValida] }, ORA), {
    ok: true,
    notizie: [
      {
        titolo: "Omnibus: rinviati gli obblighi CSRD",
        url: "https://www.esempio.it/omnibus",
        data: "2026-11-18",
        pubblicataDa: "Il Sole 24 Ore",
        riassunto: "La Commissione propone di rinviare di due anni.",
        segnalaNovita: true,
        attiCitati: [{ identificativoUfficiale: "32022L2464", titolo: "CSRD", giurisdizione: "ue" }],
      },
    ],
    scartate: [],
    candidati: [],
    candidatiScartati: [],
    cambiDiStato: [],
    cambiScartati: [],
  });
});

test("validaOutputRicerca: senza l'elenco delle Notizie l'output non è valido, motivo in italiano", () => {
  for (const contenuto of [null, "testo", { notizie: "x" }, {}]) {
    const esito = validaOutputRicerca(contenuto, ORA);
    assert.equal(esito.ok, false, JSON.stringify(contenuto));
    if (!esito.ok) assert.match(esito.errore, /^Il risultato di Parallel non rispetta lo schema \(v3\):/);
  }
});

test("validaOutputRicerca: una Notizia con struttura sbagliata si scarta, le altre restano", () => {
  const altra = { ...notiziaValida, url: "https://www.esempio.it/altra", titolo: "Altra" };
  const esito = validaOutputRicerca({ notizie: [{ ...notiziaValida, url: null }, altra] }, ORA);
  assert.ok(esito.ok);
  assert.deepEqual(esito.notizie.map((n) => n.titolo), ["Altra"]);
  assert.equal(esito.scartate.length, 1);
  assert.equal(esito.scartate[0].posizione, 1);
  assert.match(esito.scartate[0].motivo, /^notizie\.1\.url: .*atteso string/);
});

test("validaOutputRicerca: URL non http, titolo vuoto o data non reale scartano solo quella Notizia", () => {
  const casi = [
    { modifica: { url: "/relativo/pagina" }, campo: "notizie.2.url" },
    { modifica: { url: "javascript:alert(1)" }, campo: "notizie.2.url" },
    { modifica: { titolo: "   " }, campo: "notizie.2.titolo" },
    { modifica: { data: "18/11/2026" }, campo: "notizie.2.data" },
    { modifica: { data: "2026-02-30" }, campo: "notizie.2.data" },
    { modifica: { data: "2026-11-21" }, campo: "notizie.2.data" },
  ];
  for (const { modifica, campo } of casi) {
    const esito = validaOutputRicerca({ notizie: [notiziaValida, { ...notiziaValida, ...modifica }] }, ORA);
    assert.ok(esito.ok, JSON.stringify(modifica));
    assert.equal(esito.notizie.length, 1, JSON.stringify(modifica));
    assert.deepEqual(esito.scartate.map((s) => s.posizione), [2]);
    assert.ok(esito.scartate[0].motivo.startsWith(campo), esito.scartate[0].motivo);
  }
});

test("validaOutputRicerca: accetta la data di domani, per il fuso orario della pubblicazione", () => {
  const esito = validaOutputRicerca({ notizie: [{ ...notiziaValida, data: "2026-11-20" }] }, ORA);
  assert.ok(esito.ok && esito.notizie[0].data === "2026-11-20");
});

// Limiti documentati da Parallel per output_schema (docs.parallel.ai, "Specify a task").
const PAROLE_NON_SUPPORTATE = [
  "contains", "format", "maxContains", "maxItems", "maxLength", "maxProperties", "maximum",
  "minContains", "minItems", "minLength", "minimum", "minProperties", "multipleOf", "pattern",
  "patternProperties", "propertyNames", "uniqueItems", "unevaluatedItems", "unevaluatedProperties",
];

type Nodo = Record<string, unknown>;

function oggetti(nodo: unknown, profondita = 1): { nodo: Nodo; profondita: number }[] {
  if (Array.isArray(nodo)) return nodo.flatMap((n) => oggetti(n, profondita));
  if (typeof nodo !== "object" || nodo === null) return [];
  const n = nodo as Nodo;
  const figli = Object.entries(n).flatMap(([chiave, valore]) =>
    oggetti(valore, chiave === "properties" ? profondita + 1 : profondita),
  );
  return [{ nodo: n, profondita }, ...figli];
}

test("schemaOutputParallel: rispetta il sottoinsieme di JSON Schema accettato da Parallel", () => {
  const schema = schemaOutputParallel() as Nodo;
  assert.equal(schema.type, "object");
  assert.ok(schema.properties);
  assert.equal(schema.anyOf, undefined);
  assert.equal(schema.$schema, undefined);

  const tutti = oggetti(schema);
  for (const { nodo } of tutti) {
    for (const parola of PAROLE_NON_SUPPORTATE) assert.equal(nodo[parola], undefined, parola);
    if (nodo.type === "object") {
      assert.equal(nodo.additionalProperties, false);
      assert.deepEqual([...(nodo.required as string[])].sort(), Object.keys(nodo.properties as Nodo).sort());
    }
  }
  assert.ok(Math.max(...tutti.map((t) => t.profondita)) <= 5);
  const proprieta = tutti.reduce((n, t) => n + (t.nodo.type === "object" ? Object.keys(t.nodo.properties as Nodo).length : 0), 0);
  assert.ok(proprieta <= 100);
  assert.ok(JSON.stringify(schema).length <= 15000);
});

test("schemaOutputParallel: chiede le Notizie con i campi validati da validaOutputRicerca", () => {
  const schema = schemaOutputParallel() as {
    properties: { notizie: { items: { properties: Nodo & { atti_citati: { items: { properties: Nodo } } } } } };
  };
  const notizia = schema.properties.notizie.items.properties;
  assert.deepEqual(Object.keys(notizia).sort(), [
    "atti_citati", "data", "pubblicata_da", "riassunto", "segnala_novita", "titolo", "url",
  ]);
  assert.deepEqual(Object.keys(notizia.atti_citati.items.properties).sort(), [
    "giurisdizione", "identificativo_ufficiale", "titolo",
  ]);
});

test("validaOutputRicerca: data o editore vuoti valgono come assenti", () => {
  const esito = validaOutputRicerca({ notizie: [{ ...notiziaValida, data: " ", pubblicata_da: "" }] }, ORA);
  assert.ok(esito.ok);
  assert.equal(esito.notizie[0].data, null);
  assert.equal(esito.notizie[0].pubblicataDa, null);
});

const candidatoValido = {
  identificativo_ufficiale: " 32022L2464 ",
  titolo: " Direttiva CSRD ",
  giurisdizione: "ue",
  tipo: "direttiva",
  stato: "in_vigore",
  url_testo: " https://eur-lex.europa.eu/eli/dir/2022/2464/oj ",
  summary: " Estende la rendicontazione di sostenibilità. ",
  criteri_testo: " Grandi imprese. ",
  soglie: [{ campo: "dipendenti", minimo: "250", massimo: null, paesi: [] }],
  tutti_i_settori: false,
  settori: ["Energia", " "],
  temi: [" Rendicontazione "],
  da_notizia: "https://www.esempio.it/omnibus?utm_source=nl",
  discrepanze: [" Stato: «proposta» secondo un altro articolo. ", ""],
};

test("validaOutputRicerca: un candidato Atto valido arriva ripulito accanto alle Notizie", () => {
  const esito = validaOutputRicerca({ notizie: [notiziaValida], atti_candidati: [candidatoValido] }, ORA);
  assert.ok(esito.ok);
  assert.deepEqual(esito.candidati, [
    {
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
      discrepanze: ["Stato: «proposta» secondo un altro articolo."],
    },
  ]);
  assert.equal(esito.notizie.length, 1);
});

test("validaOutputRicerca: un candidato con struttura sbagliata si scarta da solo, Notizie e altri candidati restano", () => {
  const altro = { ...candidatoValido, identificativo_ufficiale: "32024R1689", titolo: "AI Act" };
  const esito = validaOutputRicerca(
    { notizie: [notiziaValida], atti_candidati: [{ ...candidatoValido, tipo: "ordinanza" }, altro] },
    ORA,
  );
  assert.ok(esito.ok);
  assert.equal(esito.notizie.length, 1);
  assert.deepEqual(esito.candidati.map((c) => c.titolo), ["AI Act"]);
  assert.equal(esito.candidatiScartati.length, 1);
  assert.equal(esito.candidatiScartati[0].posizione, 1);
  assert.match(esito.candidatiScartati[0].motivo, /^atti_candidati\.1\.tipo: /);
});

test("validaOutputRicerca: senza atti_candidati l'output vale come senza candidati", () => {
  const esito = validaOutputRicerca({ notizie: [notiziaValida] }, ORA);
  assert.ok(esito.ok);
  assert.deepEqual(esito.candidati, []);
});

test("schemaOutputParallel: chiede i candidati Atto con i campi validati da validaOutputRicerca", () => {
  const schema = schemaOutputParallel() as { properties: { atti_candidati: { items: { properties: Nodo } } } };
  assert.deepEqual(Object.keys(schema.properties.atti_candidati.items.properties).sort(), [
    "criteri_testo", "da_notizia", "discrepanze", "giurisdizione", "identificativo_ufficiale",
    "settori", "soglie", "stato", "summary", "temi", "tipo", "titolo", "tutti_i_settori", "url_testo",
  ]);
});

test("validaOutputRicerca: un cambio di Stato valido arriva ripulito accanto a Notizie e candidati", () => {
  const esito = validaOutputRicerca(
    {
      notizie: [notiziaValida],
      cambi_di_stato: [{ identificativo_ufficiale: " 32022L2464 ", stato: "modificato", data: "2026-03-10" }],
    },
    ORA,
  );
  assert.ok(esito.ok);
  assert.deepEqual(esito.cambiDiStato, [
    { identificativoUfficiale: "32022L2464", stato: "modificato", data: "2026-03-10" },
  ]);
  assert.deepEqual(esito.cambiScartati, []);
});

test("validaOutputRicerca: un cambio di Stato malformato si scarta da solo, gli altri restano", () => {
  const buono = { identificativo_ufficiale: "32022L2464", stato: "in_vigore", data: "2026-03-10" };
  const esito = validaOutputRicerca(
    {
      notizie: [notiziaValida],
      cambi_di_stato: [
        { ...buono, stato: "sospeso" },
        { ...buono, data: "2027-01-01" },
        { ...buono, identificativo_ufficiale: "  " },
        buono,
      ],
    },
    ORA,
  );
  assert.ok(esito.ok);
  assert.deepEqual(esito.cambiDiStato.map((c) => c.stato), ["in_vigore"]);
  assert.deepEqual(esito.cambiScartati.map((c) => c.posizione), [1, 2, 3]);
  assert.match(esito.cambiScartati[0].motivo, /^cambi_di_stato\.1\.stato: /);
  assert.match(esito.cambiScartati[1].motivo, /^cambi_di_stato\.2\.data: /);
});

test("validaOutputRicerca: senza cambi_di_stato l'output vale come senza cambi", () => {
  const esito = validaOutputRicerca({ notizie: [notiziaValida] }, ORA);
  assert.ok(esito.ok);
  assert.deepEqual(esito.cambiDiStato, []);
});

test("schemaOutputParallel: chiede i cambi di Stato con i campi validati da validaOutputRicerca", () => {
  const schema = schemaOutputParallel() as { properties: { cambi_di_stato: { items: { properties: Nodo } } } };
  assert.deepEqual(Object.keys(schema.properties.cambi_di_stato.items.properties).sort(), [
    "data", "identificativo_ufficiale", "stato",
  ]);
});
