import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "./index";
import { attoNormativo, statoStorico } from "./schema";

export type CambioDiStatoNonVisto = {
  id: number;
  attoId: number;
  titolo: string;
  stato: typeof statoStorico.$inferSelect.stato;
  data: string;
};

// I cambi di Stato rilevati dall'agente (da una Fonte ufficiale) che nessuno ha
// ancora segnato come visti, i più recenti per primi: li leggerà l'Avviso di
// conferma. Un Atto Non rilevante non compare.
export async function cambiDiStatoNonVisti(): Promise<CambioDiStatoNonVisto[]> {
  return db
    .select({
      id: statoStorico.id,
      attoId: statoStorico.attoId,
      titolo: attoNormativo.titolo,
      stato: statoStorico.stato,
      data: statoStorico.data,
    })
    .from(statoStorico)
    .innerJoin(attoNormativo, eq(attoNormativo.id, statoStorico.attoId))
    .where(and(eq(statoStorico.provenienza, "agente"), isNull(statoStorico.vistoIl), eq(attoNormativo.nonRilevante, false)))
    .orderBy(desc(statoStorico.data), desc(statoStorico.id));
}
