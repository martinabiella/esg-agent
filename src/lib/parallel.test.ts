import { test } from "node:test";
import assert from "node:assert/strict";
import { verificaFirmaWebhook } from "./parallel";

// Vettore di prova della libreria di riferimento di Standard Webhooks, lo
// schema di firma usato da Parallel (libraries/javascript/src/webhook.test.ts).
const SEGRETO = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const CORPO = `{"test": 2432232314}`;
const INTESTAZIONI = {
  id: "msg_p5jXN8AQM9LWM0D4loKWxJek",
  timestamp: "1614265330",
  firma: "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=",
};
const ORA = new Date(1614265330 * 1000);

test("verificaFirmaWebhook: accetta una firma valida", () => {
  assert.equal(verificaFirmaWebhook(SEGRETO, INTESTAZIONI, CORPO, ORA), true);
  assert.equal(verificaFirmaWebhook(SEGRETO, INTESTAZIONI, new TextEncoder().encode(CORPO), ORA), true);
});

test("verificaFirmaWebhook: rifiuta firma errata, corpo alterato, altro segreto o intestazioni mancanti", () => {
  const casi = [
    { segreto: SEGRETO, intestazioni: { ...INTESTAZIONI, firma: "v1,dawfeoifkpqwoekfpqoekf" }, corpo: CORPO },
    { segreto: SEGRETO, intestazioni: { ...INTESTAZIONI, firma: "v2,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=" }, corpo: CORPO },
    { segreto: SEGRETO, intestazioni: INTESTAZIONI, corpo: `{"test": 2432232315}` },
    { segreto: SEGRETO, intestazioni: { ...INTESTAZIONI, id: "msg_altro" }, corpo: CORPO },
    { segreto: "whsec_QWx0cm9TZWdyZXRvRGlQcm92YTEyMzQ1Ng==", intestazioni: INTESTAZIONI, corpo: CORPO },
    { segreto: SEGRETO, intestazioni: { ...INTESTAZIONI, firma: null }, corpo: CORPO },
    { segreto: SEGRETO, intestazioni: { ...INTESTAZIONI, id: null }, corpo: CORPO },
    { segreto: SEGRETO, intestazioni: { ...INTESTAZIONI, timestamp: null }, corpo: CORPO },
  ];
  for (const { segreto, intestazioni, corpo } of casi) {
    assert.equal(verificaFirmaWebhook(segreto, intestazioni, corpo, ORA), false, JSON.stringify(intestazioni));
  }
});

test("verificaFirmaWebhook: con più firme (rotazione del segreto) basta che una corrisponda", () => {
  const firma = `v1,Zm9ydGVtZW50ZVNiYWdsaWF0YQ== ${INTESTAZIONI.firma}`;
  assert.equal(verificaFirmaWebhook(SEGRETO, { ...INTESTAZIONI, firma }, CORPO, ORA), true);
});

test("verificaFirmaWebhook: rifiuta un timestamp lontano più di 5 minuti, contro le ripetizioni", () => {
  const minuti = (m: number) => new Date(ORA.getTime() + m * 60_000);
  assert.equal(verificaFirmaWebhook(SEGRETO, INTESTAZIONI, CORPO, minuti(4)), true);
  assert.equal(verificaFirmaWebhook(SEGRETO, INTESTAZIONI, CORPO, minuti(-4)), true);
  assert.equal(verificaFirmaWebhook(SEGRETO, INTESTAZIONI, CORPO, minuti(6)), false);
  assert.equal(verificaFirmaWebhook(SEGRETO, INTESTAZIONI, CORPO, minuti(-6)), false);
  assert.equal(verificaFirmaWebhook(SEGRETO, { ...INTESTAZIONI, timestamp: "ieri" }, CORPO, ORA), false);
});
