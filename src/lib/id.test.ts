import { test } from "node:test";
import assert from "node:assert/strict";
import { idIntero } from "./id";

test("un id valido è un intero positivo che sta in un int4", () => {
  assert.equal(idIntero("7"), 7);
  assert.equal(idIntero("2147483647"), 2147483647);
});

test("id non numerico, zero, negativo, decimale o troppo grande è rifiutato", () => {
  for (const g of ["abc", "", "0", "-1", "1.5", "2147483648", "1e3", " ", null, undefined]) {
    assert.equal(idIntero(g), null, String(g));
  }
});
