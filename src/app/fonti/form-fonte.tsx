"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FonteEsistente } from "@/db/fonti";
import { etichettaTipoFonte } from "@/lib/etichette";
import { type ErroriFonte, TIPI_FONTE, type ValoriFonte } from "@/lib/fonte";
import { type EsitoOperazione, type StatoModulo } from "./azioni";

type Azione = (stato: StatoModulo, formData: FormData) => Promise<StatoModulo>;

const VOCI_TIPO = TIPI_FONTE.map((t) => ({ value: t, label: etichettaTipoFonte[t] }));

function Campo({
  nome,
  etichetta,
  errori,
  suggerimento,
  extra,
  children,
}: {
  nome: keyof ValoriFonte;
  etichetta: string;
  errori?: ErroriFonte;
  suggerimento?: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const errore = errori?.[nome];
  return (
    <Field data-invalid={!!errore}>
      <FieldLabel htmlFor={nome}>{etichetta}</FieldLabel>
      {children}
      {suggerimento && (
        <FieldDescription id={`aiuto-${nome}`} className="text-xs">
          {suggerimento}
        </FieldDescription>
      )}
      {errore && (
        <FieldError id={`errore-${nome}`}>
          {errore} {extra}
        </FieldError>
      )}
    </Field>
  );
}

// Id per aria-describedby: il suggerimento resta visibile anche con l'errore.
function descrittoDa(nome: keyof ValoriFonte, errori: ErroriFonte | undefined, aiuto: boolean) {
  const id = [aiuto && `aiuto-${nome}`, errori?.[nome] && `errore-${nome}`].filter(Boolean).join(" ");
  return id || undefined;
}

function ApriEsistente({
  fonte,
  onApri,
}: {
  fonte?: FonteEsistente;
  onApri: (id: number) => void;
}) {
  if (!fonte) return null;
  return (
    <Button type="button" variant="link" className="h-auto p-0" onClick={() => onApri(fonte.id)}>
      Apri «{fonte.nome}»
    </Button>
  );
}

export function FormFonte({
  azione,
  id,
  iniziali,
  etichettaInvio,
  onAnnulla,
  onSalvato,
  onApriEsistente,
}: {
  azione: Azione;
  id?: number;
  iniziali: ValoriFonte;
  etichettaInvio: string;
  onAnnulla: () => void;
  onSalvato: (id: number, esito: EsitoOperazione) => void;
  onApriEsistente: (id: number) => void;
}) {
  const [stato, esegui, inCorso] = useActionState(azione, undefined);
  const valori = stato?.valori ?? iniziali;
  const errori = stato?.errori;
  const salvato = stato?.salvato;
  const modifica = id !== undefined;

  useEffect(() => {
    if (salvato) onSalvato(salvato.id, salvato.esito);
  }, [salvato, onSalvato]);

  const descritto = (nome: keyof ValoriFonte, aiuto = false) => descrittoDa(nome, errori, aiuto);

  return (
    <form action={esegui} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {modifica && <input type="hidden" name="id" value={id} />}
        <Campo
          nome="nome"
          etichetta="Nome *"
          errori={errori}
          extra={<ApriEsistente fonte={stato?.conflitti?.nome} onApri={onApriEsistente} />}
        >
          {/* key: dopo un errore il campo riparte da quanto digitato */}
          <Input
            key={`no-${valori.nome}`}
            id="nome"
            name="nome"
            defaultValue={valori.nome}
            required
            aria-invalid={!!errori?.nome}
            aria-describedby={descritto("nome")}
          />
        </Campo>
        <Campo
          nome="url"
          etichetta="URL *"
          errori={errori}
          suggerimento={
            modifica
              ? "Indirizzo completo, che inizia con http:// o https://. Se lo cambi, la Fonte torna «Mai controllata»."
              : "Indirizzo completo, che inizia con http:// o https://."
          }
          extra={<ApriEsistente fonte={stato?.conflitti?.url} onApri={onApriEsistente} />}
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
        <Campo
          nome="tipo"
          etichetta="Tipo *"
          errori={errori}
          suggerimento={
            "Solo le Fonti ufficiali possono cambiare lo Stato degli Atti. Le editoriali servono per Notizie e scoperta." +
            (modifica ? " Il cambio di tipo vale dalla prossima Ricerca." : "")
          }
        >
          <Select
            key={`ti-${valori.tipo}`}
            id="tipo"
            name="tipo"
            items={VOCI_TIPO}
            defaultValue={valori.tipo || null}
            required
          >
            <SelectTrigger
              id="tipo"
              className="h-9 w-full"
              aria-invalid={!!errori?.tipo}
              aria-describedby={descritto("tipo", true)}
            >
              <SelectValue placeholder="Scegli…" />
            </SelectTrigger>
            <SelectContent>
              {VOCI_TIPO.map((voce) => (
                <SelectItem key={voce.value} value={voce.value}>
                  {voce.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
