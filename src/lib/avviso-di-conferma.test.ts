import { test } from "node:test";
import assert from "node:assert/strict";
import { costruisciAvviso, limiteNotizieAvviso, ordinaPerImpatto, titoloAvviso, type RigheAvviso } from "./avviso-di-conferma";

const vuote: RigheAvviso = {
  attiDaConfermare: [],
  cambiDiStato: [],
  notizieSuAtti: [],
  notizieSenzaAtto: [],
};

test("un Atto con contenuti generati, un cambio di Stato e una Notizia è una sola voce con tre motivi", () => {
  const { atti, notizie } = costruisciAvviso({
    attiDaConfermare: [{ attoId: 1, titolo: "CSDDD Omnibus", aggiornatoIl: "2026-11-01T10:00:00.000Z", senzaSettori: false }],
    cambiDiStato: [{ id: 4, attoId: 1, titolo: "CSDDD Omnibus", stato: "approvato", data: "2026-11-10" }],
    notizieSuAtti: [{ notiziaId: 7, notiziaTitolo: "Slitta l'obbligo", notiziaCreataIl: "2026-01-01T00:00:00.000Z", attoId: 1, attoTitolo: "CSDDD Omnibus" }],
    notizieSenzaAtto: [],
  });
  assert.equal(atti.length, 1);
  assert.deepEqual(atti[0], {
    attoId: 1,
    titolo: "CSDDD Omnibus",
    contenutiGenerati: true,
    senzaSettori: false,
    cambiDiStato: [{ id: 4, stato: "approvato", data: "2026-11-10" }],
    notizie: [{ id: 7, titolo: "Slitta l'obbligo" }],
    ultimoMovimento: "2026-11-10",
  });
  assert.deepEqual(notizie, []);
});

test("un Atto che compare solo per un cambio di Stato non ha contenuti generati né Notizie", () => {
  const { atti } = costruisciAvviso({
    ...vuote,
    cambiDiStato: [{ id: 5, attoId: 2, titolo: "CSRD", stato: "in_vigore", data: "2026-05-01" }],
  });
  assert.equal(atti.length, 1);
  assert.equal(atti[0].contenutiGenerati, false);
  assert.deepEqual(atti[0].notizie, []);
});

test("le Notizie senza Atto collegato sono voci a sé", () => {
  const { atti, notizie } = costruisciAvviso({
    ...vuote,
    notizieSenzaAtto: [{ id: 9, titolo: "Nuova norma in arrivo" }],
  });
  assert.deepEqual(atti, []);
  assert.deepEqual(notizie, [{ id: 9, titolo: "Nuova norma in arrivo" }]);
});

test("una Notizia collegata a due Atti compare in entrambi", () => {
  const { atti } = costruisciAvviso({
    ...vuote,
    notizieSuAtti: [
      { notiziaId: 7, notiziaTitolo: "Omnibus", notiziaCreataIl: "2026-01-01T00:00:00.000Z", attoId: 1, attoTitolo: "CSRD" },
      { notiziaId: 7, notiziaTitolo: "Omnibus", notiziaCreataIl: "2026-01-01T00:00:00.000Z", attoId: 2, attoTitolo: "CSDDD" },
    ],
  });
  assert.deepEqual(atti.map((a) => a.attoId).sort(), [1, 2]);
  assert.ok(atti.every((a) => a.notizie.length === 1 && a.notizie[0].id === 7));
});

const voceAtto = (attoId: number, ultimoMovimento = "2026-01-01") => ({
  attoId,
  titolo: `Atto ${attoId}`,
  contenutiGenerati: true,
  senzaSettori: false,
  cambiDiStato: [],
  notizie: [],
  ultimoMovimento,
});

test("ordine per impatto: prima gli applicabili, poi i da verificare (A 4 applicabili, C 6 da verificare, B 1 applicabile)", () => {
  const impatto = new Map([
    [1, { applicabili: 4, daVerificare: 0 }], // A
    [2, { applicabili: 1, daVerificare: 0 }], // B
    [3, { applicabili: 0, daVerificare: 6 }], // C
  ]);
  const ordinati = ordinaPerImpatto([voceAtto(2), voceAtto(3), voceAtto(1)], impatto);
  assert.deepEqual(ordinati.map((v) => v.attoId), [1, 2, 3]);
});

test("a parità di impatto i più recenti vengono prima; un Atto senza impatto noto vale zero", () => {
  const impatto = new Map([[1, { applicabili: 2, daVerificare: 0 }]]);
  const ordinati = ordinaPerImpatto(
    [voceAtto(5, "2026-03-01"), voceAtto(1), voceAtto(6, "2026-09-01")],
    impatto,
  );
  assert.deepEqual(ordinati.map((v) => v.attoId), [1, 6, 5]);
});

test("titolo dell'Avviso: singolare, plurale, solo una delle due parti, nulla se vuoto", () => {
  assert.equal(titoloAvviso(1, 2), "1 Atto e 2 Notizie da controllare");
  assert.equal(titoloAvviso(3, 0), "3 Atti da controllare");
  assert.equal(titoloAvviso(0, 1), "1 Notizia da controllare");
  assert.equal(titoloAvviso(2, 1), "2 Atti e 1 Notizia da controllare");
  assert.equal(titoloAvviso(0, 0), null);
});

test("un Atto in lista solo per una Notizia ha come ultimo movimento la data della Notizia", () => {
  const { atti } = costruisciAvviso({
    ...vuote,
    notizieSuAtti: [
      { notiziaId: 7, notiziaTitolo: "Omnibus", notiziaCreataIl: "2026-10-05T08:00:00.000Z", attoId: 1, attoTitolo: "CSRD" },
    ],
  });
  assert.equal(atti[0].ultimoMovimento, "2026-10-05");
});

test("una Notizia entra nell'Avviso solo se trovata negli ultimi 30 giorni", () => {
  const adesso = new Date("2026-11-24T12:00:00.000Z");
  const limite = limiteNotizieAvviso(adesso);
  assert.equal(limite.toISOString(), "2026-10-25T12:00:00.000Z");
});

test("un Atto dell'agente senza Settori compare nell'Avviso con il motivo «Settori da assegnare»", () => {
  const { atti } = costruisciAvviso({
    ...vuote,
    attiDaConfermare: [
      { attoId: 67, titolo: "Omnibus VIII", aggiornatoIl: "2026-11-25T10:00:00.000Z", senzaSettori: true },
      { attoId: 68, titolo: "CSRD", aggiornatoIl: "2026-11-25T10:00:00.000Z", senzaSettori: false },
    ],
  });
  assert.deepEqual(atti.map((a) => [a.attoId, a.senzaSettori]), [[67, true], [68, false]]);
});

test("un Atto che compare solo per un cambio di Stato non è senza Settori", () => {
  const { atti } = costruisciAvviso({
    ...vuote,
    cambiDiStato: [{ id: 5, attoId: 2, titolo: "CSRD", stato: "in_vigore", data: "2026-05-01" }],
  });
  assert.equal(atti[0].senzaSettori, false);
});
