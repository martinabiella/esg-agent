import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { type AnyColumn, type SQL, sql } from "drizzle-orm";
import { TIPI_ATTO } from "../lib/tipi-atto";
import { TIPI_FONTE } from "../lib/fonte";

// Vocabolario: vedi GLOSSARY.md

export const giurisdizione = pgEnum("giurisdizione", ["ue", "italia"]);

// Elenco e coerenza con la Giurisdizione: src/lib/tipi-atto.ts
export const tipoAtto = pgEnum("tipo_atto", TIPI_ATTO);

export const stato = pgEnum("stato", [
  "proposta",
  "in_discussione",
  "approvato",
  "in_vigore",
  "modificato",
  "abrogato",
]);

export const tipoRelazione = pgEnum("tipo_relazione", [
  "recepisce",
  "modifica",
  "sostituisce",
]);

export const provenienza = pgEnum("provenienza", [
  "fonte_ufficiale",
  "agente",
  "persona",
]);

export const settore = pgTable(
  "settore",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    descrizione: text("descrizione").notNull().default(""),
  },
  // Nome unico senza distinguere maiuscole e minuscole.
  (t) => [uniqueIndex("settore_nome_lower_idx").on(sql`lower(${t.nome})`)],
);

export const tema = pgTable(
  "tema",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
  },
  // Nome unico senza distinguere maiuscole e minuscole.
  (t) => [uniqueIndex("tema_nome_lower_idx").on(sql`lower(${t.nome})`)],
);

// ufficiale: fa fede per Stato e date. editoriale: solo Notizie e scoperta.
export const tipoFonte = pgEnum("tipo_fonte", TIPI_FONTE);

// URL e nome della Fonte per l'unicità: devono restare identiche a chiaveUrl e
// chiaveNome in src/lib/fonte.ts.
export const chiaveUrlFonte = (url: AnyColumn | SQL) => sql<string>`lower(rtrim(${url}, '/'))`;
export const chiaveNomeFonte = (nome: AnyColumn | SQL) => sql<string>`lower(${nome})`;

// Siti monitorati dall'agente. L'elenco lo gestiscono gli utenti: l'agente
// non aggiunge Fonti da solo.
export const fonte = pgTable(
  "fonte",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    url: text("url").notNull(),
    tipo: tipoFonte("tipo").notNull(),
    // Quando cambia l'URL la Fonte riparte da "mai controllata": contano solo
    // le Ricerche avviate dopo questa data.
    urlModificatoIl: timestamp("url_modificato_il").notNull().defaultNow(),
    creatoIl: timestamp("creato_il").notNull().defaultNow(),
  },
  // URL e nome unici senza distinguere maiuscole (e, per l'URL, la barra finale).
  (t) => [
    uniqueIndex("fonte_url_chiave_idx").on(chiaveUrlFonte(t.url)),
    uniqueIndex("fonte_nome_lower_idx").on(chiaveNomeFonte(t.nome)),
  ],
);

// Gli stessi spazi di /\s/ in chiaveIdentificativo (src/lib/atto-citato.ts).
const spaziIdentificativo = sql.raw(String.raw`U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+'`);

