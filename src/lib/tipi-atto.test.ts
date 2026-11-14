import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TIPI_ATTO,
  tipiAmmessi,
  tipoAmmesso,
  validaTipoAtto,
} from "./tipi-atto";

test("per l'UE sono ammessi regolamento, direttiva, decisione e altro", () => {
  assert.deepEqual(tipiAmmessi("ue"), [
    "regolamento",
    "direttiva",
    "decisione",
    "altro",
  ]);
});

test("per l'Italia sono ammessi legge, decreto legislativo, decreto, disegno di legge e altro", () => {
  assert.deepEqual(tipiAmmessi("italia"), [
    "legge",
    "decreto_legislativo",
    "decreto",
    "disegno_di_legge",
    "altro",
  ]);
});

test("un regolamento è UE e non italiano", () => {
  assert.equal(tipoAmmesso("regolamento", "ue"), true);
  assert.equal(tipoAmmesso("regolamento", "italia"), false);
});

test("un decreto legislativo è italiano e non UE", () => {
  assert.equal(tipoAmmesso("decreto_legislativo", "italia"), true);
  assert.equal(tipoAmmesso("decreto_legislativo", "ue"), false);
});

test("'altro' vale per entrambe le Giurisdizioni", () => {
  assert.equal(tipoAmmesso("altro", "ue"), true);
  assert.equal(tipoAmmesso("altro", "italia"), true);
});

test("validaTipoAtto accetta un Tipo coerente", () => {
  assert.deepEqual(validaTipoAtto("direttiva", "ue"), { ok: true });
});

test("validaTipoAtto rifiuta un Tipo mancante", () => {
  const r = validaTipoAtto(undefined, "ue");
  assert.equal(r.ok, false);
  assert.equal(validaTipoAtto("", "ue").ok, false);
  assert.equal(validaTipoAtto(null, "italia").ok, false);
});

test("validaTipoAtto rifiuta un Tipo sconosciuto", () => {
  assert.equal(validaTipoAtto("ordinanza", "italia").ok, false);
});

test("validaTipoAtto rifiuta regolamento + Italia con un messaggio in italiano", () => {
  const r = validaTipoAtto("regolamento", "italia");
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.errore, /Regolamento.*Italia/);
});

test("ogni Tipo è ammesso per almeno una Giurisdizione", () => {
  for (const t of TIPI_ATTO) {
    assert.ok(tipoAmmesso(t, "ue") || tipoAmmesso(t, "italia"), t);
  }
});
