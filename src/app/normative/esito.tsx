import { Alert, AlertDescription } from "@/components/ui/alert";

export function Esito({ esito }: { esito: string | string[] | undefined }) {
  if (esito !== "eliminato") return null;
  return (
    <Alert role="status" className="mt-4 border-green-600 text-green-700">
      <AlertDescription>Atto normativo eliminato.</AlertDescription>
    </Alert>
  );
}
