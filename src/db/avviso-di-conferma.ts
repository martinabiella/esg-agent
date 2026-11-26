import { and, asc, eq, gte, inArray, isNull, notExists, sql } from "drizzle-orm";
import { db } from "./index";
import { impattoPerAtto } from "./applicabilita";
import { cambiDiStatoNonVisti } from "./cambi-di-stato";
import { attoNormativo, attoSettore, notizia, notiziaAtto, statoStorico } from "./schema";
import {
  costruisciAvviso,
  limiteNotizieAvviso,
  ordinaPerImpatto,
  type Avviso,
  type RigheAvviso,
} from "@/lib/avviso-di-conferma";

// Atti con contenuti dell'agente non confermati. Esportata perché i test la
// eseguono su Postgres in memoria tramite db.batch.
export function queryAttiDaConfermare() {
  return db
    .select({
      attoId: attoNormativo.id,
      titolo: attoNormativo.titolo,
      aggiornatoIl: attoNormativo.aggiornatoIl,
      senzaSettori: sql<boolean>`NOT ${attoNormativo.tuttiISettori} AND NOT EXISTS (SELECT 1 FROM ${attoSettore} WHERE ${attoSettore.attoId} = ${attoNormativo.id})`.as("senza_settori"),
    })
    .from(attoNormativo)
    .where(
      and(
        eq(attoNormativo.provenienzaContenuti, "agente"),
        eq(attoNormativo.criteriConfermati, false),
        eq(attoNormativo.nonRilevante, false),
      ),
    );
}

async function righeAvviso(): Promise<RigheAvviso> {
  const recenti = limiteNotizieAvviso(new Date());
  const [attiDaConfermare, cambi, notizieSuAtti, notizieSenzaAtto] = await Promise.all([
    queryAttiDaConfermare(),
    cambiDiStatoNonVisti(),
    // Una Notizia che cita solo Atti Non rilevanti non compare in nessuno dei due elenchi.
    db
      .select({
        notiziaId: notizia.id,
        notiziaTitolo: notizia.titolo,
        notiziaCreataIl: notizia.creatoIl,
        attoId: attoNormativo.id,
        attoTitolo: attoNormativo.titolo,
      })
      .from(notiziaAtto)
      .innerJoin(notizia, eq(notizia.id, notiziaAtto.notiziaId))
      .innerJoin(attoNormativo, eq(attoNormativo.id, notiziaAtto.attoId))
      .where(
        and(
          eq(notizia.segnalaNovita, true),
          gte(notizia.creatoIl, recenti),
          isNull(notiziaAtto.controllataIl),
          eq(attoNormativo.nonRilevante, false),
        ),
      )
      .orderBy(asc(notizia.id)),
    db
      .select({ id: notizia.id, titolo: notizia.titolo })
      .from(notizia)
      .where(
        and(
          eq(notizia.segnalaNovita, true),
          gte(notizia.creatoIl, recenti),
          isNull(notizia.controllataIl),
          notExists(
            db.select({ x: sql`1` }).from(notiziaAtto).where(eq(notiziaAtto.notiziaId, notizia.id)),
          ),
        ),
      )
      .orderBy(asc(notizia.id)),
  ]);
  return {
    attiDaConfermare: attiDaConfermare.map((a) => ({ ...a, aggiornatoIl: a.aggiornatoIl.toISOString() })),
    cambiDiStato: cambi,
    notizieSuAtti: notizieSuAtti.map((n) => ({ ...n, notiziaCreataIl: n.notiziaCreataIl.toISOString() })),
    notizieSenzaAtto,
  };
}

// L'Avviso di conferma, con gli Atti ordinati per impatto sui Clienti.
export async function avvisoDiConferma(): Promise<Avviso> {
  const avviso = costruisciAvviso(await righeAvviso());
  const impatto = await impattoPerAtto(avviso.atti.map((a) => a.attoId));
  return { ...avviso, atti: ordinaPerImpatto(avviso.atti, impatto) };
}

export type NovitaMostrate = { cambiDiStato: number[]; notizie: number[] };

// Conferma i contenuti e segna come controllati solo i cambi di Stato e le Notizie mostrate.
// Un solo batch atomico.
// Non tocca aggiornato_il: confermare non è modificare i Criteri (vedi Override).
export async function segnaAttoControllato(attoId: number, mostrate: NovitaMostrate): Promise<boolean> {
  const [atti] = await db.batch([
    db
      .update(attoNormativo)
      .set({
        criteriConfermati: true,
        provenienzaContenuti: sql`CASE WHEN ${attoNormativo.provenienzaContenuti} = 'agente' THEN 'persona'::provenienza ELSE ${attoNormativo.provenienzaContenuti} END`,
      })
      .where(eq(attoNormativo.id, attoId))
      .returning({ id: attoNormativo.id }),
    db
      .update(statoStorico)
      .set({ vistoIl: sql`now()` })
      .where(
        and(
          eq(statoStorico.attoId, attoId),
          inArray(statoStorico.id, mostrate.cambiDiStato),
          eq(statoStorico.provenienza, "agente"),
          isNull(statoStorico.vistoIl),
        ),
      ),
    db
      .update(notiziaAtto)
      .set({ controllataIl: sql`now()` })
      .where(
        and(
          eq(notiziaAtto.attoId, attoId),
          inArray(notiziaAtto.notiziaId, mostrate.notizie),
          isNull(notiziaAtto.controllataIl),
        ),
      ),
  ]);
  return atti.length > 0;
}

// Segna controllata una Notizia senza Atti collegati.
export async function segnaNotiziaControllata(notiziaId: number): Promise<boolean> {
  const righe = await db
    .update(notizia)
    .set({ controllataIl: sql`now()` })
    .where(and(eq(notizia.id, notiziaId), isNull(notizia.controllataIl)))
    .returning({ id: notizia.id });
  return righe.length > 0;
}
