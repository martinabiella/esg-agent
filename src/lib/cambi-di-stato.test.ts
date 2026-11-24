import { test } from "node:test";
import assert from "node:assert/strict";
import type { AttoCatalogo } from "./atto-citato";
import { type StatoAtto, decidiCambiDiStato } from "./cambi-di-stato";
import type { CambioDiStato } from "./output-ricerca";

const CSRD: AttoCatalogo = {
  id: 1,
  titolo: "Direttiva CSRD",
  identificativoUfficiale: "32022L2464",
  giurisdizione: "ue",
  nonRilevante: false,
};
const statoCsrd: StatoAtto = { attoId: 1, stato: "in_vigore", ultimaDataStato: "2025-06-01" };

const cambio = (c: Partial<CambioDiStato> = {}): CambioDiStato => ({
  identificativoUfficiale: "32022L2464",
  stato: "modificato",
  data: "2026-03-10",
  ...c,
});

test("Fonte ufficiale: un nuovo Stato con data più recente di un Atto del catalogo si applica", () => {
  const { daApplicare, ignorati } = decidiCambiDiStato([cambio()], [CSRD], [statoCsrd], "ufficiale");
  assert.deepEqual(daApplicare, [{ attoId: 1, stato: "modificato", data: "2026-03-10" }]);
  assert.deepEqual(ignorati, []);
});

test("Fonte editoriale: nessun cambio si applica", () => {
  const { daApplicare, ignorati } = decidiCambiDiStato([cambio()], [CSRD], [statoCsrd], "editoriale");
  assert.deepEqual(daApplicare, []);
  assert.equal(ignorati.length, 1);
});

test("Atto Non rilevante, abrogato, assente o ambiguo: il cambio si ignora", () => {
  const nonRilevante = { ...CSRD, nonRilevante: true };
  assert.equal(decidiCambiDiStato([cambio()], [nonRilevante], [statoCsrd], "ufficiale").daApplicare.length, 0);
  const abrogato = { ...statoCsrd, stato: "abrogato" as const };
  assert.equal(decidiCambiDiStato([cambio({ stato: "in_vigore" })], [CSRD], [abrogato], "ufficiale").daApplicare.length, 0);
  assert.equal(decidiCambiDiStato([cambio({ identificativoUfficiale: "32024R1689" })], [CSRD], [statoCsrd], "ufficiale").daApplicare.length, 0);
  const doppio = [CSRD, { ...CSRD, id: 2, identificativoUfficiale: "32022l2464" }];
  const stati = [statoCsrd, { ...statoCsrd, attoId: 2 }];
  assert.equal(decidiCambiDiStato([cambio()], doppio, stati, "ufficiale").daApplicare.length, 0);
});

test("stesso Stato, o data non successiva all'ultima dello storico: ignorato; un ritorno più recente vale", () => {
  const applica = (c: Partial<CambioDiStato>) => decidiCambiDiStato([cambio(c)], [CSRD], [statoCsrd], "ufficiale").daApplicare;
  assert.deepEqual(applica({ stato: "in_vigore" }), []);
  assert.deepEqual(applica({ stato: "approvato", data: "2025-03-01" }), []);
  assert.deepEqual(applica({ stato: "approvato", data: "2025-06-01" }), []);
  assert.deepEqual(applica({ stato: "proposta", data: "2026-01-01" }), [{ attoId: 1, stato: "proposta", data: "2026-01-01" }]);
});

test("Atto senza storico (creato dall'agente): qualsiasi data vale", () => {
  const senzaStorico = { ...statoCsrd, ultimaDataStato: null };
  const { daApplicare } = decidiCambiDiStato([cambio({ data: "2020-01-01" })], [CSRD], [senzaStorico], "ufficiale");
  assert.equal(daApplicare.length, 1);
});

test("più cambi dello stesso Atto: si applicano in ordine di data, ciascuno sul precedente", () => {
  const { daApplicare, ignorati } = decidiCambiDiStato(
    [cambio({ stato: "abrogato", data: "2026-06-01" }), cambio({ stato: "modificato", data: "2026-03-10" }), cambio({ stato: "modificato", data: "2026-04-01" })],
    [CSRD],
    [statoCsrd],
    "ufficiale",
  );
  assert.deepEqual(daApplicare.map((c) => c.stato), ["modificato", "abrogato"]);
  assert.equal(ignorati.length, 1);
});

test("il cambio si riconosce anche con maiuscole e spazi diversi nell'identificativo", () => {
  const { daApplicare } = decidiCambiDiStato([cambio({ identificativoUfficiale: " 32022 l2464" })], [CSRD], [statoCsrd], "ufficiale");
  assert.equal(daApplicare.length, 1);
});
