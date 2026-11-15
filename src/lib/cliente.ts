// Vocabolario: vedi GLOSSARY.md

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
