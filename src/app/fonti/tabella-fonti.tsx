"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import type { FonteDettaglio, FonteElenco } from "@/db/fonti";
import { etichettaControlloFonte, etichettaTipoFonte } from "@/lib/etichette";
import type { ControlloFonte, ValoriFonte } from "@/lib/fonte";
import { aggiornaFonteAzione, creaFonteAzione, type EsitoOperazione } from "./azioni";
import { EliminaFonte } from "./elimina-fonte";
import { FormFonte } from "./form-fonte";

const MESSAGGI: Record<EsitoOperazione, string> = {
  creata: "Fonte creata.",
  modificata: "Modifiche salvate.",
  eliminata: "Fonte eliminata.",
};

const MODULO_VUOTO: ValoriFonte = { nome: "", url: "", tipo: "" };

function valoriDi(f: FonteDettaglio): ValoriFonte {
  return { nome: f.nome, url: f.url, tipo: f.tipo };
}

const SPIEGAZIONE_TIPO = {
  ufficiale: "Fa fede per Stato e date: può cambiare lo Stato degli Atti.",
  editoriale: "Solo Notizie e scoperta: non cambia lo Stato degli Atti.",
} as const;

// L'elenco e il dettaglio sono nell'URL (?fonte=<id>); il modulo di modifica e
// quello di creazione sono stato locale del drawer.
type Modalita = "dettaglio" | "modifica" | "nuovo";

// Fuso fisso: server e browser producono la stessa stringa.
const formatoData = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function focusRiga(id: number | null) {
  if (id === null) return;
  document.querySelector<HTMLElement>(`[data-fonte-row="${id}"]`)?.focus();
}

const VARIANTE_CONTROLLO: Record<
  ControlloFonte["esito"],
  "destructive" | "secondary" | "outline"
> = {
  mai_controllata: "outline",
  controllata: "secondary",
  non_leggibile: "destructive",
  saltata_per_tetto: "outline",
};

