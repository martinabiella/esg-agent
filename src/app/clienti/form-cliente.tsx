"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ErroriCliente, ValoriModulo } from "@/lib/cliente";
import {
  type EsitoOperazione,
  type StatoModulo,
} from "./azioni";
import { SelezioneMultipla, type Voce } from "./selezione-multipla";

type Azione = (stato: StatoModulo, formData: FormData) => Promise<StatoModulo>;

function Campo({
  nome,
  etichetta,
  errori,
  suggerimento,
  children,
}: {
  nome: keyof ValoriModulo;
  etichetta: string;
  errori?: ErroriCliente;
  suggerimento?: string;
  children: ReactNode;
}) {
  const errore = errori?.[nome];
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={nome}>{etichetta}</Label>
      {children}
      {suggerimento && !errore && (
        <p id={`aiuto-${nome}`} className="text-xs text-muted-foreground">
          {suggerimento}
        </p>
      )}
      {errore && (
        <p id={`errore-${nome}`} role="alert" className="text-sm text-destructive">
          {errore}
        </p>
      )}
    </div>
  );
}

export function FormCliente({
  azione,
  id,
  iniziali,
  settori,
  paesi,
  etichettaInvio,
  onAnnulla,
  onSalvato,
}: {
  azione: Azione;
  id?: number;
  iniziali: ValoriModulo;
  settori: Voce[];
  paesi: Voce[];
  etichettaInvio: string;
  onAnnulla: () => void;
  onSalvato: (id: number, esito: EsitoOperazione) => void;
}) {
  const [stato, esegui, inCorso] = useActionState(azione, undefined);
  const valori = stato?.valori ?? iniziali;
  const errori = stato?.errori;
  const salvato = stato?.salvato;

  useEffect(() => {
    if (salvato) onSalvato(salvato.id, salvato.esito);
  }, [salvato, onSalvato]);

  const descritto = (nome: keyof ValoriModulo, aiuto = false) =>
    errori?.[nome] ? `errore-${nome}` : aiuto ? `aiuto-${nome}` : undefined;

  return (
    <form action={esegui} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {id !== undefined && <input type="hidden" name="id" value={id} />}
        <Campo nome="ragioneSociale" etichetta="Ragione sociale *" errori={errori}>
          {/* key: dopo un errore il campo riparte da quanto digitato */}
          <Input
            key={`rs-${valori.ragioneSociale}`}
            id="ragioneSociale"
            name="ragioneSociale"
            defaultValue={valori.ragioneSociale}
            required
            aria-invalid={!!errori?.ragioneSociale}
            aria-describedby={descritto("ragioneSociale")}
          />
        </Campo>
        <Campo nome="attivitaSpecifica" etichetta="Attività specifica *" errori={errori}>
          <Input
            key={`as-${valori.attivitaSpecifica}`}
            id="attivitaSpecifica"
            name="attivitaSpecifica"
            defaultValue={valori.attivitaSpecifica}
            required
            aria-invalid={!!errori?.attivitaSpecifica}
            aria-describedby={descritto("attivitaSpecifica")}
          />
        </Campo>
        <Campo nome="settori" etichetta="Settori *" errori={errori}>
          <SelezioneMultipla
            id="settori"
            name="settori"
            voci={settori}
            iniziali={valori.settori}
            segnaposto="Cerca un Settore…"
            vuoto="Nessun Settore trovato."
            nonValido={!!errori?.settori}
            descrittoDa={descritto("settori")}
          />
        </Campo>
        <Campo nome="dipendenti" etichetta="Dipendenti" errori={errori}>
          <Input
            key={`di-${valori.dipendenti}`}
            id="dipendenti"
            name="dipendenti"
            inputMode="numeric"
            defaultValue={valori.dipendenti}
            aria-invalid={!!errori?.dipendenti}
            aria-describedby={descritto("dipendenti")}
          />
        </Campo>
        <Campo
          nome="fatturato"
          etichetta="Fatturato (€)"
          errori={errori}
          suggerimento="Importo in euro, senza separatore delle migliaia (es. 1500000,50)."
        >
          <Input
            key={`fa-${valori.fatturato}`}
            id="fatturato"
            name="fatturato"
            inputMode="decimal"
            defaultValue={valori.fatturato}
            aria-invalid={!!errori?.fatturato}
            aria-describedby={descritto("fatturato", true)}
          />
        </Campo>
        <Campo
          nome="annoRiferimento"
          etichetta="Anno di riferimento"
          errori={errori}
          suggerimento="Obbligatorio se indichi il fatturato."
        >
          <Input
            key={`an-${valori.annoRiferimento}`}
            id="annoRiferimento"
            name="annoRiferimento"
            inputMode="numeric"
            defaultValue={valori.annoRiferimento}
            aria-invalid={!!errori?.annoRiferimento}
            aria-describedby={descritto("annoRiferimento", true)}
          />
        </Campo>
        <Campo nome="paesi" etichetta="Localizzazione (paesi)" errori={errori}>
          <SelezioneMultipla
            id="paesi"
            name="paesi"
            voci={paesi}
            iniziali={valori.paesi}
            segnaposto="Cerca un paese…"
            vuoto="Nessun paese trovato."
            nonValido={!!errori?.paesi}
            descrittoDa={descritto("paesi")}
          />
        </Campo>
        <Campo nome="note" etichetta="Note" errori={errori}>
          <Textarea
            key={`no-${valori.note}`}
            id="note"
            name="note"
            rows={4}
            defaultValue={valori.note}
          />
        </Campo>
        {stato?.errore && (
          <Alert variant="destructive">
            <AlertDescription>{stato.errore}</AlertDescription>
          </Alert>
        )}
      </div>
      <div className="flex items-center gap-2 border-t p-4">
        <Button type="submit" disabled={inCorso}>
          {inCorso ? "Salvataggio…" : etichettaInvio}
        </Button>
        <Button type="button" variant="ghost" onClick={onAnnulla}>
          Annulla
        </Button>
      </div>
    </form>
  );
}
