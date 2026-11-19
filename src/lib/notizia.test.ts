import { test } from "node:test";
import assert from "node:assert/strict";
import { notiziaIdDaParams } from "./notizia";

test("legge un id Notizia valido dalla query string", () => {
  assert.equal(notiziaIdDaParams({ notizia: "7" }), 7);
});

test("ignora id Notizia non validi o parametri ripetuti", () => {
  for (const valore of ["abc", "0", "-1", "1.5", "2147483648", ""]) {
    assert.equal(notiziaIdDaParams({ notizia: valore }), null, valore);
  }
  assert.equal(notiziaIdDaParams({ notizia: ["1", "2"] }), null);
  assert.equal(notiziaIdDaParams({}), null);
});

import { validaNotizia } from "./notizia";

const OGGI = new Date("2026-06-15T12:00:00Z");
const base = { titolo: "Titolo", fonte: "Fonte", url: "https://esempio.it/a" };

test("validaNotizia: solo campi obbligatori, facoltativi assenti", () => {
  const esito = validaNotizia(base, OGGI);
  assert.deepEqual(esito, {
    ok: true,
    valori: { titolo: "Titolo", fonte: "Fonte", url: "https://esempio.it/a", data: null, riassunto: "", atti: [] },
  });
});

test("validaNotizia: titolo, fonte e URL obbligatori, con spazi tolti", () => {
  const esito = validaNotizia({ titolo: "  ", fonte: "", url: " " }, OGGI);
  assert.equal(esito.ok, false);
  if (!esito.ok) {
    assert.deepEqual(Object.keys(esito.errori).sort(), ["fonte", "titolo", "url"]);
  }
});

test("validaNotizia: l'URL deve essere http o https valido", () => {
  for (const url of ["esempio.it", "ftp://esempio.it/a", "javascript:alert(1)", "http://", "https://a b.it"]) {
    const esito = validaNotizia({ ...base, url }, OGGI);
    assert.equal(esito.ok, false, url);
    if (!esito.ok) assert.ok(esito.errori.url, url);
  }
  for (const url of ["http://esempio.it", "  https://esempio.it/a?b=1#c  "]) {
    assert.equal(validaNotizia({ ...base, url }, OGGI).ok, true, url);
  }
});

test("validaNotizia: l'URL salvato è senza spazi ai bordi", () => {
  const esito = validaNotizia({ ...base, url: "  https://esempio.it/a " }, OGGI);
  assert.ok(esito.ok && esito.valori.url === "https://esempio.it/a");
});

test("validaNotizia: l'URL salvato è normalizzato, come per le Notizie dell'agente", () => {
  const esito = validaNotizia({ ...base, url: "https://Esempio.it/Art?id=4&utm_source=nl#top" }, OGGI);
  assert.ok(esito.ok);
  assert.equal(esito.valori.url, "https://esempio.it/Art?id=4");
});

test("validaNotizia: data facoltativa, reale e plausibile", () => {
  const ok = validaNotizia({ ...base, data: "2026-06-15" }, OGGI);
  assert.ok(ok.ok && ok.valori.data === "2026-06-15");
  for (const data of ["15/06/2026", "2026-02-30", "2026-13-01", "1899-12-31", "2026-06-16", "abc"]) {
    const esito = validaNotizia({ ...base, data }, OGGI);
    assert.equal(esito.ok, false, data);
    if (!esito.ok) assert.ok(esito.errori.data, data);
  }
});

test("validaNotizia: riassunto tagliato ai bordi, vuoto resta stringa vuota", () => {
  const esito = validaNotizia({ ...base, riassunto: "  testo \n" }, OGGI);
  assert.ok(esito.ok && esito.valori.riassunto === "testo");
});

test("validaNotizia: Atti collegati senza duplicati, id non validi rifiutati", () => {
  const ok = validaNotizia({ ...base, atti: ["3", "5", "3"] }, OGGI);
  assert.ok(ok.ok && ok.valori.atti.join() === "3,5");
  const ko = validaNotizia({ ...base, atti: ["3", "x"] }, OGGI);
  assert.equal(ko.ok, false);
  if (!ko.ok) assert.ok(ko.errori.atti);
});

test("validaNotizia: in errore restituisce quanto digitato", () => {
  const esito = validaNotizia({ titolo: "", fonte: "F", url: "no", data: "2026-06-15", riassunto: "r", atti: ["2"] }, OGGI);
  assert.equal(esito.ok, false);
  if (!esito.ok) {
    assert.deepEqual(esito.valori, { titolo: "", fonte: "F", url: "no", data: "2026-06-15", riassunto: "r", atti: ["2"] });
  }
});
