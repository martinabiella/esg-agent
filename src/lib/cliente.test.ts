import { test } from "node:test";
import assert from "node:assert/strict";
import { formattaFatturato } from "./cliente";

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
