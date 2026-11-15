import Link from "next/link";
import { Button } from "@/components/ui/button";
import { creaSettoreAzione } from "../azioni";
import { FormSettore } from "../form-settore";

export const metadata = { title: "Nuovo Settore · Monitoraggio ESG" };

export default function NuovoSettorePage() {
  return (
    <div>
      <Button variant="link" render={<Link href="/settori" />}>
        ← Tutti i Settori
      </Button>
      <h1 className="mt-2 text-2xl font-semibold">Nuovo Settore</h1>
      <FormSettore
        azione={creaSettoreAzione}
        iniziali={{ nome: "", descrizione: "" }}
        hrefAnnulla="/settori"
        etichettaInvio="Crea Settore"
      />
    </div>
  );
}
