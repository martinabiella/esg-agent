import { test } from "node:test";
import assert from "node:assert/strict";
import { accessoCron } from "./cron";

const SEGRETO = "segreto-di-prova-lungo-abbastanza";

test("accessoCron: autorizzato con l'header che Vercel manda, Bearer e il segreto", () => {
  assert.equal(accessoCron(`Bearer ${SEGRETO}`, SEGRETO), "autorizzato");
});

test("accessoCron: rifiutato senza header, con un segreto sbagliato o senza Bearer", () => {
  for (const intestazione of [null, "", `Bearer ${SEGRETO}x`, "Bearer ", SEGRETO, `bearer ${SEGRETO}`]) {
    assert.equal(accessoCron(intestazione, SEGRETO), "rifiutato", `header ${JSON.stringify(intestazione)}`);
  }
});

test("accessoCron: senza CRON_SECRET nell'ambiente nessuna richiesta passa", () => {
  for (const segreto of [undefined, ""]) {
    assert.equal(accessoCron("Bearer ", segreto), "non_configurato");
    assert.equal(accessoCron("Bearer undefined", segreto), "non_configurato");
  }
});
