import { Suspense } from "react";
import { Caricamento } from "@/app/caricamento";
import { FormReimposta } from "./form-reimposta";

export const metadata = { title: "Imposta password · Monitoraggio ESG" };

type Parametri = Promise<{ token?: string | string[] }>;

export default function PaginaReimposta({ searchParams }: { searchParams: Parametri }) {
  return (
    <div className="max-w-sm mx-auto mt-12">
      <h1 className="text-2xl font-semibold">Imposta la password</h1>
      <Suspense fallback={<Caricamento />}>
        <Modulo searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Modulo({ searchParams }: { searchParams: Parametri }) {
  const { token } = await searchParams;
  const valore = Array.isArray(token) ? token[0] : token;
  if (!valore) {
    return <p className="mt-6 text-sm">Link non valido o scaduto.</p>;
  }
  return <FormReimposta token={valore} />;
}
