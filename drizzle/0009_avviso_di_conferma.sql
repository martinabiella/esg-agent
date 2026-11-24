-- Le colonne possono essere già presenti se è stata applicata la prima migrazione dell'Avviso.
ALTER TABLE "notizia" ADD COLUMN IF NOT EXISTS "controllata_il" timestamp;--> statement-breakpoint
ALTER TABLE "notizia_atto" ADD COLUMN IF NOT EXISTS "controllata_il" timestamp;
