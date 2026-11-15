import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attoCalcolabile,
  calcolaApplicabilita,
  type AttoPerCalcolo,
  type ClientePerCalcolo,
} from "./applicabilita";

const CHIMICA = 1;
const TESSILE = 2;
const AGRO = 3;

function atto(parziale: Partial<AttoPerCalcolo> = {}): AttoPerCalcolo {
  return {
    criteriSoglie: null,
    criteriTesto: "",
    tuttiISettori: true,
    settori: [],
    ...parziale,
  };
}

function cliente(parziale: Partial<ClientePerCalcolo> = {}): ClientePerCalcolo {
  return { dipendenti: null, fatturato: null, paesi: null, settori: [CHIMICA], ...parziale };
}

const dip = { campo: "dipendenti", min: 250 };
const fat = { campo: "fatturato", min: 50_000_000 };

test("1-4: una Soglia sui dipendenti, minimo incluso", () => {
  const a = atto({ criteriSoglie: { soglie: [dip] } });
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 300 })), "applicabile");
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 200 })), "non_applicabile");
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: null })), "da_verificare");
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 250 })), "applicabile");
});

test("5-8: due Soglie, tutte da rispettare (default)", () => {
  const a = atto({ criteriSoglie: { soglie: [dip, fat] } });
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 300, fatturato: "60000000" })), "applicabile");
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 300, fatturato: "10000000" })), "non_applicabile");
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 300 })), "da_verificare");
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 200 })), "non_applicabile");
});

test("9-11: due Soglie, ne basta una", () => {
  const a = atto({ criteriSoglie: { richieste: 1, soglie: [dip, fat] } });
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 300 })), "applicabile");
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 200 })), "da_verificare");
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 200, fatturato: "10000000" })), "non_applicabile");
});

test("12: tutti i Settori e nessun'altra Soglia: applicabile a qualsiasi Cliente", () => {
  assert.equal(calcolaApplicabilita(atto(), cliente()), "applicabile");
  assert.equal(calcolaApplicabilita(atto(), cliente({ dipendenti: 3, settori: [AGRO] })), "applicabile");
});

test("13: Settori diversi da quelli del Cliente: non applicabile", () => {
  const a = atto({ tuttiISettori: false, settori: [CHIMICA, TESSILE] });
  assert.equal(calcolaApplicabilita(a, cliente({ settori: [AGRO] })), "non_applicabile");
});

test("Settore in comune: il Settore da solo non basta senza Soglie (17)", () => {
  const a = atto({ tuttiISettori: false, settori: [CHIMICA, TESSILE] });
  assert.equal(calcolaApplicabilita(a, cliente({ settori: [TESSILE, AGRO] })), "da_verificare");
});

test("Settore in comune e Soglie rispettate: applicabile", () => {
  const a = atto({ tuttiISettori: false, settori: [CHIMICA], criteriSoglie: { soglie: [dip] } });
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 300 })), "applicabile");
});

test("Settore diverso batte Soglie rispettate", () => {
  const a = atto({ tuttiISettori: false, settori: [CHIMICA], criteriSoglie: { soglie: [dip] } });
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 300, settori: [AGRO] })), "non_applicabile");
});

test("14: Soglia sui paesi con paesi non indicati: da verificare", () => {
  const a = atto({ criteriSoglie: { soglie: [{ campo: "paesi", inclusi: ["IT"] }] } });
  assert.equal(calcolaApplicabilita(a, cliente({ paesi: null })), "da_verificare");
});

test("Soglia sui paesi: rispettata o violata se i paesi sono noti", () => {
  const a = atto({ criteriSoglie: { soglie: [{ campo: "paesi", inclusi: ["IT"] }] } });
  assert.equal(calcolaApplicabilita(a, cliente({ paesi: ["FR", "IT"] })), "applicabile");
  assert.equal(calcolaApplicabilita(a, cliente({ paesi: ["FR"] })), "non_applicabile");
});

test("15: Soglie violate più testo libero: mai non applicabile", () => {
  const a = atto({ criteriSoglie: { soglie: [dip] }, criteriTesto: "Altre condizioni nel testo." });
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 10 })), "da_verificare");
});

test("Settore diverso più testo libero: da verificare", () => {
  const a = atto({ tuttiISettori: false, settori: [CHIMICA], criteriTesto: "Vedi allegato." });
  assert.equal(calcolaApplicabilita(a, cliente({ settori: [AGRO] })), "da_verificare");
});

test("16: Soglie rispettate più testo libero: da verificare", () => {
  const a = atto({ criteriSoglie: { soglie: [dip] }, criteriTesto: "Altre condizioni nel testo." });
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 300 })), "da_verificare");
});

test("Testo libero fatto solo di spazi non conta", () => {
  const a = atto({ criteriSoglie: { soglie: [dip] }, criteriTesto: "  \n " });
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 10 })), "non_applicabile");
});

test("17: nessuna Soglia, nessun testo, Settori specifici: da verificare", () => {
  const a = atto({ tuttiISettori: false, settori: [CHIMICA] });
  assert.equal(calcolaApplicabilita(a, cliente()), "da_verificare");
});

test("Tutti i Settori ma testo libero e nessuna Soglia: da verificare", () => {
  assert.equal(calcolaApplicabilita(atto({ criteriTesto: "Vedi testo." }), cliente()), "da_verificare");
});

test("18: Soglia su un dato che il Cliente non ha: da verificare", () => {
  const a = atto({ criteriSoglie: { soglie: [{ campo: "importazioni", min: 50 }] } });
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 1000 })), "da_verificare");
});

test("Soglia sconosciuta con le altre violate: non applicabile se tutte richieste", () => {
  const a = atto({ criteriSoglie: { soglie: [dip, { campo: "importazioni", min: 50 }] } });
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 10 })), "non_applicabile");
});

test("Forma delle Soglie non riconosciuta: da verificare", () => {
  const vecchia = atto({ criteriSoglie: { dipendenti_min: 250 } });
  assert.equal(calcolaApplicabilita(vecchia, cliente({ dipendenti: 10 })), "da_verificare");
  const lista = atto({ criteriSoglie: [{ campo: "importazioni", min_tonnellate: 50 }] });
  assert.equal(calcolaApplicabilita(lista, cliente()), "da_verificare");
});

test("Soglia con massimo", () => {
  const a = atto({ criteriSoglie: { soglie: [{ campo: "dipendenti", max: 249 }] } });
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 100 })), "applicabile");
  assert.equal(calcolaApplicabilita(a, cliente({ dipendenti: 250 })), "non_applicabile");
});

test("Il fatturato come stringa numeric viene confrontato come numero", () => {
  const a = atto({ criteriSoglie: { soglie: [fat] } });
  assert.equal(calcolaApplicabilita(a, cliente({ fatturato: "50000000.00" })), "applicabile");
  assert.equal(calcolaApplicabilita(a, cliente({ fatturato: "49999999.99" })), "non_applicabile");
});

test("Atti abrogati o non rilevanti non entrano nel calcolo", () => {
  assert.equal(attoCalcolabile({ stato: "in_vigore", nonRilevante: false }), true);
  assert.equal(attoCalcolabile({ stato: "abrogato", nonRilevante: false }), false);
  assert.equal(attoCalcolabile({ stato: "in_vigore", nonRilevante: true }), false);
});
