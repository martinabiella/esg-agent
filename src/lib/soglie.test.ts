import { test } from "node:test";
import assert from "node:assert/strict";
import { righeSoglie } from "./soglie";

test("mostra le Soglie calcolabili in modo leggibile", () => {
  assert.deepEqual(
    righeSoglie({
      richieste: 1,
      soglie: [{ campo: "dipendenti", min: 250 }, { campo: "paesi", inclusi: ["IT"] }],
    }),
    ["dipendenti: minimo 250", "paesi: tra IT", "Da rispettare: 1 su 2"],
  );
});

test("le forme vecchie restano leggibili", () => {
  assert.deepEqual(righeSoglie({ dipendenti_min: 250 }), ["dipendenti min: 250"]);
  assert.deepEqual(righeSoglie(null), []);
});
