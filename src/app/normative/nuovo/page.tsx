import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Caricamento } from "@/app/caricamento";
import { elencoAttiPerRelazione, elencoTemi } from "@/db/atti";
import { elencoSettori } from "@/db/settori";
import { trovaNotizia } from "@/db/notizie";
import { puoCreareAttoDaNotizia, valoriAttoDaNotizia } from "@/lib/atto-da-notizia";
import { idIntero } from "@/lib/id";
import { creaAttoAzione, creaAttoDaNotiziaAzione } from "../azioni";
import { FormAtto } from "../form-atto";
import { valoriAttoNuovo } from "../valori";

export const metadata = { title: "Nuovo Atto · Monitoraggio ESG" };

export default function NuovoAttoPage(props: PageProps<"/normative/nuovo">) {
  return (
    <div>
      <Button variant="link" render={<Link href="/normative" />}>← Tutte le Normative</Button>
      <h1 className="mt-2 text-2xl font-semibold">Nuovo Atto normativo</h1>
      <p className="mt-2 text-sm text-muted-foreground">I campi con * sono obbligatori. Il salvataggio conferma i criteri indicati.</p>
      <Suspense fallback={<Caricamento />}><Modulo searchParams={props.searchParams} /></Suspense>
    </div>
  );
}

async function Modulo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const notiziaId = idIntero((await searchParams).notizia);
  const [settori, temi, atti, notizia] = await Promise.all([
    elencoSettori(),
    elencoTemi(),
    elencoAttiPerRelazione(),
    notiziaId === null ? null : trovaNotizia(notiziaId),
  ]);
  // Una Notizia inesistente o già collegata a un Atto non precompila nulla: si apre il form vuoto.
  if (notiziaId !== null && notizia && puoCreareAttoDaNotizia(notizia)) {
    return (
      <FormAtto
        azione={creaAttoDaNotiziaAzione.bind(null, notiziaId)}
        iniziali={valoriAttoDaNotizia(notizia)}
        settori={settori}
        temi={temi}
        atti={atti}
        etichettaInvio="Crea Atto"
        tornaA="/"
      />
    );
  }
  return <FormAtto azione={creaAttoAzione} iniziali={valoriAttoNuovo()} settori={settori} temi={temi} atti={atti} etichettaInvio="Crea Atto" />;
}
