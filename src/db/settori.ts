import { asc, count, eq } from "drizzle-orm";
import { db } from "./index";
import type { CampiSettore, UsiSettore } from "@/lib/settore";
import { attoSettore, clienteSettore, settore } from "./schema";

export async function elencoSettori() {
  return db.select().from(settore).orderBy(asc(settore.nome));
}

export async function trovaSettore(id: number) {
  const [riga] = await db.select().from(settore).where(eq(settore.id, id));
  return riga ?? null;
}

const VIOLAZIONE_UNICITA = "23505";
const VIOLAZIONE_CHIAVE_ESTERNA = "23503";

function codiceErrore(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
}

export type EsitoScrittura =
  | { ok: true; id: number }
  | { ok: false; motivo: "nome_duplicato" | "non_trovato" | "in_uso" };

function esitoRighe(toccate: number, id: number): EsitoScrittura {
  return toccate ? { ok: true, id } : { ok: false, motivo: "non_trovato" };
}

export async function creaSettore(valori: CampiSettore): Promise<EsitoScrittura> {
  try {
    const [riga] = await db.insert(settore).values(valori).returning({ id: settore.id });
    return { ok: true, id: riga.id };
  } catch (e) {
    if (codiceErrore(e) === VIOLAZIONE_UNICITA) return { ok: false, motivo: "nome_duplicato" };
    throw e;
  }
}

export async function aggiornaSettore(id: number, valori: CampiSettore): Promise<EsitoScrittura> {
  try {
    const righe = await db.update(settore).set(valori).where(eq(settore.id, id)).returning({ id: settore.id });
    return esitoRighe(righe.length, id);
  } catch (e) {
    if (codiceErrore(e) === VIOLAZIONE_UNICITA) return { ok: false, motivo: "nome_duplicato" };
    throw e;
  }
}

// Quanti Clienti e quanti Atti (collegamento esplicito) usano il Settore.
export async function usiSettore(id: number): Promise<UsiSettore> {
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
    return esitoRighe(righe.length, id);
  } catch (e) {
    if (codiceErrore(e) === VIOLAZIONE_CHIAVE_ESTERNA) return { ok: false, motivo: "in_uso" };
    throw e;
  }
}
