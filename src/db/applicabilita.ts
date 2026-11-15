import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "./index";
import { elencoClienti, type ClienteConSettori } from "./clienti";
import {
  attoCalcolabile,
  calcolaApplicabilita,
  type Applicabilita,
  type AttoPerCalcolo,
} from "@/lib/applicabilita";
import {
  applicabilitaEffettiva,
  criteriModificatiDopo,
  type EsitoOverride,
} from "@/lib/override";
import {
  attoNormativo,
  attoSettore,
  overrideApplicabilita,
  statoStorico,
} from "./schema";

// Tutto serializzabile: questi tipi passano ai componenti client.
export type DecisioneOverride = {
  esito: EsitoOverride;
  motivazione: string;
  autore: string;
  decisoIl: string;
  // L'Atto è cambiato dopo la decisione: i Criteri potrebbero non valere più.
  criteriModificati: boolean;
};

export type Valutazione = {
  calcolata: Applicabilita;
  effettiva: Applicabilita;
  override: DecisioneOverride | null;
};

export type NormaDelCliente = {
  attoId: number;
  titolo: string;
  stato: string;
  entrataInVigore: string | null;
  recepimentoEntro: string | null;
  criteriConfermati: boolean;
  valutazione: Valutazione;
};

type RigaOverride = typeof overrideApplicabilita.$inferSelect;

function valuta(
  atto: AttoPerCalcolo & { aggiornatoIl: Date },
  cliente: ClienteConSettori,
  override: RigaOverride | undefined,
): Valutazione {
  const calcolata = calcolaApplicabilita(atto, {
    dipendenti: cliente.dipendenti,
    fatturato: cliente.fatturato,
    paesi: cliente.paesi,
    settori: cliente.settori.map((s) => s.id),
  });
  return {
    calcolata,
    effettiva: applicabilitaEffettiva(calcolata, override),
    override: override
      ? {
          esito: override.esito,
          motivazione: override.motivazione,
          autore: override.autore,
          decisoIl: override.creatoIl.toISOString(),
          criteriModificati: criteriModificatiDopo(override.creatoIl, atto.aggiornatoIl),
        }
      : null,
  };
}

export type ClienteSoggetto = { cliente: ClienteConSettori; valutazione: Valutazione };

// Clienti da mostrare nella scheda di un Atto: applicabili e da verificare (esito effettivo).
export async function clientiSoggetti(atto: {
  id: number;
  aggiornatoIl: Date;
  criteriSoglie: unknown;
  criteriTesto: string;
  tuttiISettori: boolean;
  settori: { id: number }[];
}): Promise<ClienteSoggetto[]> {
  const [clienti, override] = await Promise.all([
    elencoClienti(),
    db.select().from(overrideApplicabilita).where(eq(overrideApplicabilita.attoId, atto.id)),
  ]);
  const perCliente = new Map(override.map((o) => [o.clienteId, o]));
  const perCalcolo = { ...atto, settori: atto.settori.map((s) => s.id) };
  return clienti
    .map((cliente) => ({ cliente, valutazione: valuta(perCalcolo, cliente, perCliente.get(cliente.id)) }))
    .filter((r) => r.valutazione.effettiva !== "non_applicabile");
}

// Normative di ogni Cliente (Atti abrogati e non rilevanti esclusi), per il drawer dei Clienti.
export async function normativePerCliente(
  clienti: ClienteConSettori[],
): Promise<Record<number, NormaDelCliente[]>> {
  const [atti, settoriAtti, vigore, override] = await Promise.all([
    db
      .select()
      .from(attoNormativo)
      .where(and(ne(attoNormativo.stato, "abrogato"), eq(attoNormativo.nonRilevante, false)))
      .orderBy(asc(attoNormativo.titolo)),
    db.select().from(attoSettore),
    db
      .select({ attoId: statoStorico.attoId, data: statoStorico.data })
      .from(statoStorico)
      .where(eq(statoStorico.stato, "in_vigore"))
      .orderBy(asc(statoStorico.data)),
    db.select().from(overrideApplicabilita),
  ]);

  const settoriPerAtto = new Map<number, number[]>();
  for (const s of settoriAtti) {
    settoriPerAtto.set(s.attoId, [...(settoriPerAtto.get(s.attoId) ?? []), s.settoreId]);
  }
  // Storico ordinato per data: la prima volta "in vigore" è l'entrata in vigore.
  const entrataInVigore = new Map<number, string>();
  for (const v of vigore) if (!entrataInVigore.has(v.attoId)) entrataInVigore.set(v.attoId, v.data);
  const overridePerCoppia = new Map(override.map((o) => [`${o.clienteId}:${o.attoId}`, o]));

  const risultato: Record<number, NormaDelCliente[]> = {};
  for (const cliente of clienti) {
    risultato[cliente.id] = atti
      .filter((a) => attoCalcolabile(a))
      .map((a) => ({
        attoId: a.id,
        titolo: a.titolo,
        stato: a.stato,
        entrataInVigore: entrataInVigore.get(a.id) ?? null,
        recepimentoEntro: a.recepimentoEntro,
        criteriConfermati: a.criteriConfermati,
        valutazione: valuta(
          {
            criteriSoglie: a.criteriSoglie,
            criteriTesto: a.criteriTesto,
            tuttiISettori: a.tuttiISettori,
            settori: settoriPerAtto.get(a.id) ?? [],
            aggiornatoIl: a.aggiornatoIl,
          },
          cliente,
          overridePerCoppia.get(`${cliente.id}:${a.id}`),
        ),
      }));
  }
  return risultato;
}
