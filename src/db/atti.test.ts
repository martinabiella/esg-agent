import assert from "node:assert/strict";
import test from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { postgresDiProva } from "./test/postgres";
import { valoriAttoDaNotizia } from "@/lib/atto-da-notizia";
import { validaAtto } from "@/lib/atto";

// db.execute usa il driver HTTP: nei test lo si esegue su Postgres in memoria.
async function preparaEsecuzione(t: test.TestContext) {
  const postgres = await postgresDiProva(t);
  const { db } = await import("./index");
  const dialetto = new PgDialect();
  t.mock.method(db, "execute", async (query: SQL) => {
    const { sql, params } = dialetto.sqlToQuery(query);
    return postgres.query(sql, params as unknown[]);
  });
  return postgres;
}

function campi() {
  const esito = validaAtto({
    ...valoriAttoDaNotizia({ titolo: "Proposta di direttiva sul clima", url: "https://eur-lex.europa.eu/x" }),
    giurisdizione: "ue",
    tipo: "direttiva",
  });
  assert.equal(esito.ok, true);
  return esito.ok ? esito.valori : (undefined as never);
}

test("creaAtto da una Notizia: collega la Notizia già controllata, così esce dall'Avviso", async (t) => {
  const postgres = await preparaEsecuzione(t);
  const { creaAtto } = await import("./atti");
  await postgres.exec(`
    INSERT INTO notizia (id, titolo, fonte, url, segnala_novita)
    VALUES (1, 'Proposta di direttiva sul clima', 'Fonte', 'https://eur-lex.europa.eu/x', true);
  `);

  const esito = await creaAtto(campi(), 1);

  assert.equal(esito.ok, true);
  assert.deepEqual((await postgres.query(`
    SELECT n.notizia_id, a.provenienza_contenuti, a.stato, (n.controllata_il IS NOT NULL) AS controllata
    FROM notizia_atto n JOIN atto_normativo a ON a.id = n.atto_id
  `)).rows, [{ notizia_id: 1, provenienza_contenuti: "persona", stato: "in_discussione", controllata: true }]);
});

test("creaAtto da una Notizia inesistente: non crea nulla", async (t) => {
  const postgres = await preparaEsecuzione(t);
  const { creaAtto } = await import("./atti");

  const esito = await creaAtto(campi(), 99);

  assert.deepEqual(esito, { ok: false, motivo: "collegamento_inesistente" });
  assert.deepEqual((await postgres.query(`SELECT id FROM atto_normativo`)).rows, []);
});

test("creaAtto senza Notizia: nessun collegamento", async (t) => {
  const postgres = await preparaEsecuzione(t);
  const { creaAtto } = await import("./atti");

  assert.equal((await creaAtto(campi())).ok, true);
  assert.deepEqual((await postgres.query(`SELECT * FROM notizia_atto`)).rows, []);
});

test("creaAtto da una Notizia già collegata a un Atto: non crea un secondo Atto", async (t) => {
  const postgres = await preparaEsecuzione(t);
  const { creaAtto } = await import("./atti");
  await postgres.exec(`
    INSERT INTO notizia (id, titolo, fonte, url, segnala_novita)
    VALUES (1, 'Proposta di direttiva sul clima', 'Fonte', 'https://eur-lex.europa.eu/x', true);
  `);

  assert.equal((await creaAtto(campi(), 1)).ok, true);
  const secondo = await creaAtto({ ...campi(), titolo: "Doppione" }, 1);

  assert.deepEqual(secondo, { ok: false, motivo: "notizia_gia_collegata" });
  assert.deepEqual((await postgres.query(`SELECT count(*)::int AS n FROM atto_normativo`)).rows, [{ n: 1 }]);
});
