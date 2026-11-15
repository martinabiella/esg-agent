import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ClienteNonTrovato() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold">Cliente non trovato</h1>
      <p className="mt-2 text-muted-foreground">
        Il Cliente richiesto non esiste o l&apos;indirizzo non è valido.
      </p>
      <Button variant="link" render={<Link href="/clienti" />} className="mt-4 px-0">
        ← Tutti i Clienti
      </Button>
    </div>
  );
}
