export type Utente = { id: string; email: string; name?: string | null };

export class NonAutenticatoError extends Error {
  constructor() {
    super("Non autenticato");
    this.name = "NonAutenticatoError";
  }
}

type LeggiSessione = () => Promise<{
  data: { user?: Utente | null } | null;
}>;

/**
 * Restituisce l'utente della sessione corrente o lancia NonAutenticatoError.
 * La lettura della sessione è iniettata per poterla testare senza rete.
 */
export async function richiediUtente(
  leggiSessione: LeggiSessione,
): Promise<Utente> {
  let utente: Utente | null | undefined;
  try {
    utente = (await leggiSessione()).data?.user;
  } catch {
    throw new NonAutenticatoError();
  }
  if (!utente) throw new NonAutenticatoError();
  return utente;
}
