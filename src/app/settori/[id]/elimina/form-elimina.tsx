"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { eliminaSettoreAzione } from "../../azioni";

export function FormElimina({ id, bloccato }: { id: number; bloccato: boolean }) {
  const [stato, esegui, inCorso] = useActionState(eliminaSettoreAzione, undefined);
  return (
    <form action={esegui} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      {stato?.errore && (
        <Alert variant="destructive">
          <AlertDescription>{stato.errore}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-center gap-4">
        {!bloccato && (
          <Button type="submit" variant="destructive" disabled={inCorso}>
            {inCorso ? "Eliminazione…" : "Elimina definitivamente"}
          </Button>
        )}
        <Button
          variant="link"
          render={<Link href={`/settori/${id}`} />}
        >
          {bloccato ? "Torna al Settore" : "Annulla"}
        </Button>
      </div>
    </form>
  );
}
