import { test } from "node:test";
import assert from "node:assert/strict";
import { chiaveNome, chiaveUrl, fonteIdDaParams, controlloFonte, validaFonte } from "./fonte";

test("fonteIdDaParams: legge un id Fonte valido dalla query string", () => {
  assert.equal(fonteIdDaParams({ fonte: "3" }), 3);
});

test("fonteIdDaParams: ignora id non validi o parametri ripetuti", () => {
  for (const valore of ["abc", "0", "-1", "1.5", "2147483648", ""]) {
    assert.equal(fonteIdDaParams({ fonte: valore }), null, valore);
  }
  assert.equal(fonteIdDaParams({ fonte: ["1", "2"] }), null);
  assert.equal(fonteIdDaParams({}), null);
});

const base = { nome: "EUR-Lex", url: "https://eur-lex.europa.eu/", tipo: "ufficiale" };

test("validaFonte: una Fonte valida è accettata, con spazi ai bordi tolti", () => {
  assert.deepEqual(
    validaFonte({ nome: "  EUR-Lex ", url: " https://eur-lex.europa.eu/ ", tipo: "ufficiale" }),
    { ok: true, valori: { nome: "EUR-Lex", url: "https://eur-lex.europa.eu/", tipo: "ufficiale" } },
  );
});

test("validaFonte: nome e URL obbligatori, e l'errore conserva quanto digitato", () => {
  const esito = validaFonte({ nome: "  ", url: "", tipo: "editoriale" });
  assert.deepEqual(esito, {
    ok: false,
    errori: { nome: "Il nome è obbligatorio.", url: "L'URL è obbligatorio." },
    valori: { nome: "  ", url: "", tipo: "editoriale" },
  });
});

test("validaFonte: l'URL deve essere http o https valido", () => {
  for (const url of [
    "eur-lex.europa.eu",
    "ftp://eur-lex.europa.eu",
    "javascript:alert(1)",
    "https://",
    "https://eur lex.eu",
    "https:eur-lex.europa.eu",
    "https:/eur-lex.europa.eu",
    "https:///eur-lex.europa.eu",
    "https://\\eur-lex.europa.eu",
  ]) {
    const esito = validaFonte({ ...base, url });
    assert.equal(esito.ok, false, url);
    if (!esito.ok) {
      assert.equal(esito.errori.url, "Indica un URL valido che inizi con http:// o https://.", url);
    }
  }
  assert.equal(validaFonte({ ...base, url: "http://www.senato.it" }).ok, true);
  assert.equal(validaFonte({ ...base, url: "HTTPS://eur-lex.europa.eu/Feed" }).ok, true);
});

test("validaFonte: il tipo è obbligatorio, ufficiale o editoriale", () => {
  for (const tipo of ["", undefined, "Ufficiale", "blog"]) {
    const esito = validaFonte({ ...base, tipo });
    assert.equal(esito.ok, false, String(tipo));
    if (!esito.ok) assert.equal(esito.errori.tipo, "Scegli se la Fonte è ufficiale o editoriale.");
  }
  const editoriale = validaFonte({ ...base, tipo: "editoriale" });
  assert.ok(editoriale.ok && editoriale.valori.tipo === "editoriale");
});

test("chiaveUrl: due URL che differiscono solo per maiuscole o barra finale sono la stessa Fonte", () => {
  for (const url of ["https://eur-lex.europa.eu", "https://eur-lex.europa.eu/", "HTTPS://EUR-Lex.europa.eu//"]) {
    assert.equal(chiaveUrl(url), "https://eur-lex.europa.eu", url);
  }
  assert.equal(chiaveUrl("https://www.Camera.it/leg19/"), "https://www.camera.it/leg19");
});

test("chiaveUrl: URL diversi restano diversi", () => {
  assert.notEqual(chiaveUrl("https://www.camera.it"), chiaveUrl("https://www.senato.it"));
  assert.notEqual(chiaveUrl("https://www.camera.it/leg19"), chiaveUrl("https://www.camera.it"));
});

test("chiaveNome: due nomi che differiscono solo per maiuscole sono la stessa Fonte", () => {
  assert.equal(chiaveNome("EUR-Lex"), "eur-lex");
  assert.equal(chiaveNome("eur-lex"), chiaveNome("EUR-LEX"));
  assert.notEqual(chiaveNome("Camera dei deputati"), chiaveNome("Senato della Repubblica"));
});

const URL_MODIFICATO_IL = new Date("2026-11-01T09:00:00Z");

test("controlloFonte: senza Ricerche la Fonte è mai controllata", () => {
  assert.deepEqual(controlloFonte(URL_MODIFICATO_IL, null), { esito: "mai_controllata" });
});

test("controlloFonte: se l'ultima Ricerca è completata, la Fonte è controllata in quella data", () => {
  const data = new Date("2026-11-16T03:00:00Z");
  assert.deepEqual(
    controlloFonte(URL_MODIFICATO_IL, { esito: "completata", avviataIl: data, errore: null }),
    { esito: "controllata", data },
  );
});

test("controlloFonte: se l'ultima Ricerca è fallita, la Fonte non è leggibile, con motivo e data", () => {
  const data = new Date("2026-11-16T03:00:00Z");
  assert.deepEqual(
    controlloFonte(URL_MODIFICATO_IL, { esito: "fallita", avviataIl: data, errore: "Pagina non raggiungibile (404)" }),
    { esito: "non_leggibile", data, motivo: "Pagina non raggiungibile (404)" },
  );
  assert.deepEqual(
    controlloFonte(URL_MODIFICATO_IL, { esito: "fallita", avviataIl: data, errore: null }),
    { esito: "non_leggibile", data, motivo: null },
  );
});

test("controlloFonte: una Ricerca saltata per tetto non rende la Fonte non leggibile", () => {
  const data = new Date("2026-11-16T03:00:00Z");
  assert.deepEqual(
    controlloFonte(URL_MODIFICATO_IL, { esito: "saltata_per_tetto", avviataIl: data, errore: null }),
    { esito: "saltata_per_tetto", data },
  );
});

test("controlloFonte: dopo un cambio di URL le Ricerche precedenti non contano", () => {
  const prima = new Date("2026-10-26T03:00:00Z");
  for (const esito of ["completata", "fallita", "saltata_per_tetto"] as const) {
    assert.deepEqual(
      controlloFonte(URL_MODIFICATO_IL, { esito, avviataIl: prima, errore: null }),
      { esito: "mai_controllata" },
      esito,
    );
  }
  // Avviata nello stesso istante del cambio: conta, come in ultimaRicercaRiuscita.
  assert.deepEqual(
    controlloFonte(URL_MODIFICATO_IL, { esito: "completata", avviataIl: URL_MODIFICATO_IL, errore: null }),
    { esito: "controllata", data: URL_MODIFICATO_IL },
  );
});