export const attoNormativo = pgTable("atto_normativo", {
  id: serial("id").primaryKey(),
  titolo: text("titolo").notNull(),
  // CELEX, numero COM, numero D.Lgs./DDL: quando esiste
  identificativoUfficiale: text("identificativo_ufficiale").unique(),
  giurisdizione: giurisdizione("giurisdizione").notNull(),
  tipo: tipoAtto("tipo").notNull(),
  stato: stato("stato").notNull(),
  summary: text("summary").notNull().default(""),
  urlTesto: text("url_testo"),
  // Criteri di applicabilità: soglie strutturate + testo libero
  criteriSoglie: jsonb("criteri_soglie"),
  criteriTesto: text("criteri_testo").notNull().default(""),
  criteriConfermati: boolean("criteri_confermati").notNull().default(false),
  // true = si applica a tutti i Settori
  tuttiISettori: boolean("tutti_i_settori").notNull().default(false),
  nonRilevante: boolean("non_rilevante").notNull().default(false),
  // Data entro cui gli Stati membri devono recepire (direttive UE): facoltativa
  recepimentoEntro: date("recepimento_entro"),
  provenienzaContenuti: provenienza("provenienza_contenuti")
    .notNull()
    .default("persona"),
  // Fonte da cui l'agente ha scoperto l'Atto: null per gli Atti inseriti a mano.
  fonteId: integer("fonte_id").references(() => fonte.id, { onDelete: "set null" }),
  // Ultima volta che una Fonte ufficiale ha confermato lo Stato.
  statoConfermatoIl: timestamp("stato_confermato_il"),
  creatoIl: timestamp("creato_il").notNull().defaultNow(),
  aggiornatoIl: timestamp("aggiornato_il").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("atto_normativo_identificativo_normalizzato_idx")
    .on(sql`upper(regexp_replace(${t.identificativoUfficiale}, ${spaziIdentificativo}, '', 'g'))`),
]);

export const statoStorico = pgTable(
  "stato_storico",
  {
    id: serial("id").primaryKey(),
    attoId: integer("atto_id")
      .notNull()
      .references(() => attoNormativo.id, { onDelete: "cascade" }),
    stato: stato("stato").notNull(),
    data: date("data").notNull(),
    // Chi ha registrato il cambio: «agente» per quelli rilevati da una Fonte ufficiale.
    provenienza: provenienza("provenienza").notNull().default("persona"),
    // Quando una persona ha visto il cambio dell'agente (Avviso di conferma): null = non visto.
    vistoIl: timestamp("visto_il"),
  },
  (t) => [
    uniqueIndex("stato_storico_agente_atto_stato_data_idx")
      .on(t.attoId, t.stato, t.data)
      .where(sql`${t.provenienza} = 'agente'`),
  ],
);

export const relazioneAtti = pgTable(
  "relazione_atti",
  {
    daAttoId: integer("da_atto_id")
      .notNull()
      .references(() => attoNormativo.id, { onDelete: "cascade" }),
    aAttoId: integer("a_atto_id")
      .notNull()
      .references(() => attoNormativo.id, { onDelete: "cascade" }),
    tipo: tipoRelazione("tipo").notNull(),
  },
  (t) => [primaryKey({ columns: [t.daAttoId, t.aAttoId, t.tipo] })],
);

export const attoSettore = pgTable(
  "atto_settore",
  {
    attoId: integer("atto_id")
      .notNull()
      .references(() => attoNormativo.id, { onDelete: "cascade" }),
    settoreId: integer("settore_id")
      .notNull()
      .references(() => settore.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.attoId, t.settoreId] })],
);

export const attoTema = pgTable(
  "atto_tema",
  {
    attoId: integer("atto_id")
      .notNull()
      .references(() => attoNormativo.id, { onDelete: "cascade" }),
    temaId: integer("tema_id")
      .notNull()
      .references(() => tema.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.attoId, t.temaId] })],
);

export const cliente = pgTable("cliente", {
  id: serial("id").primaryKey(),
  ragioneSociale: text("ragione_sociale").notNull(),
  attivitaSpecifica: text("attivita_specifica").notNull(),
  // Facoltativi
  dipendenti: integer("dipendenti"),
  fatturato: numeric("fatturato"),
  annoRiferimento: integer("anno_riferimento"),
  // Codici ISO 3166-1 alpha-2 (validati da src/lib/paesi.ts)
  paesi: text("paesi").array(),
  note: text("note"),
  creatoIl: timestamp("creato_il").notNull().defaultNow(),
});

export const clienteSettore = pgTable(
  "cliente_settore",
  {
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => cliente.id, { onDelete: "cascade" }),
    settoreId: integer("settore_id")
      .notNull()
      .references(() => settore.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.clienteId, t.settoreId] })],
);

export const esitoOverride = pgEnum("esito_override", ["applicabile", "non_applicabile"]);

