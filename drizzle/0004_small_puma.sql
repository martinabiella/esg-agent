CREATE TYPE "public"."esito_override" AS ENUM('applicabile', 'non_applicabile');--> statement-breakpoint
CREATE TABLE "override_applicabilita" (
	"cliente_id" integer NOT NULL,
	"atto_id" integer NOT NULL,
	"esito" "esito_override" NOT NULL,
	"motivazione" text NOT NULL,
	"autore" text NOT NULL,
	"creato_il" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "override_applicabilita_cliente_id_atto_id_pk" PRIMARY KEY("cliente_id","atto_id")
);
--> statement-breakpoint
ALTER TABLE "atto_normativo" ADD COLUMN "recepimento_entro" date;--> statement-breakpoint
ALTER TABLE "override_applicabilita" ADD CONSTRAINT "override_applicabilita_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "override_applicabilita" ADD CONSTRAINT "override_applicabilita_atto_id_atto_normativo_id_fk" FOREIGN KEY ("atto_id") REFERENCES "public"."atto_normativo"("id") ON DELETE cascade ON UPDATE no action;