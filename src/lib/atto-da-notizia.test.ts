import assert from "node:assert/strict";
import test from "node:test";
import { puoCreareAttoDaNotizia, valoriAttoDaNotizia } from "./atto-da-notizia";

const notizia = (titolo: string, url: string) => ({ titolo, url });

test("precompila titolo, URL come riferimento e Stato «in discussione»", () => {
  const v = valoriAttoDaNotizia(notizia("Nuova norma sul clima", "https://example.org/a"));
  assert.equal(v.titolo, "Nuova norma sul clima");
  assert.equal(v.urlTesto, "https://example.org/a");
  assert.equal(v.stato, "in_discussione");
  assert.equal(v.identificativoUfficiale, "");
});

test("suggerisce Giurisdizione UE dal dominio e Tipo dal titolo", () => {
  const v = valoriAttoDaNotizia(notizia("Proposta di direttiva sulle emissioni", "https://eur-lex.europa.eu/x"));
  assert.equal(v.giurisdizione, "ue");
  assert.equal(v.tipo, "direttiva");
});

test("suggerisce Giurisdizione Italia dal titolo quando il dominio non basta", () => {
  const v = valoriAttoDaNotizia(notizia("Decreto legislativo sul reporting, il Governo approva", "https://example.org/b"));
  assert.equal(v.giurisdizione, "italia");
  assert.equal(v.tipo, "decreto_legislativo");
});

test("«disegno di legge» vince su «legge»", () => {
  assert.equal(valoriAttoDaNotizia(notizia("Disegno di legge sul suolo", "https://governo.it/x")).tipo, "disegno_di_legge");
});

test("senza indizi lascia Giurisdizione e Tipo da scegliere", () => {
  const v = valoriAttoDaNotizia(notizia("Novità in arrivo", "https://example.org/c"));
  assert.equal(v.giurisdizione, "");
  assert.equal(v.tipo, "");
});

test("scarta un Tipo non ammesso dalla Giurisdizione suggerita", () => {
  const v = valoriAttoDaNotizia(notizia("Regolamento del Ministero", "https://www.mase.gov.it/x"));
  assert.equal(v.giurisdizione, "italia");
  assert.equal(v.tipo, "");
});

test("si può creare un Atto solo da una Notizia con flag e senza Atti collegati", () => {
  assert.equal(puoCreareAttoDaNotizia({ segnalaNovita: true, atti: [] }), true);
  assert.equal(puoCreareAttoDaNotizia({ segnalaNovita: false, atti: [] }), false);
  assert.equal(puoCreareAttoDaNotizia({ segnalaNovita: true, atti: [{ id: 1 }] }), false);
});
