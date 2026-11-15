import { and, eq } from "drizzle-orm";
import { db } from "./index";
import type { EsitoOverride } from "@/lib/override";
import { overrideApplicabilita } from "./schema";

const VIOLAZIONE_CHIAVE_ESTERNA = "23503";

function codiceErrore(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
}

// Una riga per coppia Cliente–Atto: un nuovo Override sostituisce il precedente.
export async function salvaOverride(valori: {
  clienteId: number;
  attoId: number;
  esito: EsitoOverride;
  motivazione: string;
  autore: string;
}): Promise<{ ok: true } | { ok: false; motivo: "non_trovato" }> {
  try {
    await db
      .insert(overrideApplicabilita)
      .values(valori)
      .onConflictDoUpdate({
        target: [overrideApplicabilita.clienteId, overrideApplicabilita.attoId],
        set: {
          esito: valori.esito,
          motivazione: valori.motivazione,
          autore: valori.autore,
          creatoIl: new Date(),
        },
      });
    return { ok: true };
  } catch (e) {
    if (codiceErrore(e) === VIOLAZIONE_CHIAVE_ESTERNA) return { ok: false, motivo: "non_trovato" };
    throw e;
  }
}

// Togliere un Override che non esiste più non è un errore: l'esito è già quello calcolato.
export async function rimuoviOverride(clienteId: number, attoId: number): Promise<void> {
  await db
    .delete(overrideApplicabilita)
    .where(
      and(eq(overrideApplicabilita.clienteId, clienteId), eq(overrideApplicabilita.attoId, attoId)),
    );
}
