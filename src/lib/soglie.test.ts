import { test } from "node:test";
import assert from "node:assert/strict";
import { righeSoglie } from "./soglie";

test("nessuna soglia: elenco vuoto", () => {
  for (const v of [null, undefined, "", [], {}, 5]) assert.deepEqual(righeSoglie(v), []);
});

test("un oggetto diventa una riga per chiave", () => {
  assert.deepEqual(righeSoglie({ dipendenti_min: 250, paesi: ["IT", "FR"] }), [
    "dipendenti min: 250",
    "paesi: IT, FR",
  ]);
});

test("un elenco di oggetti diventa una riga per soglia", () => {
  assert.deepEqual(righeSoglie([{ campo: "dipendenti", min: 250 }, "fatturato > 50M"]), [
    "campo: dipendenti, min: 250",
    "fatturato > 50M",
  ]);
});
