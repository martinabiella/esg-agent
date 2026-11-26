import { test } from "node:test";
import assert from "node:assert/strict";
import { type AttoCatalogo, chiaveIdentificativo, trovaAttoCitato } from "./atto-citato";

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

test("chiaveIdentificativo ignora i prefissi italiani (D.L., D.Lgs., L., D.P.R.) e le varianti final/definitivo", () => {
  assert.equal(chiaveIdentificativo("D.L. 177/2026"), chiaveIdentificativo("177/2026"));
  assert.equal(chiaveIdentificativo("DL 177/2026"), chiaveIdentificativo("d.l. 177/2026"));
  assert.equal(chiaveIdentificativo("D.Lgs. 125/2024"), chiaveIdentificativo("125/2024"));
  assert.equal(chiaveIdentificativo("D.P.R. 1/2020"), chiaveIdentificativo("1/2020"));
  assert.equal(chiaveIdentificativo("L. 10/2020"), chiaveIdentificativo("10/2020"));
  assert.equal(chiaveIdentificativo("COM(2026) 590 definitivo"), chiaveIdentificativo("COM(2026) 590 final"));
  assert.equal(chiaveIdentificativo("COM(2026) 590 def."), chiaveIdentificativo("COM(2026) 590"));
});

test("chiaveIdentificativo tiene distinti Atti diversi: Camera e Senato, Direttiva e Regolamento UE", () => {
  assert.notEqual(chiaveIdentificativo("A.C. 3133/2026"), chiaveIdentificativo("A.S. 3133/2026"));
  assert.notEqual(chiaveIdentificativo("A.C. 3133/2026"), chiaveIdentificativo("3133/2026"));
  assert.notEqual(chiaveIdentificativo("Direttiva (UE) 2022/2464"), chiaveIdentificativo("Regolamento (UE) 2022/2464"));
});

test("trovaAttoCitato riconosce lo stesso decreto-legge e la stessa proposta con identificativi scritti diversi", () => {
  const atti: AttoCatalogo[] = [
    { id: 71, titolo: "DL 177", identificativoUfficiale: "177/2026", giurisdizione: "italia", nonRilevante: false },
    { id: 81, titolo: "Proposta", identificativoUfficiale: "COM(2026) 590 final", giurisdizione: "ue", nonRilevante: false },
  ];
  assert.deepEqual(
    trovaAttoCitato({ identificativoUfficiale: "D.L. 177/2026", titolo: "Altro titolo", giurisdizione: "italia" }, atti),
    { esito: "collegato", attoId: 71 },
  );
  assert.deepEqual(
    trovaAttoCitato({ identificativoUfficiale: "COM(2026) 590 definitivo", titolo: "Altro", giurisdizione: "ue" }, atti),
    { esito: "collegato", attoId: 81 },
  );
});
