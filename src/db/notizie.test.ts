import assert from "node:assert/strict";
import test from "node:test";
import { postgresDiProva } from "./test/postgres";

test("aggiornaNotizia: conserva i controlli dei collegamenti rimasti", async (t) => {
  const postgres = await postgresDiProva(t);
  await postgres.exec(`
    INSERT INTO notizia (id, titolo, fonte, url)
    VALUES (1, 'Titolo iniziale', 'Testata', 'https://example.org/notizia');
    INSERT INTO atto_normativo (id, titolo, giurisdizione, tipo, stato)
    VALUES (1, 'Atto A', 'ue', 'direttiva', 'in_vigore'),
           (2, 'Atto B', 'ue', 'direttiva', 'in_vigore'),
           (3, 'Atto C', 'ue', 'direttiva', 'in_vigore');
    INSERT INTO notizia_atto (notizia_id, atto_id, controllata_il)
    VALUES (1, 1, '2026-11-20 10:30:00'), (1, 2, null);
  `);

  const { aggiornaNotizia } = await import("./notizie");

  const valori = {
    titolo: "Titolo corretto",
    fonte: "Testata",
    data: null,
    url: "https://example.org/notizia",
    riassunto: "",
    atti: [1, 2],
  };
  const collegamenti = async () => (await postgres.query(`
    SELECT atto_id, controllata_il::text
    FROM notizia_atto WHERE notizia_id = 1 ORDER BY atto_id
  `)).rows;

  assert.deepEqual(await aggiornaNotizia(1, valori), { ok: true, id: 1 });
  assert.deepEqual((await postgres.query("SELECT titolo FROM notizia WHERE id = 1")).rows, [
    { titolo: "Titolo corretto" },
  ]);
  assert.deepEqual(await collegamenti(), [
    { atto_id: 1, controllata_il: "2026-11-20 10:30:00" },
    { atto_id: 2, controllata_il: null },
  ]);

  assert.deepEqual(await aggiornaNotizia(1, { ...valori, atti: [1, 3] }), { ok: true, id: 1 });
  assert.deepEqual(await collegamenti(), [
    { atto_id: 1, controllata_il: "2026-11-20 10:30:00" },
    { atto_id: 3, controllata_il: null },
  ]);
});
