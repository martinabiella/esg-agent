import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "./index";
import { esecuzioneRicerca, fonte } from "./schema";

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