// Esito dell'ultima Ricerca, con la data e, se la Fonte non è leggibile, il motivo.
function UltimoControllo({ controllo }: { controllo: ControlloFonte }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={VARIANTE_CONTROLLO[controllo.esito]}>
        {etichettaControlloFonte[controllo.esito]}
      </Badge>
      {controllo.esito !== "mai_controllata" && (
        <span className="text-xs text-muted-foreground">
          Il {formatoData.format(controllo.data)}
          {controllo.esito === "non_leggibile" && (
            <span className="block whitespace-normal">
              {controllo.motivo ?? "Motivo non indicato."}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-medium">{label}</dt>
      <dd className="mt-1 text-sm text-muted-foreground">{children}</dd>
    </div>
  );
}

function DettaglioFonte({ fonte }: { fonte: FonteDettaglio }) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <dl className="grid gap-4">
        <Dato label="URL">
          <a href={fonte.url} target="_blank" rel="noreferrer" className="break-all underline">
            {fonte.url}
          </a>
        </Dato>
        <Dato label="Tipo">
          {etichettaTipoFonte[fonte.tipo]}. {SPIEGAZIONE_TIPO[fonte.tipo]}
        </Dato>
        <Dato label="Ultimo controllo">
          <UltimoControllo controllo={fonte.controllo} />
        </Dato>
        <Dato label="Atti scoperti da questa Fonte">{fonte.attiScoperti}</Dato>
      </dl>
    </div>
  );
}

export function TabellaFonti({
  fonti,
  fonteAperta,
}: {
  fonti: FonteElenco[];
  fonteAperta: FonteDettaglio | null;
}) {
  const router = useRouter();
  const [modalita, setModalita] = useState<Modalita>("dettaglio");
  const [esito, setEsito] = useState<EsitoOperazione | null>(null);
  // "nuovo" vale solo finché nessuna Fonte è aperta nell'URL: dopo la
  // creazione l'URL passa alla nuova Fonte e il drawer mostra il suo dettaglio.
  const vista: Modalita | null = fonteAperta
    ? modalita === "modifica"
      ? "modifica"
      : "dettaglio"
    : modalita === "nuovo"
      ? "nuovo"
      : null;
  const precedenteId = useRef<number | null>(fonteAperta?.id ?? null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (fonteAperta) {
        document.querySelector<HTMLElement>('[data-slot="drawer-title"]')?.focus();
      } else {
        focusRiga(precedenteId.current);
      }
      precedenteId.current = fonteAperta?.id ?? null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fonteAperta]);

  function apri(id: number) {
    setEsito(null);
    setModalita("dettaglio");
    router.push(`/fonti?fonte=${id}`, { scroll: false });
  }

  function chiudi() {
    setModalita("dettaglio");
    router.replace("/fonti", { scroll: false });
  }

  const dopoSalvataggio = useCallback(
    (id: number, e: EsitoOperazione) => {
      setEsito(e);
      setModalita("dettaglio");
      if (e === "creata") router.push(`/fonti?fonte=${id}`, { scroll: false });
    },
    [router],
  );

  const dopoEliminazione = useCallback(() => {
    setEsito("eliminata");
    setModalita("dettaglio");
    router.replace("/fonti", { scroll: false });
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
            if (fonteAperta) router.replace("/fonti", { scroll: false });
          }}
        >
          Nuova Fonte
        </Button>
      </div>
      <div className="mt-4 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ultimo controllo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fonti.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  Nessuna Fonte presente.
                </TableCell>
              </TableRow>
            )}
            {fonti.map((fonte) => (
              <TableRow
                key={fonte.id}
                data-fonte-row={fonte.id}
                tabIndex={0}
                role="button"
                aria-controls="fonte-drawer"
                aria-expanded={fonteAperta?.id === fonte.id}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => apri(fonte.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    apri(fonte.id);
                  }
                }}
              >
                <TableCell>
                  <span className="font-medium">{fonte.nome}</span>
                  <span className="block max-w-md truncate text-xs text-muted-foreground">
                    {fonte.url}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={fonte.tipo === "ufficiale" ? "default" : "outline"}>
                    {etichettaTipoFonte[fonte.tipo]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <UltimoControllo controllo={fonte.controllo} />
                </TableCell>
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
        <DrawerContent id="fonte-drawer">
          {vista === "nuovo" && (
            <>
              <DrawerHeader>
                <DrawerTitle tabIndex={-1}>Nuova Fonte</DrawerTitle>
                <DrawerDescription>I campi con * sono obbligatori.</DrawerDescription>
              </DrawerHeader>
              <FormFonte
                key="nuova"
                azione={creaFonteAzione}
                iniziali={MODULO_VUOTO}
                etichettaInvio="Crea Fonte"
                onAnnulla={chiudi}
                onSalvato={dopoSalvataggio}
                onApriEsistente={apri}
              />
            </>
          )}
          {vista === "modifica" && fonteAperta && (
            <>
              <DrawerHeader>
                <DrawerTitle tabIndex={-1}>Modifica Fonte</DrawerTitle>
                <DrawerDescription>I campi con * sono obbligatori.</DrawerDescription>
              </DrawerHeader>
              <FormFonte
                key={`modifica-${fonteAperta.id}`}
                azione={aggiornaFonteAzione}
                id={fonteAperta.id}
                iniziali={valoriDi(fonteAperta)}
                etichettaInvio="Salva modifiche"
                onAnnulla={() => setModalita("dettaglio")}
                onSalvato={dopoSalvataggio}
                onApriEsistente={apri}
              />
            </>
          )}
          {vista === "dettaglio" && fonteAperta && (
            <>
              <DrawerHeader>
                <DrawerTitle tabIndex={-1}>{fonteAperta.nome}</DrawerTitle>
                <DrawerDescription>Fonte {etichettaTipoFonte[fonteAperta.tipo].toLowerCase()}</DrawerDescription>
              </DrawerHeader>
              {esito && esito !== "eliminata" && (
                <Alert role="status" className="mx-4 w-auto border-green-600 text-green-700">
                  <AlertDescription>{MESSAGGI[esito]}</AlertDescription>
                </Alert>
              )}
              <DettaglioFonte fonte={fonteAperta} />
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
                  <EliminaFonte
                    key={fonteAperta.id}
                    id={fonteAperta.id}
                    nome={fonteAperta.nome}
                    attiScoperti={fonteAperta.attiScoperti}
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
