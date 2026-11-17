import { test } from "node:test";
import assert from "node:assert/strict";
import { destinazioneDopoAccesso, percorsoInterno } from "./redirect-sicuro";

test("mantiene percorso, query e frammento per i link interni", () => {
  assert.equal(destinazioneDopoAccesso("/settori/3?x=1#clienti"), "/settori/3?x=1#clienti");
  assert.equal(percorsoInterno("/auth/sign-out"), "/auth/sign-out");
});

test("rifiuta destinazioni esterne anche dopo la normalizzazione", () => {
  for (const v of ["//evil.com", "https://evil.com", "/\\evil.com", "/a/..//evil.com", "/a/%2e%2e//evil.com", "/\t/evil.com", "settori", undefined, 5]) {
    assert.equal(percorsoInterno(v), "/");
  }
});

test("dopo l'accesso non torna ai flussi di autenticazione", () => {
  for (const v of ["/accedi", "/reimposta?token=x", "/auth/sign-in?redirectTo=/", "/x/../auth/sign-out", "/api/auth/sign-out"]) {
    assert.equal(destinazioneDopoAccesso(v), "/");
  }
});
