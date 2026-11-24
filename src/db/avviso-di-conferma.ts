import { and, asc, eq, isNull, notExists, sql } from "drizzle-orm";
import { db } from "./index";
import { impattoPerAtto } from "./applicabilita";
import { cambiDiStatoNonVisti } from "./cambi-di-stato";
import { attoNormativo, notizia, notiziaAtto, statoStorico } from "./schema";
import {
  costruisciAvviso,
  ordinaPerImpatto,
  type Avviso,
  type RigheAvviso,
} from "@/lib/avviso-di-conferma";

async function righeAvviso(): Promise<RigheAvviso> {
  const [attiDaConfermare, cambi, notizieSuAtti, notizieSenzaAtto] = await Promise.all([
    db
      .select({
        attoId: attoNormativo.id,
        titolo: attoNormativo.titolo,
        aggiornatoIl: attoNormativo.aggiornatoIl,
      })
      .from(attoNormativo)
      .where(
        and(
          eq(attoNormativo.provenienzaContenuti, "agente"),
          eq(attoNormativo.criteriConfermati, false),
          eq(attoNormativo.nonRilevante, false),
        ),
      ),
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
    cambiDiStato: cambi.map((c) => ({ attoId: c.attoId, titolo: c.titolo, stato: c.stato, data: c.data })),
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

// Segna controllato un Atto: contenuti generati confermati, cambi di Stato
// dell'agente visti, Notizie collegate controllate. Un solo batch atomico.
// Non tocca aggiornato_il: confermare non è modificare i Criteri (vedi Override).
export async function segnaAttoControllato(attoId: number): Promise<boolean> {
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
          eq(statoStorico.provenienza, "agente"),
          isNull(statoStorico.vistoIl),
        ),
      ),
    db
      .update(notiziaAtto)
      .set({ controllataIl: sql`now()` })
      .where(and(eq(notiziaAtto.attoId, attoId), isNull(notiziaAtto.controllataIl))),
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
