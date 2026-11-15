import { and, asc, desc, eq, exists, inArray, ne, or, type SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db } from "./index";
import type { CampiAtto } from "@/lib/atto";
import type { FiltriAtti } from "@/lib/filtri-atti";
import {
  attoNormativo,
  attoSettore,
  attoTema,
  notizia,
  notiziaAtto,
  relazioneAtti,
  settore,
  statoStorico,
  tema,
} from "./schema";

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

export async function elencoAtti(filtri: FiltriAtti) {
  const condizioni: (SQL | undefined)[] = [
    eq(attoNormativo.nonRilevante, false),
    filtri.stato ? eq(attoNormativo.stato, filtri.stato) : ne(attoNormativo.stato, "abrogato"),
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
  const atti = await db
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

  if (atti.length === 0) {
    return atti.map((atto) => ({ ...atto, temi: [], statoRecente: atto.stato }));
  }

  const ids = atti.map((atto) => atto.id);
  const [temi, storico] = await Promise.all([
    db
      .select({ attoId: attoTema.attoId, id: tema.id, nome: tema.nome })
      .from(attoTema)
      .innerJoin(tema, eq(tema.id, attoTema.temaId))
      .where(inArray(attoTema.attoId, ids))
      .orderBy(asc(tema.nome)),
    db
      .select({ attoId: statoStorico.attoId, stato: statoStorico.stato, data: statoStorico.data, id: statoStorico.id })
      .from(statoStorico)
      .where(inArray(statoStorico.attoId, ids))
      .orderBy(desc(statoStorico.data), desc(statoStorico.id)),
  ]);

  const temiPerAtto = new Map<number, { id: number; nome: string }[]>();
  for (const t of temi) {
    const elenco = temiPerAtto.get(t.attoId) ?? [];
    elenco.push({ id: t.id, nome: t.nome });
    temiPerAtto.set(t.attoId, elenco);
  }

  const statoRecentePerAtto = new Map<number, (typeof storico)[number]["stato"]>();
  for (const voce of storico) {
    if (!statoRecentePerAtto.has(voce.attoId)) {
      statoRecentePerAtto.set(voce.attoId, voce.stato);
    }
  }

  return atti.map((atto) => ({
    ...atto,
    temi: temiPerAtto.get(atto.id) ?? [],
    statoRecente: statoRecentePerAtto.get(atto.id) ?? atto.stato,
  }));
}

export function attiDelSettore(settoreId: number) {
  return elencoAtti({ settoreId });
}

export async function elencoTemi() {
  return db.select().from(tema).orderBy(asc(tema.nome));
}

// Tutti gli Atti per i selettori delle Relazioni, incluso chi è abrogato o non rilevante.
export async function elencoAttiPerRelazione(escludiId?: number) {
  return db
    .select({
      id: attoNormativo.id,
      titolo: attoNormativo.titolo,
      giurisdizione: attoNormativo.giurisdizione,
    })
    .from(attoNormativo)
    .where(escludiId === undefined ? undefined : ne(attoNormativo.id, escludiId))
    .orderBy(asc(attoNormativo.titolo));
}

export async function giurisdizioniAtti(ids: number[]) {
  if (ids.length === 0) return new Map<number, "ue" | "italia">();
  const righe = await db
    .select({ id: attoNormativo.id, giurisdizione: attoNormativo.giurisdizione })
    .from(attoNormativo)
    .where(inArray(attoNormativo.id, ids));
  return new Map(righe.map((r) => [r.id, r.giurisdizione] as const));
}

export async function trovaAtto(id: number) {
  const [atto] = await db.select().from(attoNormativo).where(eq(attoNormativo.id, id));
  if (!atto) return null;

  const [settori, temi, notizie, storico, relazioni] = await Promise.all([
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
    db
      .select({
        tipo: relazioneAtti.tipo,
        attoId: relazioneAtti.aAttoId,
        titolo: attoNormativo.titolo,
        giurisdizione: attoNormativo.giurisdizione,
      })
      .from(relazioneAtti)
      .innerJoin(attoNormativo, eq(attoNormativo.id, relazioneAtti.aAttoId))
      .where(eq(relazioneAtti.daAttoId, id))
      .orderBy(asc(attoNormativo.titolo)),
  ]);
  return { ...atto, settori, temi, notizie, storico, relazioni };
}

// ---- Scritture ----
// Neon HTTP non supporta transazioni interattive. Le scritture usano una singola
// istruzione SQL con CTE: Atto e tutti i collegamenti riescono o falliscono insieme.
const VIOLAZIONE_UNICITA = "23505";
const VIOLAZIONE_CHIAVE_ESTERNA = "23503";

function codiceErrore(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
}

function elencoSql<T>(valori: readonly T[], tipo: string) {
  if (valori.length === 0) return sql`ARRAY[]::${sql.raw(tipo)}`;
  return sql`ARRAY[${sql.join(valori.map((v) => sql`${v}`), sql`, `)}]::${sql.raw(tipo)}`;
}

function relazioniValues(valori: CampiAtto["relazioni"]) {
  if (valori.length === 0) return sql`SELECT id, NULL::integer, NULL::tipo_relazione FROM nuovo WHERE false`;
  return sql`SELECT nuovo.id, righe.atto_id, righe.tipo
    FROM nuovo CROSS JOIN (VALUES ${sql.join(
      valori.map((r) => sql`(${r.attoId}, ${r.tipo}::tipo_relazione)`),
      sql`, `,
    )}) AS righe(atto_id, tipo)`;
}

function relazioniDaConservare(valori: CampiAtto["relazioni"]) {
  if (valori.length === 0) return sql`false`;
  return sql`NOT EXISTS (SELECT 1 FROM (VALUES ${sql.join(
    valori.map((r) => sql`(${r.attoId}, ${r.tipo}::tipo_relazione)`),
    sql`, `,
  )}) AS righe(atto_id, tipo)
    WHERE righe.atto_id = relazione_atti.a_atto_id AND righe.tipo = relazione_atti.tipo)`;
}

function datiAtto(valori: CampiAtto) {
  return sql`
    ${valori.titolo}, ${valori.identificativoUfficiale}, ${valori.giurisdizione}::giurisdizione,
    ${valori.tipo}::tipo_atto, ${valori.stato}::stato, ${valori.summary}, ${valori.urlTesto},
    ${valori.criteriSoglie ? JSON.stringify(valori.criteriSoglie) : null}::jsonb,
    ${valori.criteriTesto}, true, ${valori.tuttiISettori}, ${valori.nonRilevante},
    'persona'::provenienza, now()`;
}

export type EsitoScritturaAtto =
  | { ok: true; id: number }
  | { ok: false; motivo: "identificativo_duplicato"; duplicatoId: number | null }
  | { ok: false; motivo: "non_trovato" | "collegamento_inesistente" };

export async function creaAtto(valori: CampiAtto): Promise<EsitoScritturaAtto> {
  const nuoviTemi = valori.nuovoTema;
  try {
    const risultato = await db.execute<{ id: number }>(sql`
      WITH tema_nuovo AS (
        INSERT INTO tema (nome)
        SELECT ${nuoviTemi}::text WHERE ${nuoviTemi !== null}
        ON CONFLICT DO NOTHING
        RETURNING id
      ), temi_scelti AS (
        SELECT id FROM tema
        WHERE id = ANY(${elencoSql(valori.temi, "int[]")})
          OR id IN (SELECT id FROM tema_nuovo)
          OR (${nuoviTemi}::text IS NOT NULL AND lower(nome) = lower(${nuoviTemi}::text))
      ), nuovo AS (
        INSERT INTO atto_normativo
          (titolo, identificativo_ufficiale, giurisdizione, tipo, stato, summary, url_testo,
           criteri_soglie, criteri_testo, criteri_confermati, tutti_i_settori, non_rilevante,
           provenienza_contenuti, aggiornato_il)
        VALUES (${datiAtto(valori)})
        RETURNING id
      ), inserisci_settori AS (
        INSERT INTO atto_settore (atto_id, settore_id)
        SELECT nuovo.id, unnest(${elencoSql(valori.settori, "int[]")}) FROM nuovo
      ), inserisci_temi AS (
        INSERT INTO atto_tema (atto_id, tema_id)
        SELECT nuovo.id, temi_scelti.id FROM nuovo CROSS JOIN temi_scelti
      ), inserisci_storico AS (
        INSERT INTO stato_storico (atto_id, stato, data)
        SELECT id, ${valori.stato}::stato, ${valori.dataStato}::date FROM nuovo
      ), inserisci_relazioni AS (
        INSERT INTO relazione_atti (da_atto_id, a_atto_id, tipo)
        ${relazioniValues(valori.relazioni)}
      )
      SELECT id FROM nuovo`);
    return { ok: true, id: risultato.rows[0].id };
  } catch (e) {
    const codice = codiceErrore(e);
    if (codice === VIOLAZIONE_UNICITA) {
      const [duplicato] = valori.identificativoUfficiale
        ? await db.select({ id: attoNormativo.id }).from(attoNormativo).where(eq(attoNormativo.identificativoUfficiale, valori.identificativoUfficiale))
        : [];
      return { ok: false, motivo: "identificativo_duplicato", duplicatoId: duplicato?.id ?? null };
    }
    if (codice === VIOLAZIONE_CHIAVE_ESTERNA) return { ok: false, motivo: "collegamento_inesistente" };
    throw e;
  }
}

export async function aggiornaAtto(id: number, valori: CampiAtto): Promise<EsitoScritturaAtto> {
  const nuoviTemi = valori.nuovoTema;
  try {
    const risultato = await db.execute<{ id: number }>(sql`
      WITH precedente AS (
        SELECT id, stato FROM atto_normativo WHERE id = ${id}
      ), tema_nuovo AS (
        INSERT INTO tema (nome)
        SELECT ${nuoviTemi}::text
        WHERE ${nuoviTemi !== null} AND EXISTS (SELECT 1 FROM precedente)
        ON CONFLICT DO NOTHING
        RETURNING id
      ), temi_scelti AS (
        SELECT id FROM tema
        WHERE id = ANY(${elencoSql(valori.temi, "int[]")})
          OR id IN (SELECT id FROM tema_nuovo)
          OR (${nuoviTemi}::text IS NOT NULL AND lower(nome) = lower(${nuoviTemi}::text))
      ), aggiornato AS (
        UPDATE atto_normativo AS atto
        SET titolo = ${valori.titolo}, identificativo_ufficiale = ${valori.identificativoUfficiale},
            giurisdizione = ${valori.giurisdizione}::giurisdizione, tipo = ${valori.tipo}::tipo_atto,
            stato = ${valori.stato}::stato, summary = ${valori.summary}, url_testo = ${valori.urlTesto},
            criteri_soglie = ${valori.criteriSoglie ? JSON.stringify(valori.criteriSoglie) : null}::jsonb,
            criteri_testo = ${valori.criteriTesto}, criteri_confermati = true,
            tutti_i_settori = ${valori.tuttiISettori}, non_rilevante = ${valori.nonRilevante},
            provenienza_contenuti = 'persona'::provenienza, aggiornato_il = now()
        FROM precedente
        WHERE atto.id = precedente.id
        RETURNING atto.id, atto.stato, precedente.stato AS stato_precedente
      ), elimina_settori AS (
        DELETE FROM atto_settore
        WHERE atto_id = ${id} AND settore_id <> ALL(${elencoSql(valori.settori, "int[]")})
        RETURNING settore_id
      ), inserisci_settori AS (
        INSERT INTO atto_settore (atto_id, settore_id)
        SELECT ${id}, unnest(${elencoSql(valori.settori, "int[]")})
        ON CONFLICT DO NOTHING
      ), elimina_temi AS (
        DELETE FROM atto_tema
        WHERE atto_id = ${id}
          AND NOT EXISTS (SELECT 1 FROM temi_scelti WHERE temi_scelti.id = atto_tema.tema_id)
        RETURNING tema_id
      ), inserisci_temi AS (
        INSERT INTO atto_tema (atto_id, tema_id)
        SELECT ${id}, id FROM temi_scelti
        ON CONFLICT DO NOTHING
      ), elimina_relazioni AS (
        DELETE FROM relazione_atti
        WHERE da_atto_id = ${id} AND ${relazioniDaConservare(valori.relazioni)}
        RETURNING a_atto_id
      ), inserisci_relazioni AS (
        INSERT INTO relazione_atti (da_atto_id, a_atto_id, tipo)
        SELECT ${id}, righe.atto_id, righe.tipo
        FROM (VALUES ${valori.relazioni.length ? sql.join(
          valori.relazioni.map((r) => sql`(${r.attoId}, ${r.tipo}::tipo_relazione)`),
          sql`, `,
        ) : sql`(NULL::integer, NULL::tipo_relazione)`}) AS righe(atto_id, tipo)
        WHERE righe.atto_id IS NOT NULL
        ON CONFLICT DO NOTHING
      ), inserisci_storico AS (
        INSERT INTO stato_storico (atto_id, stato, data)
        SELECT id, stato, ${valori.dataStato}::date FROM aggiornato
        WHERE stato <> stato_precedente
      )
      SELECT id FROM aggiornato`);
    if (risultato.rows.length === 0) return { ok: false, motivo: "non_trovato" };
    return { ok: true, id };
  } catch (e) {
    const codice = codiceErrore(e);
    if (codice === VIOLAZIONE_UNICITA) {
      const [duplicato] = valori.identificativoUfficiale
        ? await db.select({ id: attoNormativo.id }).from(attoNormativo).where(eq(attoNormativo.identificativoUfficiale, valori.identificativoUfficiale))
        : [];
      return { ok: false, motivo: "identificativo_duplicato", duplicatoId: duplicato?.id ?? null };
    }
    if (codice === VIOLAZIONE_CHIAVE_ESTERNA) return { ok: false, motivo: "collegamento_inesistente" };
    throw e;
  }
}

export async function eliminaAtto(id: number): Promise<EsitoScritturaAtto> {
  const righe = await db
    .delete(attoNormativo)
    .where(eq(attoNormativo.id, id))
    .returning({ id: attoNormativo.id });
  return righe.length ? { ok: true, id } : { ok: false, motivo: "non_trovato" };
}
