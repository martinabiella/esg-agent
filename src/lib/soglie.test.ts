import { test } from "node:test";
import assert from "node:assert/strict";
import { righeSoglie } from "./soglie";

test("mostra le Soglie calcolabili in modo leggibile", () => {
  assert.deepEqual(
    righeSoglie({
      versione: 1, minimoSoglie: 1,
      soglie: [{ campo: "dipendenti", minimo: 250 }, { campo: "paesi", paesi: ["IT"] }],
    }),
    ["dipendenti: minimo 250", "paesi: tra IT", "Da rispettare: 1 su 2"],
  );
});

test("le forme vecchie restano leggibili", () => {
  assert.deepEqual(righeSoglie({ dipendenti_minimo: 250 }), ["dipendenti minimo: 250"]);
  assert.deepEqual(righeSoglie(null), []);
});
