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
  });
});

test("validaOutputRicerca: output con struttura sbagliata, motivo in italiano con il campo", () => {
  const esito = validaOutputRicerca({ notizie: [{ ...notiziaValida, url: null }] }, ORA);
  assert.equal(esito.ok, false);
  if (!esito.ok) {
    assert.match(esito.errore, /^Il risultato di Parallel non rispetta lo schema \(v1\): /);
    assert.match(esito.errore, /notizie\.1\.url/);
    assert.match(esito.errore, /atteso string/);
  }
  for (const content of [null, "testo", { notizie: "x" }, {}]) {
    assert.equal(validaOutputRicerca(content, ORA).ok, false, JSON.stringify(content));
  }
});

test("validaOutputRicerca: URL non http, titolo vuoto o data non reale rendono l'output non valido", () => {
  const casi = [
    { modifica: { url: "/relativo/articolo" }, campo: "notizie.1.url" },
    { modifica: { url: "javascript:alert(1)" }, campo: "notizie.1.url" },
    { modifica: { titolo: "   " }, campo: "notizie.1.titolo" },
    { modifica: { data: "18/11/2026" }, campo: "notizie.1.data" },
    { modifica: { data: "2026-02-30" }, campo: "notizie.1.data" },
    { modifica: { data: "2026-11-21" }, campo: "notizie.1.data" },
  ];
  for (const { modifica, campo } of casi) {
    const esito = validaOutputRicerca({ notizie: [{ ...notiziaValida, ...modifica }] }, ORA);
    assert.equal(esito.ok, false, JSON.stringify(modifica));
    if (!esito.ok) assert.ok(esito.errore.includes(campo), esito.errore);
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
