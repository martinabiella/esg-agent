import { and, asc, desc, eq, gt, gte, lt, max, sql } from "drizzle-orm";
import { db } from "./index";
import { fontiDaControllare } from "./fonti";
import { attoNormativo, chiaveNomeFonte, esecuzioneRicerca, fonte } from "./schema";
import type {
  ArchivioEsecuzioni,
  EsecuzioneAperta,
  NuovaEsecuzione,
  UltimaEsecuzione,
} from "@/lib/esecuzione";
import type { NotiziaDaSalvare } from "@/lib/ricerca-fonte";

export type Ricerca = typeof esecuzioneRicerca.$inferSelect;

// Ultima Ricerca riuscita (esito "completata") per una Fonte, o null se la
// Fonte non è mai stata controllata. Le Ricerche avviate prima dell'ultimo
// cambio di URL non contano: con un URL nuovo la Fonte riparte da "mai
// controllata". Serve a segnalare le Fonti che l'agente non riesce a
// controllare e a calcolare la finestra temporale delle Ricerche.
export async function ultimaRicercaRiuscita(fonteId: number): Promise<Ricerca | null> {
  const [riga] = await db
    .select({ ricerca: esecuzioneRicerca })
    .from(esecuzioneRicerca)
    .innerJoin(fonte, eq(fonte.id, esecuzioneRicerca.fonteId))
    .where(
      and(
        eq(esecuzioneRicerca.fonteId, fonteId),
        eq(esecuzioneRicerca.esito, "completata"),
        gte(esecuzioneRicerca.avviataIl, fonte.urlModificatoIl),
      ),
    )
    .orderBy(desc(esecuzioneRicerca.avviataIl), desc(esecuzioneRicerca.id))
    .limit(1);
  return riga?.ricerca ?? null;
}

// Le Ricerche dell'ultima esecuzione, cioè quelle con l'avvio più recente
// (un'esecuzione le registra tutte con lo stesso avviata_il), per nome della
// Fonte. null se non è mai partita una Ricerca.
export async function ultimaEsecuzione(): Promise<UltimaEsecuzione | null> {
  const righe = await db
    .select({
      avviataIl: esecuzioneRicerca.avviataIl,
      fonte: fonte.nome,
      esito: esecuzioneRicerca.esito,
      notizieCreate: esecuzioneRicerca.notizieCreate,
    })
    .from(esecuzioneRicerca)
    .leftJoin(fonte, eq(fonte.id, esecuzioneRicerca.fonteId))
    .where(
      eq(
        esecuzioneRicerca.avviataIl,
        db.select({ il: max(esecuzioneRicerca.avviataIl) }).from(esecuzioneRicerca),
      ),
    )
    .orderBy(asc(chiaveNomeFonte(fonte.nome)), asc(esecuzioneRicerca.id));
  if (righe.length === 0) return null;
  return {
    avviataIl: righe[0].avviataIl,
    ricerche: righe.map(({ fonte, esito, notizieCreate }) => ({ fonte, esito, notizieCreate })),
  };
}

// ---- Archivio per l'agente (src/lib/ricerca-fonte.ts e src/lib/esecuzione.ts) ----
// Il driver neon-http non ha transazioni interattive: le scritture che vanno
// insieme stanno in una sola istruzione, quindi atomica.

// Notizie dell'agente (provenienza_contenuti = 'agente') e collegamenti, poi la
// chiusura della Ricerca.
// La riga della Ricerca è bloccata (FOR UPDATE) e deve essere ancora in corso:
// un secondo recapito dello stesso evento, anche in contemporanea, non scrive
// nulla. Gli URL già presenti si saltano (vincolo unique su notizia.url). Si
// collegano solo Atti che esistono ancora e non sono Non rilevanti.
async function completaRicerca(id: number, notizie: NotiziaDaSalvare[]) {
  const righe = notizie.map((n) => ({
    titolo: n.titolo,
    fonte: n.pubblicataDa,
    data: n.data,
    url: n.url,
    riassunto: n.riassunto,
    segnala_novita: n.segnalaNovita,
    atti: n.atti,
  }));
  const risultato = await db.execute<{ notizie_create: number }>(sql`
    WITH ricerca_bloccata AS (
      SELECT id FROM esecuzione_ricerca
      WHERE id = ${id} AND esito = 'in_corso'
      FOR UPDATE
    ), dati AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(righe)}::jsonb) AS n(
        titolo text, fonte text, data date, url text, riassunto text,
        segnala_novita boolean, atti int[]
      )
    ), nuove AS (
      INSERT INTO notizia (titolo, fonte, data, url, riassunto, provenienza_contenuti, segnala_novita)
      SELECT titolo, fonte, data, url, riassunto, 'agente', segnala_novita
      FROM dati
      WHERE EXISTS (SELECT 1 FROM ricerca_bloccata)
      ON CONFLICT (url) DO NOTHING
      RETURNING id, url
    ), collegamenti AS (
      INSERT INTO notizia_atto (notizia_id, atto_id)
      SELECT nuove.id, atto.id
      FROM nuove
      JOIN dati ON dati.url = nuove.url
      CROSS JOIN LATERAL unnest(dati.atti) AS citato(atto_id)
      JOIN atto_normativo atto ON atto.id = citato.atto_id AND NOT atto.non_rilevante
      ON CONFLICT DO NOTHING
    )
    UPDATE esecuzione_ricerca
    SET esito = 'completata', terminata_il = now(), notizie_create = (SELECT count(*) FROM nuove)
    WHERE id IN (SELECT id FROM ricerca_bloccata)
    RETURNING notizie_create
  `);
  const [riga] = risultato.rows;
  return riga ? { notizieCreate: Number(riga.notizie_create) } : null;
}

