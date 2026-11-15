"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelezioneMultipla, type Voce } from "@/app/clienti/selezione-multipla";
import type { ErroriNotizia, ValoriNotizia } from "@/lib/notizia";
import { type EsitoOperazione, type StatoModulo } from "./azioni";

type Azione = (stato: StatoModulo, formData: FormData) => Promise<StatoModulo>;

function Campo({
  nome,
  etichetta,
  errori,
  suggerimento,
  extra,
  children,
}: {
  nome: keyof ValoriNotizia;
  etichetta: string;
  errori?: ErroriNotizia;
  suggerimento?: string;
  extra?: ReactNode;
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
          {errore} {extra}
        </p>
      )}
    </div>
  );
}

export function FormNotizia({
  azione,
  id,
  iniziali,
  atti,
  etichettaInvio,
  onAnnulla,
  onSalvato,
  onApriEsistente,
}: {
  azione: Azione;
  id?: number;
  iniziali: ValoriNotizia;
  atti: Voce[];
  etichettaInvio: string;
  onAnnulla: () => void;
  onSalvato: (id: number, esito: EsitoOperazione) => void;
  onApriEsistente: (id: number) => void;
}) {
  const [stato, esegui, inCorso] = useActionState(azione, undefined);
  const valori = stato?.valori ?? iniziali;
  const errori = stato?.errori;
  const salvato = stato?.salvato;

  useEffect(() => {
    if (salvato) onSalvato(salvato.id, salvato.esito);
  }, [salvato, onSalvato]);

  const descritto = (nome: keyof ValoriNotizia, aiuto = false) =>
    errori?.[nome] ? `errore-${nome}` : aiuto ? `aiuto-${nome}` : undefined;

  return (
    <form action={esegui} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {id !== undefined && <input type="hidden" name="id" value={id} />}
        <Campo nome="titolo" etichetta="Titolo *" errori={errori}>
          {/* key: dopo un errore il campo riparte da quanto digitato */}
          <Input
            key={`ti-${valori.titolo}`}
            id="titolo"
            name="titolo"
            defaultValue={valori.titolo}
            required
            aria-invalid={!!errori?.titolo}
            aria-describedby={descritto("titolo")}
          />
        </Campo>
        <Campo nome="fonte" etichetta="Fonte *" errori={errori}>
          <Input
            key={`fo-${valori.fonte}`}
            id="fonte"
            name="fonte"
            defaultValue={valori.fonte}
            required
            aria-invalid={!!errori?.fonte}
            aria-describedby={descritto("fonte")}
          />
        </Campo>
        <Campo
          nome="url"
          etichetta="URL *"
          errori={errori}
          suggerimento="Indirizzo completo, che inizia con http:// o https://."
          extra={
            stato?.esistente && (
              <button
                type="button"
                className="underline"
                onClick={() => onApriEsistente(stato.esistente!.id)}
              >
                Apri «{stato.esistente.titolo}»
              </button>
            )
          }
        >
          <Input
            key={`ur-${valori.url}`}
            id="url"
            name="url"
            inputMode="url"
            defaultValue={valori.url}
            required
            aria-invalid={!!errori?.url}
            aria-describedby={descritto("url", true)}
          />
        </Campo>
        <Campo nome="data" etichetta="Data" errori={errori}>
          <Input
            key={`da-${valori.data}`}
            id="data"
            name="data"
            type="date"
            defaultValue={valori.data}
            aria-invalid={!!errori?.data}
            aria-describedby={descritto("data")}
          />
        </Campo>
        <Campo nome="riassunto" etichetta="Riassunto" errori={errori}>
          <Textarea
            key={`ri-${valori.riassunto}`}
            id="riassunto"
            name="riassunto"
            rows={5}
            defaultValue={valori.riassunto}
          />
        </Campo>
        <Campo nome="atti" etichetta="Atti collegati" errori={errori}>
          <SelezioneMultipla
            id="atti"
            name="atti"
            voci={atti}
            iniziali={valori.atti}
            segnaposto="Cerca un Atto per titolo…"
            vuoto="Nessun Atto trovato."
            nonValido={!!errori?.atti}
            descrittoDa={descritto("atti")}
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
