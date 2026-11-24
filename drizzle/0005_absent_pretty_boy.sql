CREATE TYPE "public"."esito_ricerca" AS ENUM('in_corso', 'completata', 'fallita', 'saltata_per_tetto');--> statement-breakpoint
CREATE TYPE "public"."tipo_fonte" AS ENUM('ufficiale', 'editoriale');--> statement-breakpoint
CREATE TYPE "public"."tipo_ricerca" AS ENUM('per_fonte', 'per_tema');--> statement-breakpoint
CREATE TABLE "esecuzione_ricerca" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" "tipo_ricerca" NOT NULL,
	"fonte_id" integer,
	"tema_id" integer,
	"parallel_run_id" text,
	"avviata_il" timestamp DEFAULT now() NOT NULL,
	"terminata_il" timestamp,
	"esito" "esito_ricerca" DEFAULT 'in_corso' NOT NULL,
	"notizie_create" integer DEFAULT 0 NOT NULL,
	"atti_creati" integer DEFAULT 0 NOT NULL,
	"errore" text,
	CONSTRAINT "esecuzione_ricerca_parallel_run_id_unique" UNIQUE("parallel_run_id"),
	CONSTRAINT "esecuzione_ricerca_riferimento_check" CHECK (("esecuzione_ricerca"."tipo" = 'per_fonte' AND "esecuzione_ricerca"."tema_id" IS NULL) OR ("esecuzione_ricerca"."tipo" = 'per_tema' AND "esecuzione_ricerca"."fonte_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "fonte" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"url" text NOT NULL,
	"tipo" "tipo_fonte" NOT NULL,
	"url_modificato_il" timestamp DEFAULT now() NOT NULL,
	"creato_il" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fonte_url_unique" UNIQUE("url")
);
--> statement-breakpoint
ALTER TABLE "atto_normativo" ADD COLUMN "fonte_id" integer;--> statement-breakpoint
ALTER TABLE "atto_normativo" ADD COLUMN "stato_confermato_il" timestamp;--> statement-breakpoint
ALTER TABLE "notizia" ADD COLUMN "segnala_novita" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "esecuzione_ricerca" ADD CONSTRAINT "esecuzione_ricerca_fonte_id_fonte_id_fk" FOREIGN KEY ("fonte_id") REFERENCES "public"."fonte"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esecuzione_ricerca" ADD CONSTRAINT "esecuzione_ricerca_tema_id_tema_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."tema"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "esecuzione_ricerca_fonte_idx" ON "esecuzione_ricerca" USING btree ("fonte_id","avviata_il");--> statement-breakpoint
ALTER TABLE "atto_normativo" ADD CONSTRAINT "atto_normativo_fonte_id_fonte_id_fk" FOREIGN KEY ("fonte_id") REFERENCES "public"."fonte"("id") ON DELETE set null ON UPDATE no action;