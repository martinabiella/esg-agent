ALTER TABLE "stato_storico" ADD COLUMN "provenienza" "provenienza" DEFAULT 'persona' NOT NULL;--> statement-breakpoint
ALTER TABLE "stato_storico" ADD COLUMN "visto_il" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "stato_storico_atto_stato_data_idx" ON "stato_storico" USING btree ("atto_id","stato","data");