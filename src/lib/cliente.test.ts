import { test } from "node:test";
import assert from "node:assert/strict";
import { formattaFatturato, idCliente } from "./cliente";

test("formatta il fatturato in formato italiano senza perdere le cifre decimali", () => {
  assert.equal(
    formattaFatturato("12345678901234567890.1234"),
    "12.345.678.901.234.567.890,1234 €",
  );
});

test("formatta anche importi interi e negativi", () => {
  assert.equal(formattaFatturato("1500000"), "1.500.000 €");
  assert.equal(formattaFatturato("-42.50"), "-42,50 €");
});

test("un id Cliente valido è un intero positivo che sta in un int4", () => {
  assert.equal(idCliente("7"), 7);
  assert.equal(idCliente("2147483647"), 2147483647);
});

test("un id Cliente non numerico o fuori range è rifiutato", () => {
  for (const grezzo of ["abc", "", "0", "-1", "1.5", "2147483648", "1e3", " "]) {
    assert.equal(idCliente(grezzo), null, grezzo);
  }
});
