"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CampiSettore } from "@/lib/settore";
import type { StatoModulo } from "./azioni";

type Azione = (stato: StatoModulo, formData: FormData) => Promise<StatoModulo>;

export function FormSettore({
  azione,
  id,
  iniziali,
  hrefAnnulla,
  etichettaInvio,
}: {
  azione: Azione;
  id?: number;
  iniziali: CampiSettore;
  hrefAnnulla: string;
  etichettaInvio: string;
}) {
  const [stato, esegui, inCorso] = useActionState(azione, undefined);
  const valori = stato?.valori ?? iniziali;
  return (
    <form action={esegui} className="mt-6 flex max-w-xl flex-col gap-4">
      {id !== undefined && <input type="hidden" name="id" value={id} />}
      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome</Label>
        {/* key: dopo un errore il campo riparte da quanto digitato */}
        <Input
          key={`nome-${valori.nome}`}
          id="nome"
          name="nome"
          defaultValue={valori.nome}
          required
          aria-invalid={!!stato?.errori?.nome}
          aria-describedby={stato?.errori?.nome ? "errore-nome" : undefined}
        />
        {stato?.errori?.nome && (
          <p id="errore-nome" role="alert" className="text-sm text-destructive">
            {stato.errori.nome}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="descrizione">Descrizione (attività incluse)</Label>
        <Textarea
          key={`descrizione-${valori.descrizione}`}
          id="descrizione"
          name="descrizione"
          defaultValue={valori.descrizione}
          rows={4}
        />
      </div>
      {stato?.errore && (
        <Alert variant="destructive">
          <AlertDescription>{stato.errore}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={inCorso}>
          {inCorso ? "Salvataggio…" : etichettaInvio}
        </Button>
        <Button variant="link" render={<Link href={hrefAnnulla} />}>
          Annulla
        </Button>
      </div>
    </form>
  );
}
