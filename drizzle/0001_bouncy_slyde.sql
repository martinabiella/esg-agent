CREATE TYPE "public"."tipo_atto" AS ENUM('regolamento', 'direttiva', 'decisione', 'legge', 'decreto_legislativo', 'decreto', 'disegno_di_legge', 'altro');--> statement-breakpoint
-- Gli Atti già presenti prendono "altro"; poi il default viene tolto, così un Atto nuovo non può essere salvato senza Tipo.
ALTER TABLE "atto_normativo" ADD COLUMN "tipo" "tipo_atto" NOT NULL DEFAULT 'altro';--> statement-breakpoint
ALTER TABLE "atto_normativo" ALTER COLUMN "tipo" DROP DEFAULT;
