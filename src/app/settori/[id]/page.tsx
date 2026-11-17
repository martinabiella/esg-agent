import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Caricamento } from "@/app/caricamento";
import { attiDelSettore } from "@/db/atti";
import { clientiDelSettore } from "@/db/clienti";
import { settoreDaParams } from "../trova-da-params";
import { Esito } from "../esito";
import { EliminaSettore } from "../elimina-settore";
import {
  etichettaGiurisdizione,
  etichettaStato,
  etichettaTipoAtto,
} from "@/lib/etichette";

export default function SchedaSettorePage(props: PageProps<"/settori/[id]">) {
  return (
    <div>
      <Link href="/settori" className="text-sm hover:underline">
        ← Tutti i Settori
      </Link>
      <Suspense fallback={<Caricamento />}>
        <Scheda params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Scheda({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const settore = await settoreDaParams(params);
  const id = settore.id;
  const [atti, clienti, { esito }] = await Promise.all([
    attiDelSettore(id),
    clientiDelSettore(id),
    searchParams,
  ]);

  return (
    <>
      <Esito esito={esito} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{settore.nome}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href={`/settori/${id}/modifica`} />}>
            Modifica
          </Button>
          <EliminaSettore id={id} nome={settore.nome} />
        </div>
      </div>
      {settore.descrizione && <p className="mt-2 max-w-2xl text-muted-foreground">{settore.descrizione}</p>}

      <h2 id="normative-settore" className="mt-8 text-lg font-semibold">
        Normative che riguardano il Settore
      </h2>
      <div className="mt-2 rounded-lg border">
        <Table aria-labelledby="normative-settore">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Titolo</TableHead>
              <TableHead scope="col">Giurisdizione</TableHead>
              <TableHead scope="col">Tipo di atto</TableHead>
              <TableHead scope="col">Stato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {atti.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Nessun Atto normativo collegato.
                </TableCell>
              </TableRow>
            ) : (
              atti.map((atto) => (
                <TableRow key={atto.id}>
                  <TableCell className="whitespace-normal">
                    <Link href={`/normative/${atto.id}`} className="font-medium hover:underline">
                      {atto.titolo}
                    </Link>
                    {atto.tuttiISettori && (
                      <div className="mt-1 text-muted-foreground">Tutti i Settori</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{etichettaGiurisdizione[atto.giurisdizione]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{etichettaTipoAtto[atto.tipo]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{etichettaStato[atto.stato]}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <h2 id="clienti-settore" className="mt-8 text-lg font-semibold">
        Clienti che operano nel Settore
      </h2>
      <div className="mt-2 rounded-lg border">
        <Table aria-labelledby="clienti-settore">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Ragione sociale</TableHead>
              <TableHead scope="col">Attività specifica</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clienti.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  Nessun Cliente opera in questo Settore.
                </TableCell>
              </TableRow>
            ) : (
              clienti.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="whitespace-normal">
                    <Link
                      href={{ pathname: "/clienti", query: { cliente: cliente.id } }}
                      className="font-medium hover:underline"
                    >
                      {cliente.ragioneSociale}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {cliente.attivitaSpecifica}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
