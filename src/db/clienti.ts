import { asc, eq } from "drizzle-orm";
import { db } from "./index";
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

export async function trovaCliente(id: number): Promise<ClienteConSettori | null> {
  const [clienteTrovato] = await db.select().from(cliente).where(eq(cliente.id, id));
  if (!clienteTrovato) return null;

  const collegamenti = await db
    .select({ id: settore.id, nome: settore.nome })
    .from(clienteSettore)
    .innerJoin(settore, eq(clienteSettore.settoreId, settore.id))
    .where(eq(clienteSettore.clienteId, id))
    .orderBy(asc(settore.nome));

  return { ...clienteTrovato, settori: collegamenti };
}
