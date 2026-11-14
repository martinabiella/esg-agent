import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { settore } from "./schema";

export async function elencoSettori() {
  return db.select().from(settore).orderBy(asc(settore.nome));
}

export async function trovaSettore(id: number) {
  const [riga] = await db.select().from(settore).where(eq(settore.id, id));
  return riga ?? null;
}
