ALTER TABLE "tema" DROP CONSTRAINT "tema_nome_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "tema_nome_lower_idx" ON "tema" USING btree (lower("nome"));