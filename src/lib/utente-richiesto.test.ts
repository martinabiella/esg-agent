import { test } from "node:test";
import assert from "node:assert/strict";
import { NonAutenticatoError, richiediUtente } from "./utente-richiesto";

test("senza sessione la richiesta è rifiutata", async () => {
  await assert.rejects(
    richiediUtente(async () => ({ data: null })),
    NonAutenticatoError,
  );
  await assert.rejects(
    richiediUtente(async () => ({ data: {} })),
    NonAutenticatoError,
  );
});

test("se la lettura della sessione fallisce la richiesta è rifiutata", async () => {
  await assert.rejects(
    richiediUtente(async () => {
      throw new Error("rete");
    }),
    NonAutenticatoError,
  );
});

test("con sessione restituisce l'utente", async () => {
  const utente = { id: "1", email: "a@b.it" };
  assert.deepEqual(await richiediUtente(async () => ({ data: { user: utente } })), utente);
});
