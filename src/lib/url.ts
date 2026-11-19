// URL assoluto http o https, senza spazi. Condiviso dalle validazioni di
// Notizie e Fonti.
export function urlHttpValido(testo: string): boolean {
  if (/\s/.test(testo)) return false;
  try {
    const url = new URL(testo);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch {
    return false;
  }
}
