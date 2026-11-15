import { Suspense } from "react";
import Link from "next/link";
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
        <div className="flex gap-3 text-sm">
          <Link href={`/settori/${id}/modifica`} className="rounded border px-3 py-2 font-medium">
            Modifica
          </Link>
          <Link href={`/settori/${id}/elimina`} className="rounded border border-red-600 px-3 py-2 font-medium text-red-600">
            Elimina
          </Link>
        </div>
      </div>
      {settore.descrizione && <p className="mt-2 max-w-2xl">{settore.descrizione}</p>}

      <h2 className="mt-8 text-lg font-semibold">Normative che riguardano il Settore</h2>
      {atti.length === 0 ? (
        <p className="mt-2 text-sm opacity-70">Nessun Atto normativo collegato.</p>
      ) : (
        <ul className="mt-2 divide-y border-y">
          {atti.map((a) => (
            <li key={a.id} className="py-3">
              <span className="font-medium">{a.titolo}</span>
              <p className="mt-1 text-sm opacity-70">
                {etichettaGiurisdizione[a.giurisdizione]} ·{" "}
                {etichettaTipoAtto[a.tipo]} ·{" "}
                {etichettaStato[a.stato]}
                {a.tuttiISettori && " · tutti i Settori"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
