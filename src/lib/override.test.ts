import { test } from "node:test";
import assert from "node:assert/strict";
import { applicabilitaEffettiva, criteriModificatiDopo, validaOverride } from "./override";

test("l'Override sostituisce l'esito calcolato", () => {
  assert.equal(applicabilitaEffettiva("da_verificare", { esito: "applicabile" }), "applicabile");
  assert.equal(applicabilitaEffettiva("applicabile", { esito: "non_applicabile" }), "non_applicabile");
  assert.equal(applicabilitaEffettiva("non_applicabile", { esito: "applicabile" }), "applicabile");
});

test("senza Override vale l'esito calcolato", () => {
  assert.equal(applicabilitaEffettiva("da_verificare", null), "da_verificare");
  assert.equal(applicabilitaEffettiva("non_applicabile", undefined), "non_applicabile");
});

test("valida esito e motivazione", () => {
  const ok = validaOverride({ esito: "applicabile", motivazione: "  Confermato dal cliente.  " });
  assert.deepEqual(ok, { ok: true, valori: { esito: "applicabile", motivazione: "Confermato dal cliente." } });
});

test("la motivazione è obbligatoria", () => {
  for (const motivazione of ["", "   \n", undefined]) {
    const r = validaOverride({ esito: "applicabile", motivazione });
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errori.motivazione);
  }
});

test("ammessi solo applicabile e non applicabile", () => {
  for (const esito of ["da_verificare", "", "boh", undefined]) {
    const r = validaOverride({ esito, motivazione: "Motivo." });
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errori.esito);
  }
});

test("criteri modificati dopo la decisione", () => {
  const decisione = new Date("2026-03-01T10:00:00Z");
  assert.equal(criteriModificatiDopo(decisione, new Date("2026-03-02T10:00:00Z")), true);
  assert.equal(criteriModificatiDopo(decisione, new Date("2026-02-28T10:00:00Z")), false);
  assert.equal(criteriModificatiDopo(decisione, decisione), false);
});
