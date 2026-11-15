import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="mx-auto mt-12 max-w-sm">
      <CardHeader>
        <CardTitle>Accedi</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Caricamento />}>
          <Modulo searchParams={searchParams} />
        </Suspense>
      </CardContent>
    </Card>
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
