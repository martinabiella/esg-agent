import { asc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import type { CampiCliente } from "@/lib/cliente";
import { cliente, clienteSettore, settore } from "./schema";

export type ClienteConSettori = typeof cliente.$inferSelect & {
  settori: { id: number; nome: string }[];
};

async function settoriDeiClienti() {
  return db
    .select({
      clienteId: clienteSettore.clienteId,
      id: settore.id,
      nome: settore.nome,
    })
    .from(clienteSettore)
    .innerJoin(settore, eq(clienteSettore.settoreId, settore.id))
    .orderBy(asc(settore.nome));
}

function aggiungiSettori(
  clienti: (typeof cliente.$inferSelect)[],
  collegamenti: Awaited<ReturnType<typeof settoriDeiClienti>>,
): ClienteConSettori[] {
  const settoriPerCliente = new Map<number, { id: number; nome: string }[]>();
  for (const collegamento of collegamenti) {
    const settori = settoriPerCliente.get(collegamento.clienteId) ?? [];
    settori.push({ id: collegamento.id, nome: collegamento.nome });
    settoriPerCliente.set(collegamento.clienteId, settori);
  }

  return clienti.map((cliente) => ({
    ...cliente,
    settori: settoriPerCliente.get(cliente.id) ?? [],
  }));
}

export async function elencoClienti(): Promise<ClienteConSettori[]> {
  const [clienti, collegamenti] = await Promise.all([
    db.select().from(cliente).orderBy(asc(cliente.ragioneSociale)),
    settoriDeiClienti(),
  ]);
  return aggiungiSettori(clienti, collegamenti);
}

export async function clientiDelSettore(settoreId: number) {
  return db
    .select({
      id: cliente.id,
      ragioneSociale: cliente.ragioneSociale,
      attivitaSpecifica: cliente.attivitaSpecifica,
    })
    .from(clienteSettore)
    .innerJoin(cliente, eq(clienteSettore.clienteId, cliente.id))
    .where(eq(clienteSettore.settoreId, settoreId))
    .orderBy(asc(cliente.ragioneSociale), asc(cliente.id));
}

// ---- Scritture ----
// Il driver neon-http non ha transazioni interattive: Cliente e collegamenti ai
// Settori viaggiano in un'unica richiesta atomica (batch, o una sola istruzione).

const VIOLAZIONE_CHIAVE_ESTERNA = "23503";

function codiceErrore(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
}

export type EsitoScritturaCliente =
  | { ok: true; id: number }
  | { ok: false; motivo: "non_trovato" | "settore_inesistente" };

function datiCliente(valori: CampiCliente) {
  return {
    ragioneSociale: valori.ragioneSociale,
    attivitaSpecifica: valori.attivitaSpecifica,
    dipendenti: valori.dipendenti,
    fatturato: valori.fatturato,
    annoRiferimento: valori.annoRiferimento,
    paesi: valori.paesi,
    note: valori.note,
  };
}

function elencoSql<T>(valori: readonly T[], tipo: string) {
  return sql`ARRAY[${sql.join(valori.map((v) => sql`${v}`), sql`, `)}]::${sql.raw(tipo)}`;
}

export async function creaCliente(valori: CampiCliente): Promise<EsitoScritturaCliente> {
  const paesi = valori.paesi ? elencoSql(valori.paesi, "text[]") : sql`NULL`;
  try {
    // I collegamenti richiedono l'id appena creato: una sola istruzione (CTE),
    // quindi atomica. Se un Settore non esiste la chiave esterna annulla tutto.
    const risultato = await db.execute<{ id: number }>(sql`
      WITH nuovo AS (
        INSERT INTO cliente (ragione_sociale, attivita_specifica, dipendenti, fatturato, anno_riferimento, paesi, note)
        VALUES (${valori.ragioneSociale}, ${valori.attivitaSpecifica}, ${valori.dipendenti},
                ${valori.fatturato}::numeric, ${valori.annoRiferimento}, ${paesi}, ${valori.note})
        RETURNING id
      ), collegamenti AS (
        INSERT INTO cliente_settore (cliente_id, settore_id)
        SELECT nuovo.id, unnest(${elencoSql(valori.settori, "int[]")}) FROM nuovo
      )
      SELECT id FROM nuovo
    `);
    return { ok: true, id: risultato.rows[0].id };
  } catch (e) {
    if (codiceErrore(e) === VIOLAZIONE_CHIAVE_ESTERNA) {
      return { ok: false, motivo: "settore_inesistente" };
    }
    throw e;
  }
}

export async function aggiornaCliente(
  id: number,
  valori: CampiCliente,
): Promise<EsitoScritturaCliente> {
  try {
    const [aggiornati] = await db.batch([
      db.update(cliente).set(datiCliente(valori)).where(eq(cliente.id, id)).returning({ id: cliente.id }),
      db.delete(clienteSettore).where(eq(clienteSettore.clienteId, id)),
      db
        .insert(clienteSettore)
        .select(
          db
            .select({ clienteId: cliente.id, settoreId: sql<number>`unnest(${elencoSql(valori.settori, "int[]")})`.as("settore_id") })
            .from(cliente)
            .where(eq(cliente.id, id)),
        ),
    ]);
    return aggiornati.length > 0 ? { ok: true, id } : { ok: false, motivo: "non_trovato" };
  } catch (e) {
    if (codiceErrore(e) === VIOLAZIONE_CHIAVE_ESTERNA) {
      return { ok: false, motivo: "settore_inesistente" };
    }
    throw e;
  }
}

export async function eliminaCliente(id: number): Promise<EsitoScritturaCliente> {
  // I collegamenti cadono a cascata.
  const righe = await db.delete(cliente).where(eq(cliente.id, id)).returning({ id: cliente.id });
  return righe.length > 0 ? { ok: true, id } : { ok: false, motivo: "non_trovato" };
}
