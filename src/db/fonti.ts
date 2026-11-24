import { and, asc, count, desc, eq, isNotNull, ne, or, sql } from "drizzle-orm";
import { db } from "./index";
import {
  type CampiFonte,
  type ControlloFonte,
  type TipoFonte,
  type UltimaRicerca,
  chiaveNome,
  chiaveUrl,
  controlloFonte,
} from "@/lib/fonte";
import { attoNormativo, chiaveNomeFonte, chiaveUrlFonte, esecuzioneRicerca, fonte } from "./schema";

export type FonteElenco = {
  id: number;
  nome: string;
  url: string;
  tipo: TipoFonte;
  controllo: ControlloFonte;
};

// Per il drawer: anche quanti Atti hanno questa Fonte come origine.
export type FonteDettaglio = FonteElenco & { attiScoperti: number };

// Per ogni Fonte, l'ultima Ricerca conclusa (quelle in corso non contano). Il
// confronto con il cambio di URL lo fa controlloFonte.
function ultimeRicerche() {
  return db
    .selectDistinctOn([esecuzioneRicerca.fonteId], {
      fonteId: esecuzioneRicerca.fonteId,
      esito: esecuzioneRicerca.esito,
      avviataIl: esecuzioneRicerca.avviataIl,
      errore: esecuzioneRicerca.errore,
    })
    .from(esecuzioneRicerca)
    .where(and(isNotNull(esecuzioneRicerca.fonteId), ne(esecuzioneRicerca.esito, "in_corso")))
    .orderBy(esecuzioneRicerca.fonteId, desc(esecuzioneRicerca.avviataIl), desc(esecuzioneRicerca.id))
    .as("ultima_ricerca");
}

function selezioneFonti() {
  const ultima = ultimeRicerche();
  return db
    .select({
      id: fonte.id,
      nome: fonte.nome,
      url: fonte.url,
      tipo: fonte.tipo,
      urlModificatoIl: fonte.urlModificatoIl,
      esito: ultima.esito,
      avviataIl: ultima.avviataIl,
      errore: ultima.errore,
    })
    .from(fonte)
    .leftJoin(ultima, eq(ultima.fonteId, fonte.id))
    .$dynamic();
}

type RigaFonte = Awaited<ReturnType<typeof selezioneFonti>>[number];

function fonteElenco(r: RigaFonte): FonteElenco {
  const ultima: UltimaRicerca | null =
    r.esito && r.esito !== "in_corso" && r.avviataIl
      ? { esito: r.esito, avviataIl: r.avviataIl, errore: r.errore }
      : null;
  return {
    id: r.id,
    nome: r.nome,
    url: r.url,
    tipo: r.tipo,
    controllo: controlloFonte(r.urlModificatoIl, ultima),
  };
}

// Prima le ufficiali, poi le editoriali (ordine dell'enum), poi per nome.
export async function elencoFonti(): Promise<FonteElenco[]> {
  const righe = await selezioneFonti().orderBy(
    asc(fonte.tipo),
    asc(chiaveNomeFonte(fonte.nome)),
    asc(fonte.id),
  );
  return righe.map(fonteElenco);
}

export async function trovaFonte(id: number): Promise<FonteDettaglio | null> {
  const [[riga], [atti]] = await Promise.all([
    selezioneFonti().where(eq(fonte.id, id)),
    db.select({ n: count() }).from(attoNormativo).where(eq(attoNormativo.fonteId, id)),
  ]);
  return riga ? { ...fonteElenco(riga), attiScoperti: atti.n } : null;
}

// ---- Scritture ----

const VIOLAZIONE_UNICITA = "23505";

function codiceErrore(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
}

export type FonteEsistente = { id: number; nome: string };

// URL o nome già usati (senza distinguere maiuscole né barra finale): le Fonti
// che li hanno, per rimandarci dal modulo.
export type ConflittiFonte = { url?: FonteEsistente; nome?: FonteEsistente };

export type EsitoScritturaFonte =
  | { ok: true; id: number }
  | { ok: false; motivo: "non_trovata" }
  | { ok: false; motivo: "duplicata"; conflitti: ConflittiFonte };

async function duplicata(valori: CampiFonte, esclusa?: number): Promise<EsitoScritturaFonte> {
  const url = chiaveUrl(valori.url);
  const nome = chiaveNome(valori.nome);
  const righe = await db
    .select({ id: fonte.id, nome: fonte.nome, url: fonte.url })
    .from(fonte)
    .where(
      and(
        or(eq(chiaveUrlFonte(fonte.url), url), eq(chiaveNomeFonte(fonte.nome), nome)),
        esclusa === undefined ? undefined : ne(fonte.id, esclusa),
      ),
    );
  const conUrl = righe.find((r) => chiaveUrl(r.url) === url);
  const conNome = righe.find((r) => chiaveNome(r.nome) === nome);
  return {
    ok: false,
    motivo: "duplicata",
    conflitti: {
      url: conUrl && { id: conUrl.id, nome: conUrl.nome },
      nome: conNome && { id: conNome.id, nome: conNome.nome },
    },
  };
}

export async function creaFonte(valori: CampiFonte): Promise<EsitoScritturaFonte> {
  try {
    const [riga] = await db.insert(fonte).values(valori).returning({ id: fonte.id });
    return { ok: true, id: riga.id };
  } catch (e) {
    if (codiceErrore(e) === VIOLAZIONE_UNICITA) return duplicata(valori);
    throw e;
  }
}

// Se cambia l'URL salvato, la Fonte riparte da "mai controllata". La chiave di
// unicità ignora maiuscole e barra finale, ma nel percorso possono contare.
// Il cambio di tipo vale dalla prossima Ricerca.
export async function aggiornaFonte(id: number, valori: CampiFonte): Promise<EsitoScritturaFonte> {
  try {
    const righe = await db
      .update(fonte)
      .set({
        nome: valori.nome,
        url: valori.url,
        tipo: valori.tipo,
        urlModificatoIl: sql`CASE WHEN ${fonte.url} = ${valori.url}
          THEN ${fonte.urlModificatoIl} ELSE now() END`,
      })
      .where(eq(fonte.id, id))
      .returning({ id: fonte.id });
    return righe.length > 0 ? { ok: true, id } : { ok: false, motivo: "non_trovata" };
  } catch (e) {
    if (codiceErrore(e) === VIOLAZIONE_UNICITA) return duplicata(valori, id);
    throw e;
  }
}

// Gli Atti con questa origine restano, con fonte_id null; le Ricerche restano
// come storico senza Fonte (chiavi esterne "set null"). Le Notizie non hanno
// legami con le Fonti.
export async function eliminaFonte(id: number): Promise<EsitoScritturaFonte> {
  const righe = await db.delete(fonte).where(eq(fonte.id, id)).returning({ id: fonte.id });
  return righe.length > 0 ? { ok: true, id } : { ok: false, motivo: "non_trovata" };
}
