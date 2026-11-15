import { asc, count, eq } from "drizzle-orm";
import { db } from "./index";
import { attoSettore, clienteSettore, settore } from "./schema";

export async function elencoSettori() {
  return db.select().from(settore).orderBy(asc(settore.nome));
}

export async function trovaSettore(id: number) {
  const [riga] = await db.select().from(settore).where(eq(settore.id, id));
  return riga ?? null;
}

// Codici Postgres: violazione di unicità / di chiave esterna.
function codiceErrore(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
}

export type EsitoScrittura =
  | { ok: true; id: number }
  | { ok: false; motivo: "nome_duplicato" | "non_trovato" | "in_uso" };

export async function creaSettore(valori: { nome: string; descrizione: string }): Promise<EsitoScrittura> {
  try {
    const [riga] = await db.insert(settore).values(valori).returning({ id: settore.id });
    return { ok: true, id: riga.id };
  } catch (e) {
    if (codiceErrore(e) === "23505") return { ok: false, motivo: "nome_duplicato" };
    throw e;
  }
}

export async function aggiornaSettore(
  id: number,
  valori: { nome: string; descrizione: string },
): Promise<EsitoScrittura> {
  try {
    const righe = await db.update(settore).set(valori).where(eq(settore.id, id)).returning({ id: settore.id });
    return righe.length ? { ok: true, id } : { ok: false, motivo: "non_trovato" };
  } catch (e) {
    if (codiceErrore(e) === "23505") return { ok: false, motivo: "nome_duplicato" };
    throw e;
  }
}

// Quanti Clienti e quanti Atti (collegamento esplicito) usano il Settore.
export async function usiSettore(id: number) {
  const [[c], [a]] = await Promise.all([
    db.select({ n: count() }).from(clienteSettore).where(eq(clienteSettore.settoreId, id)),
    db.select({ n: count() }).from(attoSettore).where(eq(attoSettore.settoreId, id)),
  ]);
  return { clienti: c.n, atti: a.n };
}

export async function eliminaSettore(id: number): Promise<EsitoScrittura> {
  try {
    // La chiave esterna dei Clienti è "restrict": protegge anche da
    // un Cliente creato tra il controllo e la cancellazione.
    const righe = await db.delete(settore).where(eq(settore.id, id)).returning({ id: settore.id });
    return righe.length ? { ok: true, id } : { ok: false, motivo: "non_trovato" };
  } catch (e) {
    if (codiceErrore(e) === "23503") return { ok: false, motivo: "in_uso" };
    throw e;
  }
}
