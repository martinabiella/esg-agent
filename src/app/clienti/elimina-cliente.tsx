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
import { eliminaClienteAzione, type StatoModulo } from "./azioni";

export function EliminaCliente({
  id,
  ragioneSociale,
  onEliminato,
}: {
  id: number;
  ragioneSociale: string;
  onEliminato: () => void;
}) {
  const [aperto, setAperto] = useState(false);
  // onEliminato parte subito dopo l'azione e non da un effetto: la risposta
  // porta anche l'elenco aggiornato, in cui il Cliente non c'è più, e questo
  // componente sparisce dal drawer prima che un effetto possa girare.
  const [stato, esegui, inCorso] = useActionState(
    async (precedente: StatoModulo, formData: FormData) => {
      const esito = await eliminaClienteAzione(precedente, formData);
      if (esito?.salvato) onEliminato();
      return esito;
    },
    undefined,
  );

  return (
    <>
      <AlertDialog open={aperto} onOpenChange={setAperto}>
        <AlertDialogTrigger render={<Button variant="destructive" />}>Elimina</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {ragioneSociale}?</AlertDialogTitle>
            <AlertDialogDescription>
              Il Cliente e i suoi collegamenti ai Settori verranno eliminati. L&apos;operazione
              non si può annullare.
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
              <AlertDialogAction type="submit" variant="destructive" disabled={inCorso}>
                {inCorso ? "Eliminazione…" : "Elimina definitivamente"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
