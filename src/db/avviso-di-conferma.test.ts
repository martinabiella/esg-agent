import assert from "node:assert/strict";
import test from "node:test";
import { postgresDiProva } from "./test/postgres";

test("segnaAttoControllato: le novità arrivate dopo l'apertura dell'avviso restano da controllare", async (t) => {
  const postgres = await postgresDiProva(t);
  const { segnaAttoControllato } = await import("./avviso-di-conferma");
  await postgres.exec(`
    INSERT INTO atto_normativo (id, titolo, giurisdizione, tipo, stato, provenienza_contenuti)
    VALUES (1, 'Atto A', 'ue', 'direttiva', 'in_vigore', 'agente'),
           (2, 'Atto B', 'ue', 'direttiva', 'in_vigore', 'persona');
    INSERT INTO stato_storico (id, atto_id, stato, data, provenienza)
    VALUES (1, 1, 'approvato', '2026-11-20', 'agente');
    INSERT INTO notizia (id, titolo, fonte, url, segnala_novita)
    VALUES (1, 'Prima novità', 'Fonte', 'https://example.org/1', true);
    INSERT INTO notizia_atto (notizia_id, atto_id) VALUES (1, 1), (1, 2);
  `);
  const mostrati = { cambiDiStato: [1], notizie: [1] };

  await postgres.exec(`
    INSERT INTO stato_storico (id, atto_id, stato, data, provenienza)
    VALUES (2, 1, 'in_vigore', '2026-11-21', 'agente');
    INSERT INTO notizia (id, titolo, fonte, url, segnala_novita)
    VALUES (2, 'Seconda novità', 'Fonte', 'https://example.org/2', true);
    INSERT INTO notizia_atto (notizia_id, atto_id) VALUES (2, 1);
  `);

  assert.equal(await segnaAttoControllato(1, mostrati), true);
  assert.deepEqual((await postgres.query(`
    SELECT id FROM stato_storico WHERE visto_il IS NULL ORDER BY id
  `)).rows, [{ id: 2 }]);
  assert.deepEqual((await postgres.query(`
    SELECT notizia_id, atto_id FROM notizia_atto WHERE controllata_il IS NULL ORDER BY notizia_id, atto_id
  `)).rows, [{ notizia_id: 1, atto_id: 2 }, { notizia_id: 2, atto_id: 1 }]);
  assert.deepEqual((await postgres.query(`
    SELECT criteri_confermati, provenienza_contenuti FROM atto_normativo WHERE id = 1
  `)).rows, [{ criteri_confermati: true, provenienza_contenuti: "persona" }]);
});

test("avvisoDiConferma: segna senza Settori solo l'Atto dell'agente senza Settori e non «per tutti i Settori»", async (t) => {
  const postgres = await postgresDiProva(t);
  const { queryAttiDaConfermare } = await import("./avviso-di-conferma");
  const { db } = await import("./index");
  await postgres.exec(`
    INSERT INTO settore (id, nome, descrizione) VALUES (1, 'Energia', 'Attività energetiche');
    INSERT INTO atto_normativo (id, titolo, giurisdizione, tipo, stato, provenienza_contenuti, criteri_confermati, tutti_i_settori)
    VALUES (1, 'Senza Settori', 'ue', 'direttiva', 'in_vigore', 'agente', false, false),
           (2, 'Con un Settore', 'ue', 'direttiva', 'in_vigore', 'agente', false, false),
           (3, 'Per tutti i Settori', 'ue', 'direttiva', 'in_vigore', 'agente', false, true);
    INSERT INTO atto_settore (atto_id, settore_id) VALUES (2, 1);
  `);

  const [righe] = await db.batch([queryAttiDaConfermare()]);

  assert.deepEqual(
    righe.map((r) => { const { id, senza_settori } = r as unknown as { id: number; senza_settori: boolean }; return [id, senza_settori]; }).sort(([a], [b]) => Number(a) - Number(b)),
    [[1, true], [2, false], [3, false]],
  );
});
