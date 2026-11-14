import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CODICI_PAESI,
  CODICI_UE,
  nomePaese,
  paeseValido,
  validaPaesi,
} from "./paesi";

test("l'elenco ISO 3166-1 ha 249 codici a due lettere, senza doppioni", () => {
  assert.equal(CODICI_PAESI.length, 249);
  assert.equal(new Set(CODICI_PAESI).size, 249);
  for (const c of CODICI_PAESI) assert.match(c, /^[A-Z]{2}$/);
});

test("ogni codice ha un nome italiano diverso dal codice", () => {
  for (const c of CODICI_PAESI) {
    const n = nomePaese(c);
    assert.ok(n && n !== c, c);
  }
});

test("alcuni nomi in italiano", () => {
  assert.equal(nomePaese("IT"), "Italia");
  assert.equal(nomePaese("DE"), "Germania");
  assert.equal(nomePaese("US"), "Stati Uniti");
});

test("nomePaese per un codice non valido è undefined", () => {
  assert.equal(nomePaese("XX"), undefined);
  assert.equal(nomePaese("it"), undefined);
});

test("il gruppo UE ha esattamente 27 codici, tutti validi", () => {
  assert.equal(CODICI_UE.length, 27);
  assert.equal(new Set(CODICI_UE).size, 27);
  for (const c of CODICI_UE) assert.ok(paeseValido(c), c);
  assert.ok(CODICI_UE.includes("IT"));
  assert.ok(!CODICI_UE.includes("GB"));
});

test("paeseValido rifiuta codici non ISO", () => {
  assert.equal(paeseValido("IT"), true);
  assert.equal(paeseValido("XX"), false);
  assert.equal(paeseValido("ITA"), false);
  assert.equal(paeseValido(""), false);
  assert.equal(paeseValido("it"), false);
});

test("validaPaesi segnala i codici non validi invece di ignorarli", () => {
  assert.deepEqual(validaPaesi(["IT", "FR"]), { ok: true });
  const r = validaPaesi(["IT", "Italia", "XX"]);
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(r.nonValidi, ["Italia", "XX"]);
});