// Decisione manuale che sostituisce l'Applicabilità calcolata: una riga per coppia Cliente–Atto.
export const overrideApplicabilita = pgTable(
  "override_applicabilita",
  {
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => cliente.id, { onDelete: "cascade" }),
    attoId: integer("atto_id")
      .notNull()
      .references(() => attoNormativo.id, { onDelete: "cascade" }),
    esito: esitoOverride("esito").notNull(),
    motivazione: text("motivazione").notNull(),
    autore: text("autore").notNull(),
    creatoIl: timestamp("creato_il").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.clienteId, t.attoId] })],
);

export const notizia = pgTable("notizia", {
  id: serial("id").primaryKey(),
  titolo: text("titolo").notNull(),
  // Chi ha pubblicato l'articolo ("Pubblicata da"), testo libero: non è una
  // Fonte monitorata dall'agente.
  fonte: text("fonte").notNull(),
  data: date("data"),
  url: text("url").notNull().unique(),
  riassunto: text("riassunto").notNull().default(""),
  provenienzaContenuti: provenienza("provenienza_contenuti")
    .notNull()
    .default("persona"),
  // Suggerisce modifiche a un Atto esistente o discute una nuova normativa.
  // Lo imposta solo l'agente.
  segnalaNovita: boolean("segnala_novita").notNull().default(false),
  // Quando una persona l'ha segnata controllata (Avviso di conferma): vale per le
  // Notizie senza Atti collegati; per le altre conta notizia_atto.controllata_il.
  controllataIl: timestamp("controllata_il"),
  creatoIl: timestamp("creato_il").notNull().defaultNow(),
});

export const notiziaAtto = pgTable(
  "notizia_atto",
  {
    notiziaId: integer("notizia_id")
      .notNull()
      .references(() => notizia.id, { onDelete: "cascade" }),
    attoId: integer("atto_id")
      .notNull()
      .references(() => attoNormativo.id, { onDelete: "cascade" }),
    // Quando una persona ha controllato l'Atto a proposito di questa Notizia: null = da controllare.
    controllataIl: timestamp("controllata_il"),
  },
  (t) => [primaryKey({ columns: [t.notiziaId, t.attoId] })],
);

// ---- Log delle Ricerche dell'agente (nessuna UI) ----

export const tipoRicerca = pgEnum("tipo_ricerca", ["per_fonte", "per_tema"]);

export const esitoRicerca = pgEnum("esito_ricerca", [
  "in_corso",
  "completata",
  "fallita",
  "saltata_per_tetto",
]);

// Una riga per Ricerca. Eliminando la Fonte o il Tema la riga resta come
// storico, senza riferimento.
export const esecuzioneRicerca = pgTable(
  "esecuzione_ricerca",
  {
    id: serial("id").primaryKey(),
    tipo: tipoRicerca("tipo").notNull(),
    fonteId: integer("fonte_id").references(() => fonte.id, { onDelete: "set null" }),
    temaId: integer("tema_id").references(() => tema.id, { onDelete: "set null" }),
    // Assente per le Ricerche saltate per tetto, che non partono su Parallel.
    parallelRunId: text("parallel_run_id").unique(),
    avviataIl: timestamp("avviata_il").notNull().defaultNow(),
    terminataIl: timestamp("terminata_il"),
    esito: esitoRicerca("esito").notNull().default("in_corso"),
    notizieCreate: integer("notizie_create").notNull().default(0),
    attiCreati: integer("atti_creati").notNull().default(0),
    errore: text("errore"),
  },
  (t) => [
    // Una Ricerca per Fonte non ha un Tema e viceversa.
    check(
      "esecuzione_ricerca_riferimento_check",
      sql`(${t.tipo} = 'per_fonte' AND ${t.temaId} IS NULL) OR (${t.tipo} = 'per_tema' AND ${t.fonteId} IS NULL)`,
    ),
    index("esecuzione_ricerca_fonte_idx").on(t.fonteId, t.avviataIl),
  ],
);
