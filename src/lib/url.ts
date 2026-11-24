// URL assoluto http o https, senza spazi. Condiviso dalle validazioni di
// Notizie e Fonti.
export function urlHttpValido(testo: string): boolean {
  if (!/^https?:\/\/[^/?#]/i.test(testo) || /[\s\\]/.test(testo)) return false;
  try {
    const url = new URL(testo);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch {
    return false;
  }
}

// Parametri che dicono da dove arriva il lettore, non di quale Notizia si tratta.
const PARAMETRI_TRACKING = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "yclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "_hsenc",
  "_hsmi",
  "mkt_tok",
  "_ga",
  "_gl",
]);

function parametroTracking(coppia: string): boolean {
  const nome = coppia.split("=")[0].toLowerCase();
  return nome.startsWith("utm_") || PARAMETRI_TRACKING.has(nome);
}

// URL con cui si riconoscono le Notizie duplicate (vincolo unique su
// notizia.url): senza parametri di tracking né frammento. Il resto della query
// resta com'è, con la codifica originale. Non è chiaveUrl delle Fonti: nei path
// delle Notizie le maiuscole possono contare. Va chiamata su URL già validati
// con urlHttpValido.
export function normalizzaUrlNotizia(testo: string): string {
  const url = new URL(testo.trim());
  url.hash = "";
  const parametri = url.search.slice(1).split("&").filter((c) => c !== "" && !parametroTracking(c));
  url.search = parametri.length > 0 ? `?${parametri.join("&")}` : "";
  return url.href;
}
