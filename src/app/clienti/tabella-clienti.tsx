"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClienteConSettori } from "@/db/clienti";
import { formattaFatturato } from "@/lib/cliente";
import { nomePaese } from "@/lib/paesi";

function Settori({ cliente }: { cliente: ClienteConSettori }) {
  if (cliente.settori.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <ul className="flex flex-wrap gap-1" aria-label={`Settori di ${cliente.ragioneSociale}`}>
      {cliente.settori.map((settore) => (
        <li key={settore.id}>
          <Badge variant="outline" render={<Link href={`/settori/${settore.id}`} />}>
            {settore.nome}
          </Badge>
        </li>
      ))}
    </ul>
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

function DettaglioCliente({ cliente }: { cliente: ClienteConSettori }) {
  const fatturato = cliente.fatturato === null ? null : formattaFatturato(cliente.fatturato);
  const note = cliente.note?.trim();
  const paesi = cliente.paesi ?? [];

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <dl className="grid gap-4">
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
        {paesi.length > 0 && (
          <Dato label="Localizzazione">
            {paesi.map((codice) => nomePaese(codice) ?? codice).join(", ")}
          </Dato>
        )}
        {note && <Dato label="Note">{note}</Dato>}
        <div>
          <dt className="text-sm font-medium">Settori</dt>
          <dd className="mt-2">
            {cliente.settori.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun Settore associato.</p>
            ) : (
              <Settori cliente={cliente} />
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function TabellaClienti({ clienti }: { clienti: ClienteConSettori[] }) {
  const [selezionato, setSelezionato] = useState<ClienteConSettori | null>(null);
  const [aperto, setAperto] = useState(false);

  function apri(cliente: ClienteConSettori) {
    setSelezionato(cliente);
    setAperto(true);
  }

  return (
    <>
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
              <TableRow
                key={cliente.id}
                className="cursor-pointer align-top"
                onClick={() => apri(cliente)}
              >
                <TableCell className="font-medium">
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      apri(cliente);
                    }}
                  >
                    {cliente.ragioneSociale}
                  </button>
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {cliente.attivitaSpecifica}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Settori cliente={cliente} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {cliente.dipendenti === null ? "—" : cliente.dipendenti.toLocaleString("it-IT")}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {cliente.fatturato === null ? "—" : formattaFatturato(cliente.fatturato)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {cliente.annoRiferimento ?? "—"}
                </TableCell>
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

      <Drawer open={aperto} onOpenChange={setAperto} swipeDirection="right">
        <DrawerContent>
          {selezionato && (
            <>
              <DrawerHeader>
                <DrawerTitle>{selezionato.ragioneSociale}</DrawerTitle>
                <DrawerDescription>{selezionato.attivitaSpecifica}</DrawerDescription>
              </DrawerHeader>
              <DettaglioCliente cliente={selezionato} />
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
