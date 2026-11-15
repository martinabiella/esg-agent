import { test } from "node:test";
import assert from "node:assert/strict";
import { notiziaIdDaParams } from "./notizia";

test("legge un id Notizia valido dalla query string", () => {
  assert.equal(notiziaIdDaParams({ notizia: "7" }), 7);
});

test("ignora id Notizia non validi o parametri ripetuti", () => {
  for (const valore of ["abc", "0", "-1", "1.5", "2147483648", ""]) {
    assert.equal(notiziaIdDaParams({ notizia: valore }), null, valore);
  }
  assert.equal(notiziaIdDaParams({ notizia: ["1", "2"] }), null);
  assert.equal(notiziaIdDaParams({}), null);
});
