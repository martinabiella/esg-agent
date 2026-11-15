import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Caricamento } from "@/app/caricamento";
import { elencoAtti, elencoTemi } from "@/db/atti";
import { elencoSettori } from "@/db/settori";
import { stato } from "@/db/schema";
import { filtriAttiDaParams } from "@/lib/filtri-atti";
import { etichettaStato } from "@/lib/etichette";
import { Esito } from "./esito";
import { TabellaNormative } from "./tabella-normative";

export const metadata = { title: "Normative · Monitoraggio ESG" };

export default function NormativePage(props: PageProps<"/normative">) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Normative</h1>
        <Button render={<Link href="/normative/nuovo" />}>Nuovo Atto</Button>
      </div>
      <Suspense>
        <EsitoDaIndirizzo searchParams={props.searchParams} />
      </Suspense>
      <Suspense fallback={<Caricamento />}>
        <Contenuto searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function EsitoDaIndirizzo({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <Esito esito={(await searchParams).esito} />;
}

const selectClasse =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

async function Contenuto({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filtri = filtriAttiDaParams(await searchParams);
  const [atti, settori, temi] = await Promise.all([
    elencoAtti(filtri),
    elencoSettori(),
    elencoTemi(),
  ]);
  const filtriAttivi = Object.keys(filtri).length > 0;

  return (
    <>
      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Settore
          <select name="settore" defaultValue={filtri.settoreId ?? ""} className={selectClasse}>
            <option value="">Tutti</option>
            {settori.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tema
          <select name="tema" defaultValue={filtri.temaId ?? ""} className={selectClasse}>
            <option value="">Tutti</option>
            {temi.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Stato
          <select name="stato" defaultValue={filtri.stato ?? ""} className={selectClasse}>
            <option value="">Tutti (esclusi gli abrogati)</option>
            {stato.enumValues.map((s) => (
              <option key={s} value={s}>
                {etichettaStato[s]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">Filtra</Button>
        {filtriAttivi && (
          <Button variant="ghost" render={<Link href="/normative" />}>
            Azzera filtri
          </Button>
        )}
      </form>

      <TabellaNormative atti={atti} filtriAttivi={filtriAttivi} />
    </>
  );
}
