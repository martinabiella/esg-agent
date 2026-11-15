import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Caricamento } from "@/app/caricamento";
import { FormReimposta } from "./form-reimposta";

export const metadata = { title: "Imposta password · Monitoraggio ESG" };

type Parametri = Promise<{ token?: string | string[] }>;

export default function PaginaReimposta({ searchParams }: { searchParams: Parametri }) {
  return (
    <Card className="mx-auto mt-12 max-w-sm">
      <CardHeader>
        <CardTitle>Imposta la password</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Caricamento />}>
          <Modulo searchParams={searchParams} />
        </Suspense>
      </CardContent>
    </Card>
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
