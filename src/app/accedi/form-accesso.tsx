"use client";

import { useActionState } from "react";
import { accedi } from "./azioni";

export function FormAccesso({ dopo }: { dopo: string }) {
  const [stato, azione, inCorso] = useActionState(accedi, undefined);
  return (
    <form action={azione} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="dopo" value={dopo} />
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="border rounded px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
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
        {inCorso ? "Accesso in corso…" : "Accedi"}
      </button>
    </form>
  );
}
