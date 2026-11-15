import { Suspense } from "react";
import { Caricamento } from "@/app/caricamento";
import { elencoClienti } from "@/db/clienti";
import { TabellaClienti } from "./tabella-clienti";

export const metadata = { title: "Clienti · Monitoraggio ESG" };

export default function ClientiPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Clienti</h1>
      <Suspense fallback={<Caricamento />}>
        <Elenco />
      </Suspense>
    </div>
  );
}

async function Elenco() {
  const clienti = await elencoClienti();
  if (clienti.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">Nessun Cliente presente.</p>;
  }

  return <TabellaClienti clienti={clienti} />;
}