// Un'esecuzione alla volta: il lock consultivo, preso nella stessa transazione,
// mette in fila due avvii contemporanei. In READ COMMITTED ogni istruzione
// legge i dati confermati al suo inizio, quindi l'insert che segue il lock
// vede le Ricerche registrate dall'avvio che lo teneva.
// Le date nell'SQL grezzo viaggiano come ISO in UTC: le colonne sono
// timestamp senza fuso, come le scrive Drizzle.
async function apriEsecuzione({
  avviataIl,
  daAvviare,
  saltate,
  bloccanteDal,
}: NuovaEsecuzione): Promise<EsecuzioneAperta> {
  const righe = [
    ...daAvviare.map((fonteId) => ({ fonte_id: fonteId, esito: "in_corso" })),
    ...saltate.map((fonteId) => ({ fonte_id: fonteId, esito: "saltata_per_tetto" })),
  ];
  const avviata = avviataIl.toISOString();
  const [, registrate, [bloccante]] = await db.batch([
    db.execute(sql`SELECT pg_advisory_xact_lock(hashtext('esg-agent:avvio-esecuzione'))`),
    db.execute<{ id: number; fonte_id: number; esito: string }>(sql`
      INSERT INTO esecuzione_ricerca (tipo, fonte_id, avviata_il, esito, terminata_il)
      SELECT 'per_fonte', r.fonte_id, ${avviata}::timestamp, r.esito,
        CASE WHEN r.esito = 'saltata_per_tetto' THEN ${avviata}::timestamp END
      FROM jsonb_to_recordset(${JSON.stringify(righe)}::jsonb) AS r(fonte_id int, esito esito_ricerca)
      WHERE NOT EXISTS (
        SELECT 1 FROM esecuzione_ricerca e
        WHERE e.esito = 'in_corso' AND e.avviata_il > ${bloccanteDal.toISOString()}::timestamp
      )
      RETURNING id, fonte_id, esito
    `),
    db
      .select({ il: max(esecuzioneRicerca.avviataIl) })
      .from(esecuzioneRicerca)
      .where(and(eq(esecuzioneRicerca.esito, "in_corso"), gt(esecuzioneRicerca.avviataIl, bloccanteDal))),
  ]);
  // Le righe da registrare non sono mai vuote: se non ne è entrata nessuna,
  // un'altra esecuzione è in corso.
  if (registrate.rows.length === 0) return { esito: "bloccata", inCorsoDal: bloccante?.il ?? bloccanteDal };
  return {
    esito: "aperta",
    ricerche: registrate.rows
      .filter((r) => r.esito === "in_corso")
      .map((r) => ({ fonteId: Number(r.fonte_id), ricercaId: Number(r.id) })),
  };
}

export const archivioRicerche: ArchivioEsecuzioni = {
  fontiDaControllare,
  apriEsecuzione,

  async chiudiRicercheScadute(avviatePrima, errore) {
    const righe = await db
      .update(esecuzioneRicerca)
      .set({ esito: "fallita", errore, terminataIl: sql`now()` })
      .where(and(eq(esecuzioneRicerca.esito, "in_corso"), lt(esecuzioneRicerca.avviataIl, avviatePrima)))
      .returning({ id: esecuzioneRicerca.id });
    return righe.length;
  },

  async ultimaRicercaRiuscita(fonteId) {
    return (await ultimaRicercaRiuscita(fonteId))?.avviataIl ?? null;
  },

  async assegnaRun(ricercaId, runId) {
    await db.update(esecuzioneRicerca).set({ parallelRunId: runId }).where(eq(esecuzioneRicerca.id, ricercaId));
  },

  async ricercaPerRunId(runId) {
    const [riga] = await db
      .select({ id: esecuzioneRicerca.id, esito: esecuzioneRicerca.esito })
      .from(esecuzioneRicerca)
      .where(eq(esecuzioneRicerca.parallelRunId, runId));
    return riga ?? null;
  },

  async attiCatalogo() {
    return db
      .select({
        id: attoNormativo.id,
        titolo: attoNormativo.titolo,
        identificativoUfficiale: attoNormativo.identificativoUfficiale,
        giurisdizione: attoNormativo.giurisdizione,
        nonRilevante: attoNormativo.nonRilevante,
      })
      .from(attoNormativo);
  },

  completaRicerca,

  async segnaFallita(id, errore) {
    const righe = await db
      .update(esecuzioneRicerca)
      .set({ esito: "fallita", errore, terminataIl: sql`now()` })
      .where(and(eq(esecuzioneRicerca.id, id), eq(esecuzioneRicerca.esito, "in_corso")))
      .returning({ id: esecuzioneRicerca.id });
    return righe.length > 0;
  },
};
