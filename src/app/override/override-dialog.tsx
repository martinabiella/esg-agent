"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Valutazione } from "@/db/applicabilita";
import { etichettaApplicabilita } from "@/lib/etichette";
import {
  rimuoviOverrideAzione,
  salvaOverrideAzione,
  type StatoOverride,
} from "./azioni";

// Override di una coppia Cliente–Atto. Condiviso dalla scheda dell'Atto e dal drawer del Cliente.
export function OverrideDialog({
  clienteId,
  attoId,
  cliente,
  atto,
  valutazione,
}: {
  clienteId: number;
  attoId: number;
  cliente: string;
  atto: string;
  valutazione: Valutazione;
}) {
  const [aperto, setAperto] = useState(false);
  const { calcolata, override } = valutazione;

  const [stato, salva, inCorso] = useActionState(
    async (precedente: StatoOverride, formData: FormData) => {
      const nuovo = await salvaOverrideAzione(precedente, formData);
      if (nuovo?.ok) setAperto(false);
      return nuovo;
    },
    undefined,
  );
  const [statoRimozione, rimuovi, inRimozione] = useActionState(
    async (precedente: StatoOverride, formData: FormData) => {
      const nuovo = await rimuoviOverrideAzione(precedente, formData);
      if (nuovo?.ok) setAperto(false);
      return nuovo;
    },
    undefined,
  );

  const errore = stato?.errore ?? statoRimozione?.errore;
  const idMotivazione = `motivazione-${clienteId}-${attoId}`;

  return (
    <Dialog open={aperto} onOpenChange={setAperto}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {override ? "Modifica decisione" : "Override"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override dell&apos;Applicabilità</DialogTitle>
          <DialogDescription>
            {cliente} · {atto}. Esito calcolato: {etichettaApplicabilita[calcolata]}. La decisione
            sostituisce il calcolo finché non viene tolta.
          </DialogDescription>
        </DialogHeader>

        {errore && (
          <Alert variant="destructive">
            <AlertDescription>{errore}</AlertDescription>
          </Alert>
        )}

        <form action={salva} className="grid gap-4">
          <input type="hidden" name="clienteId" value={clienteId} />
          <input type="hidden" name="attoId" value={attoId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor={idMotivazione}>Motivazione *</Label>
            <Textarea
              id={idMotivazione}
              name="motivazione"
              rows={4}
              required
              defaultValue={stato?.motivazione ?? override?.motivazione ?? ""}
              aria-invalid={!!stato?.errori?.motivazione}
              aria-describedby={stato?.errori?.motivazione ? `errore-${idMotivazione}` : undefined}
            />
            {stato?.errori?.motivazione && (
              <p id={`errore-${idMotivazione}`} role="alert" className="text-sm text-destructive">
                {stato.errori.motivazione}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" name="esito" value="non_applicabile" variant="outline" disabled={inCorso}>
              Non applicabile
            </Button>
            <Button type="submit" name="esito" value="applicabile" disabled={inCorso}>
              Applicabile
            </Button>
          </DialogFooter>
        </form>

        {override && (
          <form action={rimuovi} className="border-t pt-4">
            <input type="hidden" name="clienteId" value={clienteId} />
            <input type="hidden" name="attoId" value={attoId} />
            <Button type="submit" variant="ghost" size="sm" disabled={inRimozione}>
              Rimuovi decisione e torna al calcolo
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
