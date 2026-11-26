"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { EsitoEsecuzione } from "@/lib/esecuzione";
import { etichettaEsitoEsecuzione } from "@/lib/etichette";
import { type StatoAvvio, avviaEsecuzioneAzione } from "./azioni";

// Ogni quanto la pagina si ricarica da sola finché l'Esecuzione è in corso.
const INTERVALLO_AGGIORNAMENTO_MS = 10_000;

// Fuso fisso: server e browser producono la stessa stringa.
const formatoDataOra = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const VARIANTE: Record<EsitoEsecuzione["stato"], "destructive" | "secondary" | "outline"> = {
  in_corso: "outline",
  completata: "secondary",
  fonti_non_leggibili: "destructive",
};

function messaggio(stato: NonNullable<StatoAvvio>): { testo: string; errore: boolean } {
  switch (stato.esito) {
    case "avviata":
      return {
        testo:
          stato.fallite > 0
            ? "Esecuzione avviata, ma alcune Ricerche non sono partite: vedi l'ultimo controllo delle Fonti."
            : "Esecuzione avviata: i risultati arrivano in pochi minuti e l'esito si aggiorna da solo.",
        errore: false,
      };
    case "gia_in_corso":
      return {
        testo: `C'è già un'Esecuzione in corso, avviata il ${formatoDataOra.format(stato.inCorsoDal)}: non ne parte un'altra.`,
        errore: false,
      };
    case "nessuna_fonte":
      return { testo: "Non ci sono Fonti da controllare: aggiungine una.", errore: true };
    case "errore":
      return { testo: stato.messaggio, errore: true };
  }
}

// Avvia la stessa Esecuzione del cron del lunedì e mostra l'esito dell'ultima:
// l'unica traccia del log delle Ricerche nell'interfaccia.
export function AvviaRicerca({ ultima }: { ultima: EsitoEsecuzione | null }) {
  const [stato, avvia, inAvvio] = useActionState(avviaEsecuzioneAzione, undefined);
  const avviso = stato && messaggio(stato);
  const router = useRouter();
  const inCorso = ultima?.stato === "in_corso";

  // L'esito arriva dal webhook, fuori dalla pagina: finché è in corso la
  // ricarico io, e mi fermo appena l'Esecuzione si chiude.
  useEffect(() => {
    if (!inCorso) return;
    const timer = setInterval(() => router.refresh(), INTERVALLO_AGGIORNAMENTO_MS);
    return () => clearInterval(timer);
  }, [inCorso, router]);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Ultima Esecuzione
          {ultima && <Badge variant={VARIANTE[ultima.stato]}>{etichettaEsitoEsecuzione[ultima.stato]}</Badge>}
        </CardTitle>
        <CardDescription>
          {ultima
            ? `Avviata il ${formatoDataOra.format(ultima.avviataIl)}. ${ultima.descrizione}`
            : "Nessuna Ricerca finora. Le Ricerche partono ogni lunedì mattina."}
        </CardDescription>
        <CardAction>
          <form action={avvia}>
            <Button type="submit" variant="outline" disabled={inAvvio}>
              {inAvvio && <Spinner />}
              {inAvvio ? "Avvio in corso…" : "Avvia ricerca ora"}
            </Button>
          </form>
        </CardAction>
      </CardHeader>
      {avviso && (
        <CardContent>
          <Alert role="status" variant={avviso.errore ? "destructive" : "default"}>
            <AlertDescription>{avviso.testo}</AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}
