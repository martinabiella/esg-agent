"use client";

import { useActionState, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { eliminaNotiziaAzione, type StatoModulo } from "./azioni";

export function EliminaNotizia({
  id,
  titolo,
  onEliminata,
}: {
  id: number;
  titolo: string;
  onEliminata: () => void;
}) {
  const [aperto, setAperto] = useState(false);
  // onEliminata parte subito dopo l'azione e non da un effetto: la risposta
  // porta anche l'elenco aggiornato, in cui la Notizia non c'è più, e questo
  // componente sparisce insieme al drawer prima che un effetto possa girare.
  const [stato, esegui, inCorso] = useActionState(
    async (precedente: StatoModulo, formData: FormData) => {
      const esito = await eliminaNotiziaAzione(precedente, formData);
      if (esito?.salvato) onEliminata();
      return esito;
    },
    undefined,
  );

  return (
    <AlertDialog open={aperto} onOpenChange={setAperto}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Elimina
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare {titolo}?</AlertDialogTitle>
          <AlertDialogDescription>
            La Notizia e i suoi collegamenti agli Atti verranno eliminati.
            L&apos;operazione non si può annullare.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={esegui} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={id} />
          {stato?.errore && (
            <Alert variant="destructive">
              <AlertDescription>{stato.errore}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              variant="destructive"
              disabled={inCorso}
            >
              {inCorso ? "Eliminazione…" : "Elimina definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
