"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import type { Voce } from "@/app/clienti/selezione-multipla";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NotiziaConAtti, NotiziaElenco } from "@/db/notizie";
import { etichettaStato } from "@/lib/etichette";
import type { ValoriNotizia } from "@/lib/notizia";
import { aggiornaNotiziaAzione, creaNotiziaAzione, type EsitoOperazione } from "./azioni";
import { EliminaNotizia } from "./elimina-notizia";
import { FormNotizia } from "./form-notizia";

const MESSAGGI: Record<EsitoOperazione, string> = {
  creata: "Notizia creata.",
  modificata: "Modifiche salvate.",
  eliminata: "Notizia eliminata.",
};

const MODULO_VUOTO: ValoriNotizia = {
  titolo: "",
  fonte: "",
  url: "",
  data: "",
  riassunto: "",
  atti: [],
};

function valoriDi(n: NotiziaConAtti): ValoriNotizia {
  return {
    titolo: n.titolo,
    fonte: n.fonte,
    url: n.url,
    data: n.data ?? "",
    riassunto: n.riassunto,
    atti: n.atti.map((a) => String(a.id)),
  };
}

// L'elenco e il dettaglio sono nell'URL (?notizia=<id>); il modulo di modifica e
// quello di creazione sono stato locale del drawer.
type Modalita = "dettaglio" | "modifica" | "nuovo";

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
        <Dato label="Pubblicata da">{notizia.fonte}</Dato>
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
      </dl>
    </div>
  );
}

export function TabellaNotizie({
  notizie,
  notiziaAperta,
  atti,
}: {
  notizie: NotiziaElenco[];
  notiziaAperta: NotiziaConAtti | null;
  atti: { id: number; titolo: string; stato: keyof typeof etichettaStato }[];
}) {
  const router = useRouter();
  const [modalita, setModalita] = useState<Modalita>("dettaglio");
  const [esito, setEsito] = useState<EsitoOperazione | null>(null);
  const vociAtti: Voce[] = atti.map((a) => ({
    value: String(a.id),
    label: `${a.titolo} (${etichettaStato[a.stato]})`,
  }));
  // "nuovo" vale solo finché nessuna Notizia è aperta nell'URL: dopo la
  // creazione l'URL passa alla nuova Notizia e il drawer mostra il suo dettaglio.
  const vista: Modalita | null = notiziaAperta
    ? modalita === "modifica"
      ? "modifica"
      : "dettaglio"
    : modalita === "nuovo"
      ? "nuovo"
      : null;
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
    setEsito(null);
    setModalita("dettaglio");
    router.push(`/notizie?notizia=${id}`, { scroll: false });
  }

  function chiudi() {
    setModalita("dettaglio");
    router.replace("/notizie", { scroll: false });
  }

  const dopoSalvataggio = useCallback(
    (id: number, e: EsitoOperazione) => {
      setEsito(e);
      setModalita("dettaglio");
      if (e === "creata") router.push(`/notizie?notizia=${id}`, { scroll: false });
    },
    [router],
  );

  const dopoEliminazione = useCallback(() => {
    setEsito("eliminata");
    setModalita("dettaglio");
    router.replace("/notizie", { scroll: false });
  }, [router]);

  return (
    <>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex-1">
          {esito === "eliminata" && vista === null && (
            <Alert role="status" className="border-green-600 text-green-700">
              <AlertDescription>{MESSAGGI.eliminata}</AlertDescription>
            </Alert>
          )}
        </div>
        <Button
          onClick={() => {
            setEsito(null);
            setModalita("nuovo");
            if (notiziaAperta) router.replace("/notizie", { scroll: false });
          }}
        >
          Nuova Notizia
        </Button>
      </div>
      <div className="mt-4 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titolo</TableHead>
              <TableHead>Pubblicata da</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notizie.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  Nessuna Notizia presente.
                </TableCell>
              </TableRow>
            )}
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
        open={vista !== null}
        onOpenChange={(open) => {
          if (!open) chiudi();
        }}
        swipeDirection="right"
      >
        <DrawerContent id="notizia-drawer">
          {vista === "nuovo" && (
            <>
              <DrawerHeader>
                <DrawerTitle tabIndex={-1}>Nuova Notizia</DrawerTitle>
                <DrawerDescription>I campi con * sono obbligatori.</DrawerDescription>
              </DrawerHeader>
              <FormNotizia
                key="nuova"
                azione={creaNotiziaAzione}
                iniziali={MODULO_VUOTO}
                atti={vociAtti}
                etichettaInvio="Crea Notizia"
                onAnnulla={chiudi}
                onSalvato={dopoSalvataggio}
                onApriEsistente={apri}
              />
            </>
          )}
          {vista === "modifica" && notiziaAperta && (
            <>
              <DrawerHeader>
                <DrawerTitle tabIndex={-1}>Modifica Notizia</DrawerTitle>
                <DrawerDescription>I campi con * sono obbligatori.</DrawerDescription>
              </DrawerHeader>
              <FormNotizia
                key={`modifica-${notiziaAperta.id}`}
                azione={aggiornaNotiziaAzione}
                id={notiziaAperta.id}
                iniziali={valoriDi(notiziaAperta)}
                atti={vociAtti}
                etichettaInvio="Salva modifiche"
                onAnnulla={() => setModalita("dettaglio")}
                onSalvato={dopoSalvataggio}
                onApriEsistente={apri}
              />
            </>
          )}
          {vista === "dettaglio" && notiziaAperta && (
            <>
              <DrawerHeader>
                <DrawerTitle tabIndex={-1}>{notiziaAperta.titolo}</DrawerTitle>
                <DrawerDescription>{notiziaAperta.fonte}</DrawerDescription>
              </DrawerHeader>
              {esito && esito !== "eliminata" && (
                <Alert role="status" className="mx-4 w-auto border-green-600 text-green-700">
                  <AlertDescription>{MESSAGGI[esito]}</AlertDescription>
                </Alert>
              )}
              <DettaglioNotizia notizia={notiziaAperta} />
              <DrawerFooter>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setEsito(null);
                      setModalita("modifica");
                    }}
                  >
                    Modifica
                  </Button>
                  <EliminaNotizia
                    key={notiziaAperta.id}
                    id={notiziaAperta.id}
                    titolo={notiziaAperta.titolo}
                    onEliminata={dopoEliminazione}
                  />
                  <DrawerClose render={<Button variant="outline" className="ml-auto" />}>
                    Chiudi
                  </DrawerClose>
                </div>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
