"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { StatoControllo } from "./azioni-avviso";

// Un pulsante che esegue una delle azioni «segna come controllato» dell'Avviso di conferma.
export function PulsanteControllato({
  azione,
  id,
  etichetta,
}: {
  azione: (stato: StatoControllo, formData: FormData) => Promise<StatoControllo>;
  id?: number;
  etichetta: string;
}) {
  const [stato, esegui, inCorso] = useActionState(azione, undefined);
  return (
    <form action={esegui} className="flex flex-col items-end gap-1">
      {id !== undefined && <input type="hidden" name="id" value={id} />}
      <Button type="submit" variant="outline" size="sm" disabled={inCorso}>
        {inCorso ? "Salvo…" : etichetta}
      </Button>
      {stato?.errore && (
        <p role="alert" className="text-xs text-destructive">
          {stato.errore}
        </p>
      )}
    </form>
  );
}
