import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Caricamento } from "@/app/caricamento";
import { trovaSettore } from "@/db/settori";
import { idSettore } from "@/lib/settore";
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
  const id = idSettore((await params).id);
  if (id === null) notFound();
  const settore = await trovaSettore(id);
  if (!settore) notFound();
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
        annulla={`/settori/${id}`}
        etichettaInvio="Salva modifiche"
      />
    </>
  );
}
