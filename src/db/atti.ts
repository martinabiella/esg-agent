import { and, asc, eq, exists, ne, or } from "drizzle-orm";
import { db } from "./index";
import { attoNormativo, attoSettore } from "./schema";

// Atti che riguardano il Settore: collegati esplicitamente oppure validi per
// tutti i Settori. Gli Atti "non rilevante" e quelli abrogati sono nascosti
// dalla vista (restano nel database).
export async function attiDelSettore(settoreId: number) {
  return db
    .select({
      id: attoNormativo.id,
      titolo: attoNormativo.titolo,
      giurisdizione: attoNormativo.giurisdizione,
      stato: attoNormativo.stato,
      tuttiISettori: attoNormativo.tuttiISettori,
    })
    .from(attoNormativo)
    .where(
      and(
        eq(attoNormativo.nonRilevante, false),
        ne(attoNormativo.stato, "abrogato"),
        or(
          eq(attoNormativo.tuttiISettori, true),
          exists(
            db
              .select({ attoId: attoSettore.attoId })
              .from(attoSettore)
              .where(
                and(
                  eq(attoSettore.attoId, attoNormativo.id),
                  eq(attoSettore.settoreId, settoreId),
                ),
              ),
          ),
        ),
      ),
    )
    .orderBy(asc(attoNormativo.titolo));
}
