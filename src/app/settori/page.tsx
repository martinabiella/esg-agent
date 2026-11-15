import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Caricamento } from "@/app/caricamento";
import { elencoSettori } from "@/db/settori";
import { Esito } from "./esito";
import { TabellaSettori } from "./tabella-settori";

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
  return <TabellaSettori settori={settori} />;
}
