import { createNeonAuth } from "@neon/auth/next/server";
import { richiediUtente } from "./utente-richiesto";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

/**
 * Punto unico per le scritture (azioni server e rotte API): restituisce
 * l'utente corrente o lancia NonAutenticatoError.
 */
export function utenteRichiesto() {
  return richiediUtente(() => auth.getSession());
}
