import { Suspense } from "react";
import { Caricamento } from "@/app/caricamento";
import { usiSettore } from "@/db/settori";
import { valutaEliminazione } from "@/lib/settore";
import { settoreDaParams } from "../../trova-da-params";
import { FormElimina } from "./form-elimina";

export default function EliminaSettorePage(props: PageProps<"/settori/[id]/elimina">) {
  return (
    <div>
      <Suspense fallback={<Caricamento />}>
        <Conferma params={props.params} />
      </Suspense>
    </div>
  );
}

async function Conferma({ params }: { params: Promise<{ id: string }> }) {
  const settore = await settoreDaParams(params);
  const id = settore.id;
  const decisione = valutaEliminazione(await usiSettore(id));
  return (
    <>
      <h1 className="text-2xl font-semibold">Elimina Settore</h1>
      <p className="mt-4">
        Stai per eliminare il Settore <strong>{settore.nome}</strong>. L&apos;operazione non si può annullare.
      </p>
      {decisione.consentita ? (
        decisione.avviso && <p className="mt-2 text-sm">{decisione.avviso}</p>
      ) : (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {decisione.messaggio}
        </p>
      )}
      <FormElimina id={id} bloccato={!decisione.consentita} />
    </>
  );
}
