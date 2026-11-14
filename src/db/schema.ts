import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Vocabolario: vedi GLOSSARY.md

export const giurisdizione = pgEnum("giurisdizione", ["ue", "italia"]);

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

export const settore = pgTable("settore", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(),
  descrizione: text("descrizione").notNull().default(""),
});

export const tema = pgTable("tema", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(),
});

export const attoNormativo = pgTable("atto_normativo", {
  id: serial("id").primaryKey(),
  titolo: text("titolo").notNull(),
  // CELEX, numero COM, numero D.Lgs./DDL: quando esiste
  identificativoUfficiale: text("identificativo_ufficiale").unique(),
  giurisdizione: giurisdizione("giurisdizione").notNull(),
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
  provenienzaContenuti: provenienza("provenienza_contenuti")
    .notNull()
    .default("persona"),
  creatoIl: timestamp("creato_il").notNull().defaultNow(),
  aggiornatoIl: timestamp("aggiornato_il").notNull().defaultNow(),
});

export const statoStorico = pgTable("stato_storico", {
  id: serial("id").primaryKey(),
  attoId: integer("atto_id")
    .notNull()
    .references(() => attoNormativo.id, { onDelete: "cascade" }),
  stato: stato("stato").notNull(),
  data: date("data").notNull(),
});

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

export const notizia = pgTable("notizia", {
  id: serial("id").primaryKey(),
  titolo: text("titolo").notNull(),
  fonte: text("fonte").notNull(),
  data: date("data"),
  url: text("url").notNull().unique(),
  riassunto: text("riassunto").notNull().default(""),
  provenienzaContenuti: provenienza("provenienza_contenuti")
    .notNull()
    .default("persona"),
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
  },
  (t) => [primaryKey({ columns: [t.notiziaId, t.attoId] })],
);
