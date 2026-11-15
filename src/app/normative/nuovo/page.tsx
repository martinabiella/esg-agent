import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Caricamento } from "@/app/caricamento";
import { elencoAttiPerRelazione, elencoTemi } from "@/db/atti";
import { elencoSettori } from "@/db/settori";
import { creaAttoAzione } from "../azioni";
import { FormAtto } from "../form-atto";
import { valoriAttoNuovo } from "../valori";

export const metadata = { title: "Nuovo Atto · Monitoraggio ESG" };

export default function NuovoAttoPage() {
  return (
    <div>
      <Button variant="link" render={<Link href="/normative" />}>← Tutte le Normative</Button>
      <h1 className="mt-2 text-2xl font-semibold">Nuovo Atto normativo</h1>
      <p className="mt-2 text-sm text-muted-foreground">I campi con * sono obbligatori. Il salvataggio conferma i criteri indicati.</p>
      <Suspense fallback={<Caricamento />}><Modulo /></Suspense>
    </div>
  );
}

async function Modulo() {
  const [settori, temi, atti] = await Promise.all([elencoSettori(), elencoTemi(), elencoAttiPerRelazione()]);
  return <FormAtto azione={creaAttoAzione} iniziali={valoriAttoNuovo()} settori={settori} temi={temi} atti={atti} etichettaInvio="Crea Atto" />;
}
