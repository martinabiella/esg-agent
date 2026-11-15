import { test } from "node:test";
import assert from "node:assert/strict";
import { formattaFatturato, validaCliente } from "./cliente";

test("formatta il fatturato in formato italiano senza perdere le cifre decimali", () => {
  assert.equal(
    formattaFatturato("12345678901234567890.1234"),
    "12.345.678.901.234.567.890,1234 €",
  );
});

test("formatta anche importi interi e negativi", () => {
  assert.equal(formattaFatturato("1500000"), "1.500.000 €");
  assert.equal(formattaFatturato("-42.50"), "-42,50 €");
});


const base = {
  ragioneSociale: "Acme Srl",
  attivitaSpecifica: "Produzione di bulloni",
  settori: ["1"],
};

function ok(input: Parameters<typeof validaCliente>[0]) {
  const esito = validaCliente(input, 2026);
  assert.equal(esito.ok, true);
  return esito.ok ? esito.valori : (undefined as never);
}

function errori(input: Parameters<typeof validaCliente>[0]) {
  const esito = validaCliente(input, 2026);
  assert.equal(esito.ok, false);
  return esito.ok ? (undefined as never) : esito.errori;
}

test("solo i dati obbligatori: i facoltativi vuoti diventano assenti", () => {
  const v = ok({
    ...base,
    dipendenti: "",
    fatturato: "  ",
    annoRiferimento: "",
    paesi: [],
    note: "",
  });
  assert.deepEqual(v, {
    ragioneSociale: "Acme Srl",
    attivitaSpecifica: "Produzione di bulloni",
    settori: [1],
    dipendenti: null,
    fatturato: null,
    annoRiferimento: null,
    paesi: null,
    note: null,
  });
});

test("tutti i dati facoltativi, con zero valido e fatturato con virgola", () => {
  const v = ok({
    ...base,
    settori: ["2", "1", "2"],
    dipendenti: "0",
    fatturato: "1500000,50",
    annoRiferimento: "2024",
    paesi: ["IT", "FR", "IT"],
    note: " cliente storico ",
  });
  assert.deepEqual(v.settori, [2, 1]);
  assert.equal(v.dipendenti, 0);
  assert.equal(v.fatturato, "1500000.50");
  assert.equal(v.annoRiferimento, 2024);
  assert.deepEqual(v.paesi, ["IT", "FR"]);
  assert.equal(v.note, "cliente storico");
});

test("il fatturato resta stringa senza perdere cifre", () => {
  assert.equal(ok({ ...base, fatturato: "12345678901234567890.1234", annoRiferimento: "2024" }).fatturato, "12345678901234567890.1234");
});

test("ragione sociale, attività e Settore sono obbligatori", () => {
  const e = errori({ ragioneSociale: " ", attivitaSpecifica: "", settori: [] });
  assert.ok(e.ragioneSociale);
  assert.ok(e.attivitaSpecifica);
  assert.ok(e.settori);
});

test("settore con id non valido è rifiutato", () => {
  assert.ok(errori({ ...base, settori: ["abc"] }).settori);
});

test("fatturato senza anno di riferimento è rifiutato", () => {
  assert.ok(errori({ ...base, fatturato: "100" }).annoRiferimento);
});

test("anno implausibile è rifiutato", () => {
  assert.ok(errori({ ...base, annoRiferimento: "1800" }).annoRiferimento);
  assert.ok(errori({ ...base, annoRiferimento: "2027" }).annoRiferimento);
  assert.ok(errori({ ...base, annoRiferimento: "20x4" }).annoRiferimento);
});

test("dipendenti e fatturato negativi o non numerici sono rifiutati", () => {
  assert.ok(errori({ ...base, dipendenti: "-1" }).dipendenti);
  assert.ok(errori({ ...base, dipendenti: "1,5" }).dipendenti);
  assert.ok(errori({ ...base, dipendenti: "99999999999" }).dipendenti);
  assert.ok(errori({ ...base, fatturato: "-5", annoRiferimento: "2024" }).fatturato);
  assert.ok(errori({ ...base, fatturato: "abc", annoRiferimento: "2024" }).fatturato);
});

test("un paese fuori dall'elenco prefissato è rifiutato", () => {
  assert.ok(errori({ ...base, paesi: ["IT", "XX"] }).paesi);
});

test("in caso di errore restituisce quanto digitato", () => {
  const esito = validaCliente({ ...base, ragioneSociale: "", note: "ciao", paesi: ["XX"] }, 2026);
  assert.equal(esito.ok, false);
  if (!esito.ok) {
    assert.equal(esito.valori.note, "ciao");
    assert.deepEqual(esito.valori.paesi, ["XX"]);
  }
});
