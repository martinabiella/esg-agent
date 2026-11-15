"use client";

import { useActionState, useEffect, useState } from "react";
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
import { eliminaClienteAzione } from "./azioni";

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
  const [stato, esegui, inCorso] = useActionState(eliminaClienteAzione, undefined);
  const eliminato = !!stato?.salvato;

  useEffect(() => {
    if (eliminato) onEliminato();
  }, [eliminato, onEliminato]);

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
