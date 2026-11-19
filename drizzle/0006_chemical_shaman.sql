ALTER TABLE "fonte" DROP CONSTRAINT "fonte_url_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "fonte_url_chiave_idx" ON "fonte" USING btree (lower(rtrim("url", '/')));--> statement-breakpoint
CREATE UNIQUE INDEX "fonte_nome_lower_idx" ON "fonte" USING btree (lower("nome"));