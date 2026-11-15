import { Alert, AlertDescription } from "@/components/ui/alert";
import type { EsitoSalvataggio } from "@/lib/settore";

const MESSAGGI: Record<EsitoSalvataggio, string> = {
  creato: "Settore creato.",
  modificato: "Modifiche salvate.",
  eliminato: "Settore eliminato.",
};

// Messaggio di esito dopo un salvataggio (parametro ?esito=… dell'indirizzo).
export function Esito({ esito }: { esito: string | string[] | undefined }) {
  const messaggio = typeof esito === "string" ? MESSAGGI[esito as EsitoSalvataggio] : undefined;
  if (!messaggio) return null;
  return (
    <Alert role="status" className="mt-4 border-green-600 text-green-700">
      <AlertDescription>{messaggio}</AlertDescription>
    </Alert>
  );
}
