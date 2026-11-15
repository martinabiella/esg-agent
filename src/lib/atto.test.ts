import assert from "node:assert/strict";
import test from "node:test";
import { validaAtto, validaRelazioni } from "./atto";

const base = {
  titolo: "Atto di prova",
  giurisdizione: "italia",
  tipo: "decreto",
  stato: "in_vigore",
  dataStato: "2025-01-20",
  settori: ["1"],
};

test("rifiuta Tipo di atto incoerente con la Giurisdizione", () => {
  const esito = validaAtto({ ...base, giurisdizione: "italia", tipo: "regolamento" });
  assert.equal(esito.ok, false);
  if (!esito.ok) assert.match(esito.errori.tipo ?? "", /non è un Tipo valido/);
});

test("valida Soglie e il numero minimo", () => {
  const esito = validaAtto({
    ...base,
    soglie: [{ campo: "dipendenti", minimo: "10", massimo: "10", paesi: [] }],
    minimoSoglie: "1",
  });
  assert.equal(esito.ok, false);
  if (!esito.ok) assert.match(esito.errori.soglie ?? "", /minimo deve essere minore/);
});

test("accetta la scorciatoia UE per le soglie sui paesi", () => {
  const esito = validaAtto({
    ...base,
    soglie: [{ campo: "paesi", minimo: "", massimo: "", paesi: ["UE"] }],
    minimoSoglie: "1",
  });
  assert.equal(esito.ok, true);
});

test("recepisce richiede un Atto italiano che punti a un Atto UE", () => {
  const destinazioni = new Map([[2, "italia" as const]]);
  assert.equal(
    validaRelazioni([{ tipo: "recepisce", attoId: 2 }], null, "italia", destinazioni),
    "Una Relazione recepisce richiede un Atto italiano che recepisca un Atto UE.",
  );
});

test("rifiuta relazione con se stesso e duplicati", () => {
  const destinazioni = new Map([[1, "ue" as const], [2, "ue" as const]]);
  assert.match(
    validaRelazioni([{ tipo: "modifica", attoId: 1 }], 1, "italia", destinazioni) ?? "",
    /se stesso/,
  );
  assert.match(
    validaRelazioni([
      { tipo: "modifica", attoId: 2 },
      { tipo: "modifica", attoId: 2 },
    ], 1, "italia", destinazioni) ?? "",
    /volte/,
  );
});
