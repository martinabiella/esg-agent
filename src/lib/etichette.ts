import type { giurisdizione, stato } from "@/db/schema";

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
