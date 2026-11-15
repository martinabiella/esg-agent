// Id da URL, query string o form: oltre INT4_MAX Postgres darebbe errore, ed è
// comunque un id inesistente.
export function idIntero(grezzo: unknown): number | null {
  if (typeof grezzo !== "string" || !/^\d+$/.test(grezzo)) return null;
  const id = Number(grezzo);
  return id >= 1 && id <= 2147483647 ? id : null;
}
