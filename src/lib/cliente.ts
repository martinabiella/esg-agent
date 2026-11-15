// Vocabolario: vedi GLOSSARY.md

// Id da URL: oltre INT4_MAX Postgres darebbe errore, ed è comunque un id
// inesistente.
export function idCliente(grezzo: unknown): number | null {
  if (typeof grezzo !== "string" || !/^\d+$/.test(grezzo)) return null;
  const id = Number(grezzo);
  return id >= 1 && id <= 2147483647 ? id : null;
}

// Numeric di Postgres arriva come stringa. La formattazione manuale mantiene
// tutte le cifre, anche quando l'importo supera la precisione di un Number.
export function formattaFatturato(fatturato: string): string {
  const parti = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(fatturato.trim());
  if (!parti) return fatturato;

  const segno = parti[1] === "-" ? "-" : "";
  const intero = parti[2].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimali = parti[3] ? `,${parti[3]}` : "";
  return `${segno}${intero}${decimali} €`;
}
