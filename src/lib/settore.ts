// Validazione dei campi del Settore, condivisa tra form e azioni server.
// Vocabolario: vedi GLOSSARY.md

export type CampiSettore = { nome: string; descrizione: string };

export type EsitoSettore =
  | { ok: true; valori: CampiSettore }
  | {
      ok: false;
      errori: { nome?: string };
      // Quanto digitato, così il modulo non lo perde.
      valori: CampiSettore;
    };

export function validaSettore(input: {
  nome?: string | null;
  descrizione?: string | null;
}): EsitoSettore {
  const grezzi = { nome: input.nome ?? "", descrizione: input.descrizione ?? "" };
  const valori = { nome: grezzi.nome.trim(), descrizione: grezzi.descrizione.trim() };
  if (!valori.nome) {
    return { ok: false, errori: { nome: "Il nome è obbligatorio." }, valori: grezzi };
  }
  return { ok: true, valori };
}

export type EsitoEliminazione =
  | { consentita: true; avviso: string | null }
  | { consentita: false; messaggio: string };

// Clienti: l'eliminazione è bloccata. Atti: il collegamento cade a cascata,
// quindi la conferma deve dire quanti ne sono toccati.
export function valutaEliminazione(usi: {
  clienti: number;
  atti: number;
}): EsitoEliminazione {
  if (usi.clienti > 0) {
    const c = usi.clienti === 1 ? "1 Cliente" : `${usi.clienti} Clienti`;
    return {
      consentita: false,
      messaggio: `Il Settore è usato da ${c}: non può essere eliminato.`,
    };
  }
  if (usi.atti > 0) {
    const a =
      usi.atti === 1
        ? "1 Atto perderà"
        : `${usi.atti} Atti perderanno`;
    return {
      consentita: true,
      avviso: `${a} il collegamento con questo Settore.`,
    };
  }
  return { consentita: true, avviso: null };
}

// Id da URL o form: oltre INT4_MAX Postgres darebbe errore, ed è comunque
// un id inesistente.
export function idSettore(grezzo: unknown): number | null {
  if (typeof grezzo !== "string" || !/^\d+$/.test(grezzo)) return null;
  const id = Number(grezzo);
  return id >= 1 && id <= 2147483647 ? id : null;
}
