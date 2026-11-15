import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Caricamento } from "@/app/caricamento";
import { attiDelSettore } from "@/db/atti";
import { settoreDaParams } from "../trova-da-params";
import { Esito } from "../esito";
import {
  etichettaGiurisdizione,
  etichettaStato,
  etichettaTipoAtto,
} from "@/lib/etichette";

export default function SchedaSettorePage(props: PageProps<"/settori/[id]">) {
  return (
    <div>
      <Link href="/settori" className="text-sm hover:underline">
        ← Tutti i Settori
      </Link>
      <Suspense fallback={<Caricamento />}>
        <Scheda params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Scheda({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const settore = await settoreDaParams(params);
  const id = settore.id;
  const atti = await attiDelSettore(id);

  return (
    <>
      <Esito esito={(await searchParams).esito} />
      <div className="mt-2 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{settore.nome}</h1>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href={`/settori/${id}/modifica`} />}>
            Modifica
          </Button>
          <Button variant="destructive" render={<Link href={`/settori/${id}/elimina`} />}>
            Elimina
          </Button>
        </div>
      </div>
      {settore.descrizione && <p className="mt-2 max-w-2xl text-muted-foreground">{settore.descrizione}</p>}

      <h2 className="mt-8 text-lg font-semibold">Normative che riguardano il Settore</h2>
      {atti.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nessun Atto normativo collegato.</p>
      ) : (
        <ul className="mt-2 divide-y border-y">
          {atti.map((a) => (
            <li key={a.id} className="py-3">
              <span className="font-medium">{a.titolo}</span>
              <p className="mt-1 text-sm opacity-70">
                <Badge variant="secondary">{etichettaGiurisdizione[a.giurisdizione]}</Badge>{" "}
                <Badge variant="outline">{etichettaTipoAtto[a.tipo]}</Badge>{" "}
                <Badge>{etichettaStato[a.stato]}</Badge>
                {a.tuttiISettori && " · tutti i Settori"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
