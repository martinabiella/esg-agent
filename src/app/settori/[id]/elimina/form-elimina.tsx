"use client";

import { useActionState } from "react";
import Link from "next/link";
import { eliminaSettoreAzione } from "../../azioni";

export function FormElimina({ id, bloccato }: { id: number; bloccato: boolean }) {
  const [stato, esegui, inCorso] = useActionState(eliminaSettoreAzione, undefined);
  return (
    <form action={esegui} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      {stato?.errore && (
        <p role="alert" className="text-sm text-red-600">
          {stato.errore}
        </p>
      )}
      <div className="flex items-center gap-4">
        {!bloccato && (
          <button
            type="submit"
            disabled={inCorso}
            className="rounded border border-red-600 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
          >
            {inCorso ? "Eliminazione…" : "Elimina definitivamente"}
          </button>
        )}
        <Link href={`/settori/${id}`} className="text-sm hover:underline">
          {bloccato ? "Torna al Settore" : "Annulla"}
        </Link>
      </div>
    </form>
  );
}
