import { test } from "node:test";
import assert from "node:assert/strict";
import { percorsoInterno } from "./redirect-sicuro";

test("accetta percorsi interni", () => {
  assert.equal(percorsoInterno("/settori/3?x=1"), "/settori/3?x=1");
});

test("rifiuta URL esterni e valori non validi", () => {
  for (const v of ["//evil.com", "https://evil.com", "/\\evil.com", "settori", undefined, 5, "/accedi"]) {
    assert.equal(percorsoInterno(v), "/");
  }
});
