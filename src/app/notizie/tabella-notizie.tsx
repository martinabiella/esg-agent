"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
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
import type { NotiziaConAtti, NotiziaElenco } from "@/db/notizie";
import { etichettaProvenienza } from "@/lib/etichette";

function dataIt(data: string | null) {
  if (!data) return "Data non indicata";
  const [anno, mese, giorno] = data.split("-");
  return `${giorno}/${mese}/${anno}`;
}

function focusRiga(id: number | null) {
  if (id === null) return;
  document.querySelector<HTMLElement>(`[data-notizia-row="${id}"]`)?.focus();
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-medium">{label}</dt>
      <dd className="mt-1 text-sm text-muted-foreground">{children}</dd>
    </div>
  );
}

function DettaglioNotizia({ notizia }: { notizia: NotiziaConAtti }) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <dl className="grid gap-4">
        <Dato label="Fonte">{notizia.fonte}</Dato>
        <Dato label="Data">{dataIt(notizia.data)}</Dato>
        <Dato label="URL">
          <a
            href={notizia.url}
            target="_blank"
            rel="noreferrer"
            className="break-all underline"
          >
            {notizia.url}
          </a>
        </Dato>
        <Dato label="Riassunto">
          {notizia.riassunto ? (
            <span className="whitespace-pre-line">{notizia.riassunto}</span>
          ) : (
            "Nessun riassunto."
          )}
        </Dato>
        <div>
          <dt className="text-sm font-medium">Atti collegati</dt>
          <dd className="mt-2">
            {notizia.atti.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun Atto collegato.</p>
            ) : (
              <ul className="grid gap-2">
                {notizia.atti.map((atto) => (
                  <li key={atto.id}>
                    <Link href={`/normative/${atto.id}`} className="text-sm underline">
                      {atto.titolo}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <Dato label="Provenienza">
          {etichettaProvenienza[notizia.provenienzaContenuti]}
        </Dato>
      </dl>
    </div>
  );
}

export function TabellaNotizie({
  notizie,
  notiziaAperta,
}: {
  notizie: NotiziaElenco[];
  notiziaAperta: NotiziaConAtti | null;
}) {
  const router = useRouter();
  const precedenteId = useRef<number | null>(notiziaAperta?.id ?? null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (notiziaAperta) {
        document.querySelector<HTMLElement>('[data-slot="drawer-title"]')?.focus();
      } else {
        focusRiga(precedenteId.current);
      }
      precedenteId.current = notiziaAperta?.id ?? null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [notiziaAperta]);

  function apri(id: number) {
    router.push(`/notizie?notizia=${id}`, { scroll: false });
  }

  function chiudi() {
    router.replace("/notizie", { scroll: false });
  }

  return (
    <>
      <div className="mt-4 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titolo</TableHead>
              <TableHead>Fonte</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notizie.map((notizia) => (
              <TableRow
                key={notizia.id}
                data-notizia-row={notizia.id}
                tabIndex={0}
                role="button"
                aria-controls="notizia-drawer"
                aria-expanded={notiziaAperta?.id === notizia.id}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => apri(notizia.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    apri(notizia.id);
                  }
                }}
              >
                <TableCell className="font-medium">{notizia.titolo}</TableCell>
                <TableCell>{notizia.fonte}</TableCell>
                <TableCell className="whitespace-nowrap">{dataIt(notizia.data)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Drawer
        open={notiziaAperta !== null}
        onOpenChange={(open) => {
          if (!open) chiudi();
        }}
        swipeDirection="right"
      >
        {notiziaAperta && (
          <DrawerContent id="notizia-drawer">
            <DrawerHeader>
              <DrawerTitle tabIndex={-1}>{notiziaAperta.titolo}</DrawerTitle>
              <DrawerDescription>{notiziaAperta.fonte}</DrawerDescription>
            </DrawerHeader>
            <DettaglioNotizia notizia={notiziaAperta} />
            <DrawerFooter>
              <DrawerClose render={<Button variant="outline" />}>Chiudi</DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        )}
      </Drawer>
    </>
  );
}
