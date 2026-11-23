import { test } from "node:test";
import assert from "node:assert/strict";
import { componiSummaryAgente, separaAvvisoAgente } from "./avviso-agente";

test("separaAvvisoAgente: un summary composto dall'agente si separa in avviso e testo", () => {
  const summary = componiSummaryAgente("Estende la rendicontazione.\nSi applica alle grandi imprese.", {
    daNotizia: "https://www.esempio.it/omnibus",
    discrepanze: ["Stato: «proposta» secondo A, «in vigore» secondo B."],
  });
  assert.deepEqual(separaAvvisoAgente(summary), {
    avviso: {
      daNotizia: "https://www.esempio.it/omnibus",
      discrepanze: ["Stato: «proposta» secondo A, «in vigore» secondo B."],
    },
    testo: "Estende la rendicontazione.\nSi applica alle grandi imprese.",
  });
});

test("separaAvvisoAgente: un summary scritto da una persona resta intero, senza avviso", () => {
  const testo = "Estende la rendicontazione.\n[Agente] non conta se non è in testa.";
  assert.deepEqual(separaAvvisoAgente(testo), { avviso: null, testo });
});

test("componiSummaryAgente: senza origine né discordanze il summary non cambia", () => {
  assert.equal(componiSummaryAgente("Testo.", { daNotizia: null, discrepanze: [] }), "Testo.");
});

test("separaAvvisoAgente: se la persona cancella le righe dell'agente l'avviso sparisce", () => {
  const composto = componiSummaryAgente("Testo.", { daNotizia: null, discrepanze: ["Stato discorde."] });
  const modificato = composto.split("\n").slice(2).join("\n");
  assert.deepEqual(separaAvvisoAgente(modificato), { avviso: null, testo: "Testo." });
});

test("componiSummaryAgente: gli a capo dentro una discordanza non spezzano l'avviso", () => {
  const summary = componiSummaryAgente("Testo.", {
    daNotizia: null,
    discrepanze: ["Stato:\n«proposta» secondo A,\r\n«in vigore» secondo B."],
  });
  assert.deepEqual(separaAvvisoAgente(summary), {
    avviso: { daNotizia: null, discrepanze: ["Stato: «proposta» secondo A, «in vigore» secondo B."] },
    testo: "Testo.",
  });
});
