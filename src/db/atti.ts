import { and, asc, desc, eq, exists, ne, or, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db } from "./index";
import type { FiltriAtti } from "@/lib/filtri-atti";
import {
  attoNormativo,
  attoSettore,
  attoTema,
  notizia,
  notiziaAtto,
  settore,
  statoStorico,
  tema,
} from "./schema";

// L'Atto ha un collegamento (tabella ponte) con l'id dato.
function collegatoA(
  ponte: typeof attoSettore | typeof attoTema,
  colonna: PgColumn,
  id: number,
) {
  return exists(
    db
      .select({ attoId: ponte.attoId })
      .from(ponte)
      .where(and(eq(ponte.attoId, attoNormativo.id), eq(colonna, id))),
  );
}

// Atti dell'elenco. Esclude sempre i "non rilevanti". Senza filtro Stato nasconde
// anche gli abrogati (restano nel database e raggiungibili con ?stato=abrogato).
// Il filtro Settore include gli Atti validi per tutti i Settori.
export async function elencoAtti(filtri: FiltriAtti) {
  const condizioni: (SQL | undefined)[] = [
    eq(attoNormativo.nonRilevante, false),
    filtri.stato
      ? eq(attoNormativo.stato, filtri.stato)
      : ne(attoNormativo.stato, "abrogato"),
  ];
  if (filtri.settoreId !== undefined) {
    condizioni.push(
      or(
        eq(attoNormativo.tuttiISettori, true),
        collegatoA(attoSettore, attoSettore.settoreId, filtri.settoreId),
      ),
    );
  }
  if (filtri.temaId !== undefined) {
    condizioni.push(collegatoA(attoTema, attoTema.temaId, filtri.temaId));
  }
  return db
    .select({
      id: attoNormativo.id,
      titolo: attoNormativo.titolo,
      giurisdizione: attoNormativo.giurisdizione,
      tipo: attoNormativo.tipo,
      stato: attoNormativo.stato,
      tuttiISettori: attoNormativo.tuttiISettori,
    })
    .from(attoNormativo)
    .where(and(...condizioni))
    .orderBy(asc(attoNormativo.titolo));
}

// Atti che riguardano il Settore (stessa regola dell'elenco).
export function attiDelSettore(settoreId: number) {
  return elencoAtti({ settoreId });
}

export async function elencoTemi() {
  return db.select().from(tema).orderBy(asc(tema.nome));
}

// Atto con Settori, Temi, Notizie collegate e storico degli Stati; null se non
// esiste. Consultabile anche se non rilevante o abrogato.
export async function trovaAtto(id: number) {
  const [atto] = await db
    .select()
    .from(attoNormativo)
    .where(eq(attoNormativo.id, id));
  if (!atto) return null;

  const [settori, temi, notizie, storico] = await Promise.all([
    db
      .select({ id: settore.id, nome: settore.nome })
      .from(attoSettore)
      .innerJoin(settore, eq(settore.id, attoSettore.settoreId))
      .where(eq(attoSettore.attoId, id))
      .orderBy(asc(settore.nome)),
    db
      .select({ id: tema.id, nome: tema.nome })
      .from(attoTema)
      .innerJoin(tema, eq(tema.id, attoTema.temaId))
      .where(eq(attoTema.attoId, id))
      .orderBy(asc(tema.nome)),
    db
      .select({
        id: notizia.id,
        titolo: notizia.titolo,
        fonte: notizia.fonte,
        data: notizia.data,
        url: notizia.url,
      })
      .from(notiziaAtto)
      .innerJoin(notizia, eq(notizia.id, notiziaAtto.notiziaId))
      .where(eq(notiziaAtto.attoId, id))
      .orderBy(desc(notizia.data), asc(notizia.titolo)),
    db
      .select({ id: statoStorico.id, stato: statoStorico.stato, data: statoStorico.data })
      .from(statoStorico)
      .where(eq(statoStorico.attoId, id))
      .orderBy(asc(statoStorico.data), asc(statoStorico.id)),
  ]);
  return { ...atto, settori, temi, notizie, storico };
}
