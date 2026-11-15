import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Caricamento } from "@/app/caricamento";
import { elencoSettori } from "@/db/settori";
import { Esito } from "./esito";

export const metadata = { title: "Settori · Monitoraggio ESG" };

export default function SettoriPage(props: PageProps<"/settori">) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settori</h1>
        <Button render={<Link href="/settori/nuovo" />}>Nuovo Settore</Button>
      </div>
      <Suspense>
        <EsitoDaIndirizzo searchParams={props.searchParams} />
      </Suspense>
      <Suspense fallback={<Caricamento />}>
        <Elenco />
      </Suspense>
    </div>
  );
}

async function EsitoDaIndirizzo({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <Esito esito={(await searchParams).esito} />;
}

async function Elenco() {
  const settori = await elencoSettori();
  if (settori.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">Nessun Settore presente.</p>;
  }
  return (
    <ul className="mt-4 divide-y border-y">
      {settori.map((s) => (
        <li key={s.id} className="py-3">
          <Link href={`/settori/${s.id}`} className="font-medium hover:underline">
            {s.nome}
          </Link>
          {s.descrizione && (
            <p className="mt-1 text-sm text-muted-foreground">{s.descrizione}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
