CREATE TYPE "public"."giurisdizione" AS ENUM('ue', 'italia');--> statement-breakpoint
CREATE TYPE "public"."provenienza" AS ENUM('fonte_ufficiale', 'agente', 'persona');--> statement-breakpoint
CREATE TYPE "public"."stato" AS ENUM('proposta', 'in_discussione', 'approvato', 'in_vigore', 'modificato', 'abrogato');--> statement-breakpoint
CREATE TYPE "public"."tipo_relazione" AS ENUM('recepisce', 'modifica', 'sostituisce');--> statement-breakpoint
CREATE TABLE "atto_normativo" (
	"id" serial PRIMARY KEY NOT NULL,
	"titolo" text NOT NULL,
	"identificativo_ufficiale" text,
	"giurisdizione" "giurisdizione" NOT NULL,
	"stato" "stato" NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"url_testo" text,
	"criteri_soglie" jsonb,
	"criteri_testo" text DEFAULT '' NOT NULL,
	"criteri_confermati" boolean DEFAULT false NOT NULL,
	"tutti_i_settori" boolean DEFAULT false NOT NULL,
	"non_rilevante" boolean DEFAULT false NOT NULL,
	"provenienza_contenuti" "provenienza" DEFAULT 'persona' NOT NULL,
	"creato_il" timestamp DEFAULT now() NOT NULL,
	"aggiornato_il" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "atto_normativo_identificativo_ufficiale_unique" UNIQUE("identificativo_ufficiale")
);
--> statement-breakpoint
CREATE TABLE "atto_settore" (
	"atto_id" integer NOT NULL,
	"settore_id" integer NOT NULL,
	CONSTRAINT "atto_settore_atto_id_settore_id_pk" PRIMARY KEY("atto_id","settore_id")
);
--> statement-breakpoint
CREATE TABLE "atto_tema" (
	"atto_id" integer NOT NULL,
	"tema_id" integer NOT NULL,
	CONSTRAINT "atto_tema_atto_id_tema_id_pk" PRIMARY KEY("atto_id","tema_id")
);
--> statement-breakpoint
CREATE TABLE "cliente" (
	"id" serial PRIMARY KEY NOT NULL,
	"ragione_sociale" text NOT NULL,
	"attivita_specifica" text NOT NULL,
	"dipendenti" integer,
	"fatturato" numeric,
	"anno_riferimento" integer,
	"paesi" text[],
	"note" text,
	"creato_il" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cliente_settore" (
	"cliente_id" integer NOT NULL,
	"settore_id" integer NOT NULL,
	CONSTRAINT "cliente_settore_cliente_id_settore_id_pk" PRIMARY KEY("cliente_id","settore_id")
);
--> statement-breakpoint
CREATE TABLE "notizia" (
	"id" serial PRIMARY KEY NOT NULL,
	"titolo" text NOT NULL,
	"fonte" text NOT NULL,
	"data" date,
	"url" text NOT NULL,
	"riassunto" text DEFAULT '' NOT NULL,
	"provenienza_contenuti" "provenienza" DEFAULT 'persona' NOT NULL,
	"creato_il" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notizia_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "notizia_atto" (
	"notizia_id" integer NOT NULL,
	"atto_id" integer NOT NULL,
	CONSTRAINT "notizia_atto_notizia_id_atto_id_pk" PRIMARY KEY("notizia_id","atto_id")
);
--> statement-breakpoint
CREATE TABLE "relazione_atti" (
	"da_atto_id" integer NOT NULL,
	"a_atto_id" integer NOT NULL,
	"tipo" "tipo_relazione" NOT NULL,
	CONSTRAINT "relazione_atti_da_atto_id_a_atto_id_tipo_pk" PRIMARY KEY("da_atto_id","a_atto_id","tipo")
);
--> statement-breakpoint
CREATE TABLE "settore" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"descrizione" text DEFAULT '' NOT NULL,
	CONSTRAINT "settore_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "stato_storico" (
	"id" serial PRIMARY KEY NOT NULL,
	"atto_id" integer NOT NULL,
	"stato" "stato" NOT NULL,
	"data" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tema" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	CONSTRAINT "tema_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
ALTER TABLE "atto_settore" ADD CONSTRAINT "atto_settore_atto_id_atto_normativo_id_fk" FOREIGN KEY ("atto_id") REFERENCES "public"."atto_normativo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atto_settore" ADD CONSTRAINT "atto_settore_settore_id_settore_id_fk" FOREIGN KEY ("settore_id") REFERENCES "public"."settore"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atto_tema" ADD CONSTRAINT "atto_tema_atto_id_atto_normativo_id_fk" FOREIGN KEY ("atto_id") REFERENCES "public"."atto_normativo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atto_tema" ADD CONSTRAINT "atto_tema_tema_id_tema_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."tema"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente_settore" ADD CONSTRAINT "cliente_settore_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente_settore" ADD CONSTRAINT "cliente_settore_settore_id_settore_id_fk" FOREIGN KEY ("settore_id") REFERENCES "public"."settore"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notizia_atto" ADD CONSTRAINT "notizia_atto_notizia_id_notizia_id_fk" FOREIGN KEY ("notizia_id") REFERENCES "public"."notizia"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notizia_atto" ADD CONSTRAINT "notizia_atto_atto_id_atto_normativo_id_fk" FOREIGN KEY ("atto_id") REFERENCES "public"."atto_normativo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relazione_atti" ADD CONSTRAINT "relazione_atti_da_atto_id_atto_normativo_id_fk" FOREIGN KEY ("da_atto_id") REFERENCES "public"."atto_normativo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relazione_atti" ADD CONSTRAINT "relazione_atti_a_atto_id_atto_normativo_id_fk" FOREIGN KEY ("a_atto_id") REFERENCES "public"."atto_normativo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stato_storico" ADD CONSTRAINT "stato_storico_atto_id_atto_normativo_id_fk" FOREIGN KEY ("atto_id") REFERENCES "public"."atto_normativo"("id") ON DELETE cascade ON UPDATE no action;