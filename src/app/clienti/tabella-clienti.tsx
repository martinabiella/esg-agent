"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { NormaDelCliente } from "@/db/applicabilita";
import type { ClienteConSettori } from "@/db/clienti";
import { formattaFatturato, type ValoriModulo } from "@/lib/cliente";
import { elencoPaesi, nomePaese } from "@/lib/paesi";
import {
  aggiornaClienteAzione,
  creaClienteAzione,
  type EsitoOperazione,
} from "./azioni";
import { EliminaCliente } from "./elimina-cliente";
import { FormCliente } from "./form-cliente";
import { NormativeCliente } from "./normative-cliente";
import type { Voce } from "./selezione-multipla";

const MESSAGGI: Record<EsitoOperazione, string> = {
  creato: "Cliente creato.",
  modificato: "Modifiche salvate.",
  eliminato: "Cliente eliminato.",
};

const PAESI: Voce[] = elencoPaesi().map((p) => ({ value: p.codice, label: p.nome }));

const MODULO_VUOTO: ValoriModulo = {
  ragioneSociale: "",
  attivitaSpecifica: "",
  settori: [],
  dipendenti: "",
  fatturato: "",
  annoRiferimento: "",
  paesi: [],
  note: "",
};

function valoriDi(cliente: ClienteConSettori): ValoriModulo {
  return {
    ragioneSociale: cliente.ragioneSociale,
    attivitaSpecifica: cliente.attivitaSpecifica,
    settori: cliente.settori.map((s) => String(s.id)),
    dipendenti: cliente.dipendenti === null ? "" : String(cliente.dipendenti),
    fatturato: cliente.fatturato ?? "",
    annoRiferimento: cliente.annoRiferimento === null ? "" : String(cliente.annoRiferimento),
    paesi: cliente.paesi ?? [],
    note: cliente.note ?? "",
  };
}

// Cosa mostra il drawer: il dettaglio di un Cliente, il modulo di modifica o quello di creazione.
type Vista =
  | { tipo: "dettaglio"; id: number }
  | { tipo: "modifica"; id: number }
  | { tipo: "nuovo" };

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

function DettaglioCliente({
  cliente,
  normative,
}: {
  cliente: ClienteConSettori;
  normative: NormaDelCliente[];
}) {
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
        <NormativeCliente
          clienteId={cliente.id}
          ragioneSociale={cliente.ragioneSociale}
          normative={normative}
        />
      </dl>
    </div>
  );
}

export function TabellaClienti({
  clienti,
  normative,
  settori,
}: {
  clienti: ClienteConSettori[];
  normative: Record<number, NormaDelCliente[]>;
  settori: { id: number; nome: string }[];
}) {
  const [vista, setVista] = useState<Vista | null>(null);
  const [aperto, setAperto] = useState(false);
  const [esito, setEsito] = useState<EsitoOperazione | null>(null);

  const vociSettori: Voce[] = settori.map((s) => ({ value: String(s.id), label: s.nome }));
  const selezionato =
    vista && vista.tipo !== "nuovo" ? clienti.find((c) => c.id === vista.id) : undefined;

  function mostra(nuova: Vista) {
    setVista(nuova);
    setAperto(true);
  }

  function apri(cliente: ClienteConSettori) {
    setEsito(null);
    mostra({ tipo: "dettaglio", id: cliente.id });
  }

  const dopoSalvataggio = useCallback((id: number, e: EsitoOperazione) => {
    setEsito(e);
    setVista({ tipo: "dettaglio", id });
  }, []);

  const dopoEliminazione = useCallback(() => {
    setEsito("eliminato");
    setAperto(false);
  }, []);

  return (
    <>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex-1">
          {esito === "eliminato" && !aperto && (
            <Alert role="status" className="border-green-600 text-green-700">
              <AlertDescription>{MESSAGGI.eliminato}</AlertDescription>
            </Alert>
          )}
        </div>
        <Button
          onClick={() => {
            setEsito(null);
            mostra({ tipo: "nuovo" });
          }}
        >
          Nuovo Cliente
        </Button>
      </div>
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
            {clienti.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  Nessun Cliente presente.
                </TableCell>
              </TableRow>
            )}
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
          {vista?.tipo === "nuovo" && (
            <>
              <DrawerHeader>
                <DrawerTitle>Nuovo Cliente</DrawerTitle>
                <DrawerDescription>I campi con * sono obbligatori.</DrawerDescription>
              </DrawerHeader>
              <FormCliente
                key="nuovo"
                azione={creaClienteAzione}
                iniziali={MODULO_VUOTO}
                settori={vociSettori}
                paesi={PAESI}
                etichettaInvio="Crea Cliente"
                onAnnulla={() => setAperto(false)}
                onSalvato={dopoSalvataggio}
              />
            </>
          )}
          {vista?.tipo === "modifica" && selezionato && (
            <>
              <DrawerHeader>
                <DrawerTitle>Modifica {selezionato.ragioneSociale}</DrawerTitle>
                <DrawerDescription>I campi con * sono obbligatori.</DrawerDescription>
              </DrawerHeader>
              <FormCliente
                key={`modifica-${selezionato.id}`}
                azione={aggiornaClienteAzione}
                id={selezionato.id}
                iniziali={valoriDi(selezionato)}
                settori={vociSettori}
                paesi={PAESI}
                etichettaInvio="Salva modifiche"
                onAnnulla={() => setVista({ tipo: "dettaglio", id: selezionato.id })}
                onSalvato={dopoSalvataggio}
              />
            </>
          )}
          {vista?.tipo === "dettaglio" && selezionato && (
            <>
              <DrawerHeader>
                <DrawerTitle>{selezionato.ragioneSociale}</DrawerTitle>
                <DrawerDescription>{selezionato.attivitaSpecifica}</DrawerDescription>
              </DrawerHeader>
              {esito && esito !== "eliminato" && (
                <Alert role="status" className="mx-4 w-auto border-green-600 text-green-700">
                  <AlertDescription>{MESSAGGI[esito]}</AlertDescription>
                </Alert>
              )}
              <DettaglioCliente cliente={selezionato} normative={normative[selezionato.id] ?? []} />
              <div className="flex items-center gap-2 border-t p-4">
                <Button
                  onClick={() => {
                    setEsito(null);
                    setVista({ tipo: "modifica", id: selezionato.id });
                  }}
                >
                  Modifica
                </Button>
                <EliminaCliente
                  key={selezionato.id}
                  id={selezionato.id}
                  ragioneSociale={selezionato.ragioneSociale}
                  onEliminato={dopoEliminazione}
                />
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
