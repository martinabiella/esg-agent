import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { NormaDelCliente } from "@/db/applicabilita";
import { etichettaStato } from "@/lib/etichette";
import { OverrideDialog } from "@/app/override/override-dialog";
import { StatoApplicabilita } from "@/app/override/stato-applicabilita";
import type { stato } from "@/db/schema";

// Le date del database sono "AAAA-MM-GG": nessun fuso orario da applicare.
function dataIt(valore: string) {
  const [a, m, g] = valore.split("-");
  return `${g}/${m}/${a}`;
}

function Riga({
  norma,
  clienteId,
  ragioneSociale,
}: {
  norma: NormaDelCliente;
  clienteId: number;
  ragioneSociale: string;
}) {
  return (
    <li className="grid gap-2 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/normative/${norma.attoId}`} className="font-medium hover:underline">
          {norma.titolo}
        </Link>
        <Badge variant="outline">
          {etichettaStato[norma.stato as (typeof stato.enumValues)[number]]}
        </Badge>
      </div>
      {(norma.entrataInVigore || norma.recepimentoEntro) && (
        <p className="text-xs text-muted-foreground">
          {norma.entrataInVigore && `In vigore dal ${dataIt(norma.entrataInVigore)}`}
          {norma.entrataInVigore && norma.recepimentoEntro && " · "}
          {norma.recepimentoEntro && `Recepimento entro il ${dataIt(norma.recepimentoEntro)}`}
        </p>
      )}
      <div className="flex items-start justify-between gap-2">
        <StatoApplicabilita valutazione={norma.valutazione} provvisorio={!norma.criteriConfermati} />
        <OverrideDialog
          clienteId={clienteId}
          attoId={norma.attoId}
          cliente={ragioneSociale}
          atto={norma.titolo}
          valutazione={norma.valutazione}
        />
      </div>
    </li>
  );
}

// Normative del Cliente: applicabili e da verificare (o con una decisione manuale) in evidenza;
// le non applicabili restano raggiungibili, per poter decidere il contrario con un Override.
export function NormativeCliente({
  clienteId,
  ragioneSociale,
  normative,
}: {
  clienteId: number;
  ragioneSociale: string;
  normative: NormaDelCliente[];
}) {
  const inEvidenza = normative.filter(
    (n) => n.valutazione.effettiva !== "non_applicabile" || n.valutazione.override,
  );
  const altre = normative.filter((n) => !inEvidenza.includes(n));
  const riga = (n: NormaDelCliente) => (
    <Riga key={n.attoId} norma={n} clienteId={clienteId} ragioneSociale={ragioneSociale} />
  );

  return (
    <div>
      <dt className="text-sm font-medium">Normative</dt>
      <dd className="mt-2">
        {inEvidenza.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna Normativa applicabile.</p>
        ) : (
          <ul className="divide-y border-y">{inEvidenza.map(riga)}</ul>
        )}
        {altre.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Non applicabili ({altre.length})
            </summary>
            <ul className="mt-2 divide-y border-y">{altre.map(riga)}</ul>
          </details>
        )}
      </dd>
    </div>
  );
}
