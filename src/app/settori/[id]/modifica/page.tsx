import { Suspense } from "react";
import Link from "next/link";
import { Caricamento } from "@/app/caricamento";
import { settoreDaParams } from "../../trova-da-params";
import { aggiornaSettoreAzione } from "../../azioni";
import { FormSettore } from "../../form-settore";

export default function ModificaSettorePage(props: PageProps<"/settori/[id]/modifica">) {
  return (
    <div>
      <Suspense fallback={<Caricamento />}>
        <Modulo params={props.params} />
      </Suspense>
    </div>
  );
}

async function Modulo({ params }: { params: Promise<{ id: string }> }) {
  const settore = await settoreDaParams(params);
  const id = settore.id;
  return (
    <>
      <Link href={`/settori/${id}`} className="text-sm hover:underline">
        ← {settore.nome}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Modifica Settore</h1>
      <FormSettore
        azione={aggiornaSettoreAzione}
        id={id}
        iniziali={{ nome: settore.nome, descrizione: settore.descrizione }}
        hrefAnnulla={`/settori/${id}`}
        etichettaInvio="Salva modifiche"
      />
    </>
  );
}
