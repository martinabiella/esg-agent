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
import type { elencoAtti } from "@/db/atti";
import { etichettaGiurisdizione, etichettaStato } from "@/lib/etichette";

type AttoElenco = Awaited<ReturnType<typeof elencoAtti>>[number];

export function TabellaNormative({
  atti,
  filtriAttivi,
}: {
  atti: AttoElenco[];
  filtriAttivi: boolean;
}) {
  return (
    <div className="mt-6 rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titolo</TableHead>
            <TableHead>Giurisdizione</TableHead>
            <TableHead>Temi</TableHead>
            <TableHead>Stato più recente</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {atti.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                {filtriAttivi
                  ? "Nessun Atto normativo corrisponde ai filtri scelti."
                  : "Nessun Atto normativo presente."}
              </TableCell>
            </TableRow>
          )}
          {atti.map((atto) => (
            <TableRow key={atto.id} className="align-top">
              <TableCell className="whitespace-normal font-medium">
                <Link href={`/normative/${atto.id}`} className="hover:underline">
                  {atto.titolo}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {etichettaGiurisdizione[atto.giurisdizione]}
                </Badge>
              </TableCell>
              <TableCell>
                {atto.temi.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <ul className="flex flex-wrap gap-1">
                    {atto.temi.map((tema) => (
                      <li key={tema.id}>
                        <Badge variant="secondary">{tema.nome}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </TableCell>
              <TableCell>
                <Badge>{etichettaStato[atto.statoRecente]}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
