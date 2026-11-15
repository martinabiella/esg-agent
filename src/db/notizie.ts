import { asc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { attoNormativo, notizia, notiziaAtto } from "./schema";

export type NotiziaElenco = Pick<
  typeof notizia.$inferSelect,
  "id" | "titolo" | "fonte" | "data"
>;

export type NotiziaConAtti = typeof notizia.$inferSelect & {
  atti: { id: number; titolo: string }[];
};

export async function elencoNotizie(): Promise<NotiziaElenco[]> {
  return db
    .select({
      id: notizia.id,
      titolo: notizia.titolo,
      fonte: notizia.fonte,
      data: notizia.data,
    })
    .from(notizia)
    .orderBy(
      sql`${notizia.data} desc nulls last`,
      asc(notizia.titolo),
      asc(notizia.id),
    );
}

export async function trovaNotizia(id: number): Promise<NotiziaConAtti | null> {
  const [riga, atti] = await Promise.all([
    db.select().from(notizia).where(eq(notizia.id, id)).then(([prima]) => prima),
    db
      .select({ id: attoNormativo.id, titolo: attoNormativo.titolo })
      .from(notiziaAtto)
      .innerJoin(attoNormativo, eq(attoNormativo.id, notiziaAtto.attoId))
      .where(eq(notiziaAtto.notiziaId, id))
      .orderBy(asc(attoNormativo.titolo), asc(attoNormativo.id)),
  ]);

  return riga ? { ...riga, atti } : null;
}
