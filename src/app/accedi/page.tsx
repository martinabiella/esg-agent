import { Suspense } from "react";
import { Caricamento } from "@/app/caricamento";
import { percorsoInterno } from "@/lib/redirect-sicuro";
import { FormAccesso } from "./form-accesso";

export const metadata = { title: "Accedi · Monitoraggio ESG" };

export default function PaginaAccesso({
  searchParams,
}: {
  searchParams: Promise<{ dopo?: string | string[] }>;
}) {
  return (
    <div className="max-w-sm mx-auto mt-12">
      <h1 className="text-2xl font-semibold">Accedi</h1>
      <Suspense fallback={<Caricamento />}>
        <Modulo searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Modulo({
  searchParams,
}: {
  searchParams: Promise<{ dopo?: string | string[] }>;
}) {
  const { dopo } = await searchParams;
  return <FormAccesso dopo={percorsoInterno(Array.isArray(dopo) ? dopo[0] : dopo)} />;
}
