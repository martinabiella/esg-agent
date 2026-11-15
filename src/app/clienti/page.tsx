import { Suspense } from "react";
import { Caricamento } from "@/app/caricamento";
import { elencoClienti } from "@/db/clienti";
import { elencoSettori } from "@/db/settori";
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
  const [clienti, settori] = await Promise.all([elencoClienti(), elencoSettori()]);
  return (
    <TabellaClienti
      clienti={clienti}
      settori={settori.map((s) => ({ id: s.id, nome: s.nome }))}
    />
  );
}
