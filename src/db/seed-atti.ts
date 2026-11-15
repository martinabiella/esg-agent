import { config } from "dotenv";

config({ path: ".env.local" });

// Dati di ESEMPIO per provare le pagine Normative: non sono normativa reale
// verificata. Idempotente: gli Atti si riconoscono dall'identificativo.
// Richiede i Settori già inseriti (npm run db:seed).

type Stato = "proposta" | "in_discussione" | "approvato" | "in_vigore" | "modificato" | "abrogato";

const ATTI: {
  identificativo: string;
  titolo: string;
  giurisdizione: "ue" | "italia";
  tipo: "regolamento" | "direttiva" | "decisione" | "legge" | "decreto_legislativo" | "decreto" | "disegno_di_legge" | "altro";
  stato: Stato;
  summary: string;
  urlTesto?: string;
  criteriSoglie?: unknown;
  criteriTesto?: string;
  criteriConfermati?: boolean;
  tuttiISettori?: boolean;
  nonRilevante?: boolean;
  provenienza: "fonte_ufficiale" | "agente" | "persona";
  settori: string[];
  temi: string[];
  storico: [Stato, string][];
}[] = [
  {
    identificativo: "ESEMPIO-CSRD",
    titolo: "[Esempio] Direttiva sulla rendicontazione di sostenibilità (CSRD)",
    giurisdizione: "ue", tipo: "direttiva", stato: "in_vigore",
    summary: "Estende l'obbligo di rendicontazione di sostenibilità a un numero più ampio di imprese.",
    urlTesto: "https://eur-lex.europa.eu/",
    criteriSoglie: { dipendenti_min: 250, fatturato_min: 50000000 },
    criteriTesto: "Si applica anche a società quotate non micro.",
    criteriConfermati: true, tuttiISettori: true, provenienza: "fonte_ufficiale",
    settori: [], temi: ["Rendicontazione"],
    storico: [["proposta", "2021-04-21"], ["approvato", "2022-11-28"], ["in_vigore", "2023-01-05"]],
  },
  {
    identificativo: "ESEMPIO-CBAM",
    titolo: "[Esempio] Regolamento sul meccanismo di adeguamento del carbonio alle frontiere",
    giurisdizione: "ue", tipo: "regolamento", stato: "modificato",
    summary: "Prezzo del carbonio sulle importazioni di alcuni beni ad alta intensità emissiva.",
    criteriSoglie: [{ campo: "importazioni", min_tonnellate: 50 }],
    criteriConfermati: false, provenienza: "agente",
    settori: ["Metallurgia e siderurgia", "Cemento e materiali da costruzione", "Chimica"],
    temi: ["Clima"],
    storico: [["in_vigore", "2023-05-16"], ["modificato", "2025-02-26"]],
  },
  {
    identificativo: "ESEMPIO-OMNIBUS",
    titolo: "[Esempio] Proposta di semplificazione degli obblighi di sostenibilità",
    giurisdizione: "ue", tipo: "regolamento", stato: "proposta",
    summary: "Propone di ridurre la platea e gli obblighi di rendicontazione.",
    criteriConfermati: false, tuttiISettori: true, provenienza: "agente",
    settori: [], temi: ["Rendicontazione"],
    storico: [["proposta", "2025-02-26"]],
  },
  {
    identificativo: "ESEMPIO-DUE-DILIGENCE",
    titolo: "[Esempio] Direttiva sul dovere di diligenza delle imprese",
    giurisdizione: "ue", tipo: "direttiva", stato: "in_discussione",
    summary: "Obbliga le grandi imprese a gestire gli impatti negativi nella catena del valore.",
    criteriTesto: "Soglie in revisione.",
    criteriConfermati: false, provenienza: "agente",
    settori: ["Tessile e moda", "Agroalimentare", "Elettronica e tecnologia"],
    temi: ["Catena del valore", "Diritti umani"],
    storico: [["proposta", "2022-02-23"], ["in_discussione", "2024-05-24"]],
  },
  {
    identificativo: "ESEMPIO-DLGS-RECEPIMENTO",
    titolo: "[Esempio] Decreto legislativo di recepimento sulla rendicontazione",
    giurisdizione: "italia", tipo: "decreto_legislativo", stato: "approvato",
    summary: "Recepisce nell'ordinamento italiano la direttiva sulla rendicontazione di sostenibilità.",
    criteriTesto: "Criteri allineati alla direttiva.",
    criteriConfermati: true, tuttiISettori: true, provenienza: "persona",
    settori: [], temi: ["Rendicontazione"],
    storico: [["in_discussione", "2024-07-30"], ["approvato", "2024-09-06"]],
  },
  {
    identificativo: "ESEMPIO-ABROGATO",
    titolo: "[Esempio] Decreto sull'efficienza energetica (abrogato)",
    giurisdizione: "italia", tipo: "decreto", stato: "abrogato",
    summary: "Atto di esempio ormai sostituito da una disciplina successiva.",
    criteriConfermati: true, provenienza: "fonte_ufficiale",
    settori: ["Energia e utilities"], temi: ["Energia"],
    storico: [["in_vigore", "2014-07-18"], ["abrogato", "2021-12-01"]],
  },
  {
    identificativo: "ESEMPIO-NON-RILEVANTE",
    titolo: "[Esempio] Atto segnato come non rilevante",
    giurisdizione: "ue", tipo: "decisione", stato: "in_vigore",
    summary: "Atto di esempio escluso dalle viste normali.",
    nonRilevante: true, provenienza: "persona",
    settori: ["Turismo e ospitalità"], temi: [],
    storico: [],
  },
];

