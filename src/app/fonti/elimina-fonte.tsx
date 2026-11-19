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
import { eliminaFonteAzione, type StatoModulo } from "./azioni";

function attiCheRestano(attiScoperti: number) {
  if (attiScoperti === 0) return null;
  return attiScoperti === 1
    ? "1 Atto scoperto da questa Fonte resta nel catalogo, senza origine."
    : `${attiScoperti} Atti scoperti da questa Fonte restano nel catalogo, senza origine.`;
}

export function EliminaFonte({
  id,
  nome,
  attiScoperti,
  onEliminata,
}: {
  id: number;
  nome: string;
  attiScoperti: number;
  onEliminata: () => void;
}) {
  const [aperto, setAperto] = useState(false);
  // onEliminata parte subito dopo l'azione e non da un effetto: la risposta
  // porta anche l'elenco aggiornato, in cui la Fonte non c'è più, e questo
  // componente sparisce insieme al drawer prima che un effetto possa girare.
  const [stato, esegui, inCorso] = useActionState(
    async (precedente: StatoModulo, formData: FormData) => {
      const esito = await eliminaFonteAzione(precedente, formData);
      if (esito?.salvato) onEliminata();
      return esito;
    },
    undefined,
  );

  return (
    <AlertDialog open={aperto} onOpenChange={setAperto}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>Elimina</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare {nome}?</AlertDialogTitle>
          <AlertDialogDescription>
            L&apos;agente non controllerà più questa Fonte. {attiCheRestano(attiScoperti)} Le Notizie non
            cambiano e lo storico delle Ricerche resta. L&apos;operazione non si può annullare.
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
  );
}
