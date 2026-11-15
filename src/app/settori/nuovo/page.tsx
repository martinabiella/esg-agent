import Link from "next/link";
import { creaSettoreAzione } from "../azioni";
import { FormSettore } from "../form-settore";

export const metadata = { title: "Nuovo Settore · Monitoraggio ESG" };

export default function NuovoSettorePage() {
  return (
    <div>
      <Link href="/settori" className="text-sm hover:underline">
        ← Tutti i Settori
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Nuovo Settore</h1>
      <FormSettore
        azione={creaSettoreAzione}
        iniziali={{ nome: "", descrizione: "" }}
        annulla="/settori"
        etichettaInvio="Crea Settore"
      />
    </div>
  );
}