const NOTIZIE = [
  { titolo: "[Esempio] La Commissione presenta il pacchetto di semplificazione", fonte: "Fonte di esempio", data: "2025-02-26", url: "https://example.com/esempio-omnibus", atti: ["ESEMPIO-OMNIBUS", "ESEMPIO-CSRD"] },
  { titolo: "[Esempio] Prorogati i termini per il CBAM", fonte: "Fonte di esempio", data: null, url: "https://example.com/esempio-cbam", atti: ["ESEMPIO-CBAM"] },
];

async function main() {
  // Import dinamico: dotenv deve caricare DATABASE_URL prima del modulo db.
  const { db } = await import("./index");
  const s = await import("./schema");
  const { inArray } = await import("drizzle-orm");

  const nomiTemi = [...new Set(ATTI.flatMap((a) => a.temi))];
  await db.insert(s.tema).values(nomiTemi.map((nome) => ({ nome }))).onConflictDoNothing({ target: s.tema.nome });
  const temi = await db.select().from(s.tema).where(inArray(s.tema.nome, nomiTemi));
  const settori = await db.select().from(s.settore);

  let inseriti = 0;
  for (const a of ATTI) {
    const [riga] = await db
      .insert(s.attoNormativo)
      .values({
        identificativoUfficiale: a.identificativo, titolo: a.titolo, giurisdizione: a.giurisdizione,
        tipo: a.tipo, stato: a.stato, summary: a.summary, urlTesto: a.urlTesto ?? null,
        criteriSoglie: a.criteriSoglie ?? null, criteriTesto: a.criteriTesto ?? "",
        criteriConfermati: a.criteriConfermati ?? false, tuttiISettori: a.tuttiISettori ?? false,
        nonRilevante: a.nonRilevante ?? false, provenienzaContenuti: a.provenienza,
      })
      .onConflictDoNothing({ target: s.attoNormativo.identificativoUfficiale })
      .returning({ id: s.attoNormativo.id });
    if (!riga) continue; // già presente
    inseriti++;
    const idSettori = a.settori.map((n) => {
      const trovato = settori.find((x) => x.nome === n);
      if (!trovato) console.warn(`Settore "${n}" non trovato (esegui prima npm run db:seed): collegamento saltato per "${a.titolo}"`);
      return trovato?.id;
    }).filter((x): x is number => x !== undefined);
    if (idSettori.length) await db.insert(s.attoSettore).values(idSettori.map((settoreId) => ({ attoId: riga.id, settoreId })));
    const idTemi = a.temi.map((n) => temi.find((x) => x.nome === n)!.id);
    if (idTemi.length) await db.insert(s.attoTema).values(idTemi.map((temaId) => ({ attoId: riga.id, temaId })));
    if (a.storico.length) await db.insert(s.statoStorico).values(a.storico.map(([stato, data]) => ({ attoId: riga.id, stato, data })));
  }

  const atti = await db.select({ id: s.attoNormativo.id, ident: s.attoNormativo.identificativoUfficiale }).from(s.attoNormativo);
  for (const n of NOTIZIE) {
    const [riga] = await db
      .insert(s.notizia)
      .values({ titolo: n.titolo, fonte: n.fonte, data: n.data, url: n.url })
      .onConflictDoNothing({ target: s.notizia.url })
      .returning({ id: s.notizia.id });
    if (!riga) continue;
    const ids = n.atti.map((i) => atti.find((x) => x.ident === i)?.id).filter((x): x is number => x !== undefined);
    if (ids.length) await db.insert(s.notiziaAtto).values(ids.map((attoId) => ({ notiziaId: riga.id, attoId })));
  }
  console.log(`Atti di esempio inseriti: ${inseriti} su ${ATTI.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((errore) => {
    console.error(errore);
    process.exit(1);
  });
