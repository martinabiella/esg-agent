// Paesi come codici ISO 3166-1 alpha-2. I nomi in italiano vengono da
// Intl.DisplayNames, non sono scritti a mano.

export const CODICI_PAESI = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR",
  "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE",
  "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ",
  "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD",
  "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR",
  "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM",
  "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI",
  "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
  "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS",
  "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU",
  "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT",
  "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN",
  "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK",
  "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME",
  "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ",
  "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
  "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU",
  "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM",
  "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS",
  "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI",
  "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV",
  "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK",
  "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA",
  "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
] as const;

export type CodicePaese = (typeof CODICI_PAESI)[number];

// I 27 Stati membri dell'UE: scorciatoia per i moduli.
export const CODICI_UE: readonly CodicePaese[] = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
];

const nomi = new Intl.DisplayNames(["it"], { type: "region" });
const validi: ReadonlySet<string> = new Set(CODICI_PAESI);

export function paeseValido(codice: string): codice is CodicePaese {
  return validi.has(codice);
}

export function nomePaese(codice: string): string | undefined {
  return paeseValido(codice) ? nomi.of(codice) : undefined;
}

// Tutti i paesi con nome italiano, ordinati per nome (per i menu dei moduli).
export function elencoPaesi(): { codice: CodicePaese; nome: string }[] {
  return CODICI_PAESI.map((codice) => ({ codice, nome: nomi.of(codice) ?? codice })).sort(
    (a, b) => a.nome.localeCompare(b.nome, "it"),
  );
}

export type EsitoPaesi = { ok: true } | { ok: false; nonValidi: string[] };

// Non scarta in silenzio: restituisce i valori non validi.
export function validaPaesi(codici: readonly string[]): EsitoPaesi {
  const nonValidi = codici.filter((c) => !paeseValido(c));
  return nonValidi.length === 0 ? { ok: true } : { ok: false, nonValidi };
}
