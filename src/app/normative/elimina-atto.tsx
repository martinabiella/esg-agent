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
import { eliminaAttoAzione } from "./azioni";

export function EliminaAtto({ id, titolo }: { id: number; titolo: string }) {
  const [aperto, setAperto] = useState(false);
  const [stato, esegui, inCorso] = useActionState(eliminaAttoAzione, undefined);

  return (
    <AlertDialog open={aperto} onOpenChange={setAperto}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>Elimina</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare {titolo}?</AlertDialogTitle>
          <AlertDialogDescription>
            L&apos;Atto normativo e tutti i suoi collegamenti verranno eliminati. L&apos;operazione non
            si può annullare.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={esegui}>
          <input type="hidden" name="id" value={id} />
          {stato?.errore && (
            <Alert variant="destructive" className="mb-4">
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
  );
}
