import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Caricamento } from "@/app/caricamento";
import { nomePaese } from "@/lib/paesi";
import { formattaFatturato } from "@/lib/cliente";
import { clienteDaParams } from "../trova-da-params";

export const metadata = { title: "Scheda Cliente · Monitoraggio ESG" };

export default function SchedaClientePage(props: PageProps<"/clienti/[id]">) {
  return (
    <div>
      <Link href="/clienti" className="text-sm hover:underline">
        ← Tutti i Clienti
      </Link>
      <Suspense fallback={<Caricamento />}>
        <Scheda params={props.params} />
      </Suspense>
    </div>
  );
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-medium">{label}</dt>
      <dd className="mt-1 text-sm text-muted-foreground">{children}</dd>
    </div>
  );
}

async function Scheda({ params }: { params: Promise<{ id: string }> }) {
  const cliente = await clienteDaParams(params);
  const fatturato = cliente.fatturato === null ? null : formattaFatturato(cliente.fatturato);
  const note = cliente.note?.trim();
  const haDatiFacoltativi =
    cliente.dipendenti !== null ||
    fatturato !== null ||
    cliente.annoRiferimento !== null ||
    (cliente.paesi?.length ?? 0) > 0 ||
    Boolean(note);

  return (
    <>
      <h1 className="mt-2 text-2xl font-semibold">{cliente.ragioneSociale}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{cliente.attivitaSpecifica}</p>

      {haDatiFacoltativi && (
        <Card className="mt-6 max-w-2xl">
          <CardHeader>
            <CardTitle>Dati del Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              {cliente.dipendenti !== null && (
                <Dato label="Dipendenti">{cliente.dipendenti.toLocaleString("it-IT")}</Dato>
              )}
              {fatturato !== null && (
                <Dato label="Fatturato">
                  {fatturato}
                  {cliente.annoRiferimento !== null && ` (${cliente.annoRiferimento})`}
                </Dato>
              )}
              {fatturato === null && cliente.annoRiferimento !== null && (
                <Dato label="Anno di riferimento">{cliente.annoRiferimento}</Dato>
              )}
              {(cliente.paesi?.length ?? 0) > 0 && (
                <Dato label="Localizzazione">
                  {cliente.paesi
                    ?.map((codice) => nomePaese(codice) ?? codice)
                    .join(", ")}
                </Dato>
              )}
              {note && <Dato label="Note">{note}</Dato>}
            </dl>
          </CardContent>
        </Card>
      )}

      <h2 className="mt-8 text-lg font-semibold">Settori</h2>
      {cliente.settori.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nessun Settore associato.</p>
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
    </>
  );
}
