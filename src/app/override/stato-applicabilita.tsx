import { Badge } from "@/components/ui/badge";
import type { Valutazione } from "@/db/applicabilita";
import { etichettaApplicabilita } from "@/lib/etichette";

function dataIt(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT");
}

// Esito effettivo di una coppia Cliente–Atto. Con un Override mostra anche cosa diceva il calcolo,
// chi ha deciso e perché; "provvisorio" finché i Criteri dell'Atto non sono confermati.
export function StatoApplicabilita({
  valutazione,
  provvisorio,
}: {
  valutazione: Valutazione;
  provvisorio: boolean;
}) {
  const { effettiva, calcolata, override } = valutazione;
  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <div className="flex flex-wrap items-center justify-end gap-1">
        <Badge variant={effettiva === "applicabile" ? "default" : "secondary"}>
          {etichettaApplicabilita[effettiva]}
          {!override && provvisorio && " (provvisorio)"}
        </Badge>
        {override && <Badge variant="outline">Deciso da una persona</Badge>}
      </div>
      {override && (
        <>
          <p className="text-xs text-muted-foreground">
            Calcolato: {etichettaApplicabilita[calcolata]} · {override.autore}, {dataIt(override.decisoIl)}
          </p>
          <p className="max-w-xs whitespace-pre-line text-xs text-muted-foreground">
            {override.motivazione}
          </p>
          {override.criteriModificati && (
            <p className="text-xs font-medium text-amber-700">
              Criteri modificati dopo la decisione: ricontrolla.
            </p>
          )}
        </>
      )}
    </div>
  );
}
