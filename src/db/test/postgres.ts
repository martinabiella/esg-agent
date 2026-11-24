import type { TestContext } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

export async function postgresDiProva(t: TestContext) {
  const postgres = new PGlite();
  t.after(() => postgres.close());
  await migrate(drizzle(postgres), { migrationsFolder: "drizzle" });

  const url = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
  const { db } = await import("../index").finally(() => {
    if (url === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = url;
  });
  // Esegue le query di produzione in una transazione Postgres in memoria.
  t.mock.method(db, "batch", (query: readonly { toSQL(): { sql: string; params: unknown[] } }[]) =>
    postgres.transaction(async (tx) => {
      const risultati = [];
      for (const istruzione of query) {
        const { sql, params } = istruzione.toSQL();
        risultati.push((await tx.query(sql, params)).rows);
      }
      return risultati;
    }),
  );
  return postgres;
}
