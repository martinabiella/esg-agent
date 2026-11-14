import type { giurisdizione, stato } from "@/db/schema";
import type { TipoAtto } from "./tipi-atto";
export const etichettaGiurisdizione: Record<
  (typeof giurisdizione.enumValues)[number],
  string
> = {
  ue: "UE",
  italia: "Italia",
};

export const etichettaStato: Record<
  (typeof stato.enumValues)[number],
  string
> = {
  proposta: "Proposta",
  in_discussione: "In discussione",
  approvato: "Approvato",
  in_vigore: "In vigore",
  modificato: "Modificato",
  abrogato: "Abrogato",
};

export const etichettaTipoAtto: Record<TipoAtto, string> = {
  regolamento: "Regolamento",
  direttiva: "Direttiva",
  decisione: "Decisione",
  legge: "Legge",
  decreto_legislativo: "Decreto legislativo",
  decreto: "Decreto",
  disegno_di_legge: "Disegno di legge",
  altro: "Altro",
};
