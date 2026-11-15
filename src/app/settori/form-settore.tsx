"use client";

import { useActionState } from "react";
import Link from "next/link";
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
      <label className="flex flex-col gap-1 text-sm">
        Nome
        {/* key: dopo un errore il campo riparte da quanto digitato */}
        <input
          key={`nome-${valori.nome}`}
          name="nome"
          defaultValue={valori.nome}
          required
          aria-invalid={!!stato?.errori?.nome}
          aria-describedby={stato?.errori?.nome ? "errore-nome" : undefined}
          className="rounded border px-3 py-2"
        />
        {stato?.errori?.nome && (
          <span id="errore-nome" role="alert" className="text-red-600">
            {stato.errori.nome}
          </span>
        )}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Descrizione (attività incluse)
        <textarea
          key={`descrizione-${valori.descrizione}`}
          name="descrizione"
          defaultValue={valori.descrizione}
          rows={4}
          className="rounded border px-3 py-2"
        />
      </label>
      {stato?.errore && (
        <p role="alert" className="text-sm text-red-600">
          {stato.errore}
        </p>
      )}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={inCorso}
          className="rounded border px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {inCorso ? "Salvataggio…" : etichettaInvio}
        </button>
        <Link href={hrefAnnulla} className="text-sm hover:underline">
          Annulla
        </Link>
      </div>
    </form>
  );
}
