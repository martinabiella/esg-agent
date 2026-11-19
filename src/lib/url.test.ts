import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizzaUrlNotizia } from "./url";

test("normalizzaUrlNotizia: toglie i parametri di tracking e tiene gli altri nell'ordine originale", () => {
  assert.equal(
    normalizzaUrlNotizia(
      "https://www.esempio.it/news/CSRD-Rinvio?id=42&utm_source=newsletter&utm_medium=email&fbclid=abc&pagina=2&gclid=xyz",
    ),
    "https://www.esempio.it/news/CSRD-Rinvio?id=42&pagina=2",
  );
});

test("normalizzaUrlNotizia: senza altri parametri sparisce anche il punto interrogativo", () => {
  assert.equal(
    normalizzaUrlNotizia("https://esempio.it/a?utm_campaign=x&UTM_Content=y&mc_cid=1&msclkid=2"),
    "https://esempio.it/a",
  );
});

test("normalizzaUrlNotizia: toglie il frammento e rende minuscolo solo l'host", () => {
  assert.equal(
    normalizzaUrlNotizia("  HTTPS://WWW.Esempio.IT:443/Notizie/Art-12#commenti "),
    "https://www.esempio.it/Notizie/Art-12",
  );
});

test("normalizzaUrlNotizia: non ricodifica i parametri che restano", () => {
  assert.equal(
    normalizzaUrlNotizia("https://esempio.it/cerca?q=a%20b&path=x/y&utm_source=z&vuoto="),
    "https://esempio.it/cerca?q=a%20b&path=x/y&vuoto=",
  );
});

test("normalizzaUrlNotizia: è idempotente", () => {
  const una = normalizzaUrlNotizia("https://esempio.it/a?x=1&utm_term=t#s");
  assert.equal(normalizzaUrlNotizia(una), una);
});
