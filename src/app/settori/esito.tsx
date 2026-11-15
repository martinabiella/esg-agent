const MESSAGGI: Record<string, string> = {
  creato: "Settore creato.",
  modificato: "Modifiche salvate.",
  eliminato: "Settore eliminato.",
};

// Messaggio di esito dopo un salvataggio (parametro ?esito=… dell'indirizzo).
export function Esito({ esito }: { esito: string | string[] | undefined }) {
  const messaggio = typeof esito === "string" ? MESSAGGI[esito] : undefined;
  if (!messaggio) return null;
  return (
    <p role="status" className="mt-4 rounded border border-green-600 px-3 py-2 text-sm text-green-700">
      {messaggio}
    </p>
  );
}
