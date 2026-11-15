import { test } from "node:test";
import assert from "node:assert/strict";
import { idSettore, validaSettore, valutaEliminazione } from "./settore";

test("un nome valido è accettato e ripulito dagli spazi ai bordi", () => {
  assert.deepEqual(validaSettore({ nome: "  Energia ", descrizione: " Gas e luce " }), {
    ok: true,
    valori: { nome: "Energia", descrizione: "Gas e luce" },
  });
});

test("la descrizione è facoltativa", () => {
  const esito = validaSettore({ nome: "Energia", descrizione: undefined });
  assert.deepEqual(esito, { ok: true, valori: { nome: "Energia", descrizione: "" } });
});

test("nome vuoto o di soli spazi è rifiutato con un messaggio sul campo", () => {
  for (const nome of ["", "   ", "\t\n", undefined]) {
    const esito = validaSettore({ nome, descrizione: "x" });
    assert.equal(esito.ok, false);
    if (!esito.ok) assert.equal(esito.errori.nome, "Il nome è obbligatorio.");
  }
});

test("l'errore conserva quanto digitato", () => {
  const esito = validaSettore({ nome: "  ", descrizione: "Attività incluse" });
  assert.equal(esito.ok, false);
  if (!esito.ok) assert.deepEqual(esito.valori, { nome: "  ", descrizione: "Attività incluse" });
});

test("eliminare un Settore non usato è consentito senza avvisi", () => {
  assert.deepEqual(valutaEliminazione({ clienti: 0, atti: 0 }), {
    consentita: true,
    avviso: null,
  });
});

test("un Settore usato da Clienti non si elimina, e il messaggio dice quanti", () => {
  const uno = valutaEliminazione({ clienti: 1, atti: 3 });
  assert.deepEqual(uno, {
    consentita: false,
    messaggio: "Il Settore è usato da 1 Cliente: non può essere eliminato.",
  });
  const due = valutaEliminazione({ clienti: 2, atti: 0 });
  assert.equal(due.consentita, false);
  if (!due.consentita) {
    assert.equal(due.messaggio, "Il Settore è usato da 2 Clienti: non può essere eliminato.");
  }
});

test("se è collegato ad Atti, la conferma dice quanti perderanno il collegamento", () => {
  assert.deepEqual(valutaEliminazione({ clienti: 0, atti: 1 }), {
    consentita: true,
    avviso: "1 Atto perderà il collegamento con questo Settore.",
  });
  assert.deepEqual(valutaEliminazione({ clienti: 0, atti: 4 }), {
    consentita: true,
    avviso: "4 Atti perderanno il collegamento con questo Settore.",
  });
});

test("un id valido è un intero positivo che sta in un int4", () => {
  assert.equal(idSettore("7"), 7);
  assert.equal(idSettore("2147483647"), 2147483647);
});

test("id non numerico, zero, negativo, decimale o troppo grande è rifiutato", () => {
  for (const g of ["abc", "", "0", "-1", "1.5", "2147483648", "1e3", " ", null, undefined]) {
    assert.equal(idSettore(g), null, String(g));
  }
});
