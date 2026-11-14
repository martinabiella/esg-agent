import { Suspense } from "react";
import Link from "next/link";
import { Caricamento } from "@/app/caricamento";
import { elencoSettori } from "@/db/settori";

export const metadata = { title: "Settori · Monitoraggio ESG" };

export default function SettoriPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Settori</h1>
      <Suspense fallback={<Caricamento />}>
        <Elenco />
      </Suspense>
    </div>
  );
}

async function Elenco() {
  const settori = await elencoSettori();
  if (settori.length === 0) {
    return <p className="mt-4 text-sm opacity-70">Nessun Settore presente.</p>;
  }
  return (
    <ul className="mt-4 divide-y border-y">
      {settori.map((s) => (
        <li key={s.id} className="py-3">
          <Link href={`/settori/${s.id}`} className="font-medium hover:underline">
            {s.nome}
          </Link>
          {s.descrizione && (
            <p className="mt-1 text-sm opacity-70">{s.descrizione}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
