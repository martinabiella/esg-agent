import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Caricamento } from "@/app/caricamento";
import { elencoClienti } from "@/db/clienti";

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

  return (
    <ul className="mt-4 grid gap-4 md:grid-cols-2">
      {clienti.map((cliente) => (
        <li key={cliente.id}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>
                <Link href={`/clienti/${cliente.id}`} className="hover:underline">
                  {cliente.ragioneSociale}
                </Link>
              </CardTitle>
              <CardDescription>{cliente.attivitaSpecifica}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">Settori</p>
              {cliente.settori.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">Nessun Settore associato.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-2" aria-label={`Settori di ${cliente.ragioneSociale}`}>
                  {cliente.settori.map((settore) => (
                    <li key={settore.id}>
                      <Badge variant="outline" render={<Link href={`/settori/${settore.id}`} />}>
                        {settore.nome}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
