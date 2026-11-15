import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
          <Select name="settore" defaultValue={filtri.settoreId?.toString()}>
            <SelectTrigger className="min-w-48">
              <SelectValue placeholder="Tutti" />
            </SelectTrigger>
            <SelectContent>
            {settori.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.nome}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tema
          <Select name="tema" defaultValue={filtri.temaId?.toString()}>
            <SelectTrigger className="min-w-48">
              <SelectValue placeholder="Tutti" />
            </SelectTrigger>
            <SelectContent>
            {temi.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()}>
                {t.nome}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Stato
          <Select name="stato" defaultValue={filtri.stato}>
            <SelectTrigger className="min-w-56">
              <SelectValue placeholder="Tutti (esclusi gli abrogati)" />
            </SelectTrigger>
            <SelectContent>
            {stato.enumValues.map((s) => (
              <SelectItem key={s} value={s}>
                {etichettaStato[s]}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
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
