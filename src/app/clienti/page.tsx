import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Caricamento } from "@/app/caricamento";
import { elencoClienti } from "@/db/clienti";
import { formattaFatturato } from "@/lib/cliente";
import { nomePaese } from "@/lib/paesi";

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
    <div className="mt-4 rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ragione sociale</TableHead>
            <TableHead>Attività specifica</TableHead>
            <TableHead>Settori</TableHead>
            <TableHead className="text-right">Dipendenti</TableHead>
            <TableHead className="text-right">Fatturato</TableHead>
            <TableHead className="text-right">Anno</TableHead>
            <TableHead>Localizzazione</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clienti.map((cliente) => (
            <TableRow key={cliente.id} className="align-top">
              <TableCell className="font-medium">
                <Link href={`/clienti/${cliente.id}`} className="hover:underline">
                  {cliente.ragioneSociale}
                </Link>
              </TableCell>
              <TableCell className="whitespace-normal text-muted-foreground">
                {cliente.attivitaSpecifica}
              </TableCell>
              <TableCell>
                {cliente.settori.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <ul className="flex flex-wrap gap-1" aria-label={`Settori di ${cliente.ragioneSociale}`}>
                    {cliente.settori.map((settore) => (
                      <li key={settore.id}>
                        <Badge variant="outline" render={<Link href={`/settori/${settore.id}`} />}>
                          {settore.nome}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {cliente.dipendenti === null ? "—" : cliente.dipendenti.toLocaleString("it-IT")}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {cliente.fatturato === null ? "—" : formattaFatturato(cliente.fatturato)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{cliente.annoRiferimento ?? "—"}</TableCell>
              <TableCell className="whitespace-normal">
                {(cliente.paesi?.length ?? 0) > 0
                  ? cliente.paesi?.map((codice) => nomePaese(codice) ?? codice).join(", ")
                  : "—"}
              </TableCell>
              <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                {cliente.note?.trim() || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
