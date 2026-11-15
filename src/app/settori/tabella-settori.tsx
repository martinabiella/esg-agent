import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function TabellaSettori({
  settori,
}: {
  settori: { id: number; nome: string; descrizione: string }[];
}) {
  return (
    <div className="mt-4 rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Descrizione</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settori.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-muted-foreground">
                Nessun Settore presente.
              </TableCell>
            </TableRow>
          )}
          {settori.map((settore) => (
            <TableRow key={settore.id} className="align-top">
              <TableCell className="font-medium">
                <Link href={`/settori/${settore.id}`} className="hover:underline">
                  {settore.nome}
                </Link>
              </TableCell>
              <TableCell className="whitespace-normal text-muted-foreground">
                {settore.descrizione || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
