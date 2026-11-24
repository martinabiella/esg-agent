import { Suspense } from "react";
import { Caricamento } from "@/app/caricamento";
import { elencoFonti, trovaFonte } from "@/db/fonti";
import { ultimaEsecuzione } from "@/db/ricerche";
import { esitoEsecuzione } from "@/lib/esecuzione";
import { fonteIdDaParams } from "@/lib/fonte";
import { AvviaRicerca } from "./avvia-ricerca";
import { TabellaFonti } from "./tabella-fonti";

export const metadata = { title: "Fonti · Monitoraggio ESG" };

export default function FontiPage(props: PageProps<"/fonti">) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Fonti</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        I siti che l&apos;agente controlla a ogni Ricerca. Solo le Fonti ufficiali possono
        cambiare lo Stato degli Atti.
      </p>
      <Suspense fallback={<Caricamento />}>
        <Contenuto searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Contenuto({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = fonteIdDaParams(await searchParams);
  const [fonti, fonteAperta, ultima] = await Promise.all([
    elencoFonti(),
    id === null ? Promise.resolve(null) : trovaFonte(id),
    ultimaEsecuzione(),
  ]);

  return (
    <>
      <AvviaRicerca ultima={ultima && esitoEsecuzione(ultima, new Date())} />
      <TabellaFonti fonti={fonti} fonteAperta={fonteAperta} />
    </>
  );
}
