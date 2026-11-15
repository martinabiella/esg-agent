import { test } from "node:test";
import assert from "node:assert/strict";
import { filtriAttiDaParams } from "./filtri-atti";

test("senza parametri non c'è alcun filtro", () => {
  assert.deepEqual(filtriAttiDaParams({}), {});
});

test("settore, tema e stato validi sono letti", () => {
  assert.deepEqual(
    filtriAttiDaParams({ settore: "3", tema: "7", stato: "in_vigore" }),
    { settoreId: 3, temaId: 7, stato: "in_vigore" },
  );
});

test("id non numerici, a zero o fuori range sono ignorati", () => {
  for (const v of ["abc", "0", "-1", "1.5", "", "99999999999", "2147483648"]) {
    assert.deepEqual(filtriAttiDaParams({ settore: v, tema: v }), {}, v);
  }
});

test("uno Stato inesistente è ignorato", () => {
  assert.deepEqual(filtriAttiDaParams({ stato: "xyz" }), {});
  assert.deepEqual(filtriAttiDaParams({ stato: "" }), {});
});

test("un parametro ripetuto (array) è ignorato: un solo valore per filtro", () => {
  assert.deepEqual(filtriAttiDaParams({ settore: ["1", "2"], stato: ["abrogato"] }), {});
});

test("un filtro non valido non annulla gli altri", () => {
  assert.deepEqual(filtriAttiDaParams({ settore: "abc", tema: "2" }), { temaId: 2 });
});
