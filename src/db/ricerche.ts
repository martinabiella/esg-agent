import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "./index";
import { attoNormativo, esecuzioneRicerca, fonte } from "./schema";
import type { ArchivioRicerche, NotiziaDaSalvare } from "@/lib/ricerca-fonte";

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

// ---- Archivio per l'agente (src/lib/ricerca-fonte.ts) ----
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

export const archivioRicerche: ArchivioRicerche = {
  async ultimaRicercaRiuscita(fonteId) {
    return (await ultimaRicercaRiuscita(fonteId))?.avviataIl ?? null;
  },

  async registraRicerca(r) {
    const [riga] = await db
      .insert(esecuzioneRicerca)
      .values({
        tipo: "per_fonte",
        fonteId: r.fonteId,
        avviataIl: r.avviataIl,
        parallelRunId: r.parallelRunId,
        esito: r.esito,
        errore: r.errore,
        terminataIl: r.esito === "in_corso" ? null : r.avviataIl,
      })
      .returning({ id: esecuzioneRicerca.id });
    return riga.id;
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
