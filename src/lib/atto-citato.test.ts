import { test } from "node:test";
import assert from "node:assert/strict";
import { type AttoCatalogo, trovaAttoCitato } from "./atto-citato";

const CSRD: AttoCatalogo = {
  id: 1,
  titolo: "Direttiva (UE) 2022/2464 – rendicontazione societaria di sostenibilità (CSRD)",
  identificativoUfficiale: "32022L2464",
  giurisdizione: "ue",
  nonRilevante: false,
};
const DLGS_125: AttoCatalogo = {
  id: 2,
  titolo: "Decreto legislativo 6 settembre 2024, n. 125",
  identificativoUfficiale: "D.Lgs. 125/2024",
  giurisdizione: "italia",
  nonRilevante: false,
};
const CATALOGO = [CSRD, DLGS_125];

test("trovaAttoCitato: collega per identificativo ufficiale, senza badare a maiuscole e spazi", () => {
  assert.deepEqual(
    trovaAttoCitato({ identificativoUfficiale: " 32022l2464 ", titolo: "CSRD", giurisdizione: null }, CATALOGO),
    { esito: "collegato", attoId: 1 },
  );
  assert.deepEqual(
    trovaAttoCitato({ identificativoUfficiale: "d.lgs.125/2024", titolo: "Decreto CSRD", giurisdizione: "italia" }, CATALOGO),
    { esito: "collegato", attoId: 2 },
  );
});

test("trovaAttoCitato: senza identificativo collega per titolo normalizzato e Giurisdizione", () => {
  assert.deepEqual(
    trovaAttoCitato(
      {
        identificativoUfficiale: null,
        titolo: "  DIRETTIVA (UE) 2022/2464 - Rendicontazione societaria di sostenibilita  (csrd) ",
        giurisdizione: "ue",
      },
      CATALOGO,
    ),
    { esito: "collegato", attoId: 1 },
  );
});

test("trovaAttoCitato: il titolo da solo non basta, serve la stessa Giurisdizione", () => {
  const titolo = "Decreto legislativo 6 settembre 2024, n. 125";
  assert.deepEqual(
    trovaAttoCitato({ identificativoUfficiale: null, titolo, giurisdizione: null }, CATALOGO),
    { esito: "assente" },
  );
  assert.deepEqual(
    trovaAttoCitato({ identificativoUfficiale: null, titolo, giurisdizione: "ue" }, CATALOGO),
    { esito: "assente" },
  );
});

test("trovaAttoCitato: due Atti con lo stesso titolo e Giurisdizione sono ambigui", () => {
  const omonimi: AttoCatalogo[] = [
    { id: 10, titolo: "Decreto CAM edilizia", identificativoUfficiale: null, giurisdizione: "italia", nonRilevante: false },
    { id: 11, titolo: "Decreto C.A.M. Edilizia", identificativoUfficiale: null, giurisdizione: "italia", nonRilevante: false },
  ];
  assert.deepEqual(
    trovaAttoCitato({ identificativoUfficiale: null, titolo: "decreto cam edilizia", giurisdizione: "italia" }, omonimi),
    { esito: "ambiguo" },
  );
});

test("trovaAttoCitato: un Atto Non rilevante è riconosciuto ma non collegato", () => {
  const escluso = { ...DLGS_125, nonRilevante: true };
  assert.deepEqual(
    trovaAttoCitato({ identificativoUfficiale: "D.Lgs. 125/2024", titolo: "", giurisdizione: null }, [escluso]),
    { esito: "non_rilevante", attoId: 2 },
  );
});

test("trovaAttoCitato: con un identificativo sconosciuto il titolo vale solo per Atti senza identificativo", () => {
  const citato = {
    identificativoUfficiale: "32024L1760",
    titolo: CSRD.titolo,
    giurisdizione: "ue" as const,
  };
  assert.deepEqual(trovaAttoCitato(citato, CATALOGO), { esito: "assente" });
  const senzaIdentificativo = { ...CSRD, identificativoUfficiale: null };
  assert.deepEqual(trovaAttoCitato(citato, [senzaIdentificativo]), { esito: "collegato", attoId: 1 });
});

test("trovaAttoCitato: titolo vuoto o di sola punteggiatura non riconosce nulla", () => {
  const vuoto = { ...CSRD, id: 3, titolo: "—" };
  assert.deepEqual(
    trovaAttoCitato({ identificativoUfficiale: null, titolo: " – ", giurisdizione: "ue" }, [vuoto]),
    { esito: "assente" },
  );
});
