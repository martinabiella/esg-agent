ALTER TABLE "settore" DROP CONSTRAINT "settore_nome_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "settore_nome_lower_idx" ON "settore" USING btree (lower("nome"));