-- Compatibile con i database che hanno già la prima migrazione dello storico.
ALTER TABLE "stato_storico" ADD COLUMN IF NOT EXISTS "provenienza" "provenienza" DEFAULT 'persona' NOT NULL;--> statement-breakpoint
ALTER TABLE "stato_storico" ADD COLUMN IF NOT EXISTS "visto_il" timestamp;--> statement-breakpoint
DROP INDEX IF EXISTS "stato_storico_atto_stato_data_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stato_storico_agente_atto_stato_data_idx" ON "stato_storico" USING btree ("atto_id","stato","data") WHERE "stato_storico"."provenienza" = 'agente';
