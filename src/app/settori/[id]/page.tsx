import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Caricamento } from "@/app/caricamento";
import { attiDelSettore } from "@/db/atti";
import { trovaSettore } from "@/db/settori";
import { etichettaGiurisdizione, etichettaStato } from "@/lib/etichette";

export default function SchedaSettorePage(props: PageProps<"/settori/[id]">) {
  return (
    <div>
      <Link href="/settori" className="text-sm hover:underline">
        ← Tutti i Settori
      </Link>
      <Suspense fallback={<Caricamento />}>
        <Scheda params={props.params} />
      </Suspense>
    </div>
  );
}

async function Scheda({ params }: { params: Promise<{ id: string }> }) {
  const { id: idGrezzo } = await params;
  const id = Number(idGrezzo);
  // Oltre INT4_MAX Postgres darebbe errore: è comunque un id inesistente.
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) notFound();
  const settore = await trovaSettore(id);
  if (!settore) notFound();
  const atti = await attiDelSettore(id);

  return (
    <>
      <h1 className="mt-2 text-2xl font-semibold">{settore.nome}</h1>
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
