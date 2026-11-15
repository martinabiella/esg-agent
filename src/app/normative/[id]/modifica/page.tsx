import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Caricamento } from "@/app/caricamento";
import { elencoAttiPerRelazione, elencoTemi } from "@/db/atti";
import { elencoSettori } from "@/db/settori";
import { aggiornaAttoAzione } from "../../azioni";
import { FormAtto } from "../../form-atto";
import { valoriDaAtto } from "../../valori";
import { attoDaParams } from "../../trova-da-params";

export const metadata = { title: "Modifica Atto · Monitoraggio ESG" };

export default function ModificaAttoPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<Caricamento />}><Modulo params={params} /></Suspense>;
}

async function Modulo({ params }: { params: Promise<{ id: string }> }) {
  const atto = await attoDaParams(params);
  const [settori, temi, atti] = await Promise.all([
    elencoSettori(),
    elencoTemi(),
    elencoAttiPerRelazione(atto.id),
  ]);
  return (
    <div>
      <Button variant="link" render={<Link href={`/normative/${atto.id}`} />}>← {atto.titolo}</Button>
      <h1 className="mt-2 text-2xl font-semibold">Modifica Atto normativo</h1>
      <p className="mt-2 text-sm text-muted-foreground">I campi con * sono obbligatori. Il salvataggio conferma i criteri indicati.</p>
      <FormAtto id={atto.id} azione={aggiornaAttoAzione} iniziali={valoriDaAtto(atto)} settori={settori} temi={temi} atti={atti} etichettaInvio="Salva modifiche" />
    </div>
  );
}
