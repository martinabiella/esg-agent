"use client";

import { useActionState } from "react";
import { reimposta } from "./azioni";

export function FormReimposta({ token }: { token: string }) {
  const [stato, azione, inCorso] = useActionState(reimposta, undefined);
  return (
    <form action={azione} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="flex flex-col gap-1 text-sm">
        Nuova password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="border rounded px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Conferma password
        <input
          name="conferma"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="border rounded px-3 py-2"
        />
      </label>
      {stato?.errore && (
        <p role="alert" className="text-sm text-red-600">
          {stato.errore}
        </p>
      )}
      <button
        type="submit"
        disabled={inCorso}
        className="rounded border px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        {inCorso ? "Salvataggio…" : "Imposta password"}
      </button>
    </form>
  );
}
