import { asc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import type { CampiNotizia } from "@/lib/notizia";
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

// Tutti gli Atti, per la ricerca per titolo nel modulo (con il loro Stato).
export async function attiPerSelezione() {
  return db
    .select({ id: attoNormativo.id, titolo: attoNormativo.titolo, stato: attoNormativo.stato })
    .from(attoNormativo)
    .orderBy(asc(attoNormativo.titolo), asc(attoNormativo.id));
}

// ---- Scritture ----
// Il driver neon-http non ha transazioni interattive: Notizia e collegamenti
// agli Atti viaggiano in un'unica richiesta atomica (batch, o una sola istruzione).
// Le Notizie non hanno una Provenienza esposta: la colonna resta col suo valore di default.

const VIOLAZIONE_UNICITA = "23505";
const VIOLAZIONE_CHIAVE_ESTERNA = "23503";

function codiceErrore(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
}

export type EsitoScritturaNotizia =
  | { ok: true; id: number }
  | {
      ok: false;
      motivo: "non_trovata" | "atto_inesistente" | "url_duplicato";
      // Per url_duplicato: la Notizia che ha già quell'URL.
      esistente?: { id: number; titolo: string };
    };

function elencoInteri(valori: readonly number[]) {
  return sql`ARRAY[${sql.join(valori.map((v) => sql`${v}`), sql`, `)}]::int[]`;
}

async function urlDuplicato(url: string): Promise<EsitoScritturaNotizia> {
  const [esistente] = await db
    .select({ id: notizia.id, titolo: notizia.titolo })
    .from(notizia)
    .where(eq(notizia.url, url));
  return { ok: false, motivo: "url_duplicato", esistente };
}

async function esitoErrore(e: unknown, url: string): Promise<EsitoScritturaNotizia> {
  const codice = codiceErrore(e);
  if (codice === VIOLAZIONE_UNICITA) return urlDuplicato(url);
  if (codice === VIOLAZIONE_CHIAVE_ESTERNA) return { ok: false, motivo: "atto_inesistente" };
  throw e;
}

export async function creaNotizia(valori: CampiNotizia): Promise<EsitoScritturaNotizia> {
  try {
    // I collegamenti richiedono l'id appena creato: una sola istruzione (CTE),
    // quindi atomica. Se un Atto non esiste la chiave esterna annulla tutto.
    const risultato = await db.execute<{ id: number }>(sql`
      WITH nuova AS (
        INSERT INTO notizia (titolo, fonte, data, url, riassunto)
        VALUES (${valori.titolo}, ${valori.fonte}, ${valori.data}::date, ${valori.url},
                ${valori.riassunto})
        RETURNING id
      ), collegamenti AS (
        INSERT INTO notizia_atto (notizia_id, atto_id)
        SELECT nuova.id, unnest(${elencoInteri(valori.atti)}) FROM nuova
      )
      SELECT id FROM nuova
    `);
    return { ok: true, id: risultato.rows[0].id };
  } catch (e) {
    return esitoErrore(e, valori.url);
  }
}

export async function aggiornaNotizia(
  id: number,
  valori: CampiNotizia,
): Promise<EsitoScritturaNotizia> {
  try {
    const [aggiornate] = await db.batch([
      db
        .update(notizia)
        .set({
          titolo: valori.titolo,
          fonte: valori.fonte,
          data: valori.data,
          url: valori.url,
          riassunto: valori.riassunto,
        })
        .where(eq(notizia.id, id))
        .returning({ id: notizia.id }),
      db.delete(notiziaAtto).where(eq(notiziaAtto.notiziaId, id)),
      db
        .insert(notiziaAtto)
        .select(
          db
            .select({
              notiziaId: notizia.id,
              attoId: sql<number>`unnest(${elencoInteri(valori.atti)})`.as("atto_id"),
            })
            .from(notizia)
            .where(eq(notizia.id, id)),
        ),
    ]);
    return aggiornate.length > 0 ? { ok: true, id } : { ok: false, motivo: "non_trovata" };
  } catch (e) {
    return esitoErrore(e, valori.url);
  }
}

export async function eliminaNotizia(id: number): Promise<EsitoScritturaNotizia> {
  // I collegamenti cadono a cascata.
  const righe = await db.delete(notizia).where(eq(notizia.id, id)).returning({ id: notizia.id });
  return righe.length > 0 ? { ok: true, id } : { ok: false, motivo: "non_trovata" };
}
