import { Suspense } from "react";
import { Caricamento } from "@/app/caricamento";
import { attiPerSelezione, elencoNotizie, trovaNotizia } from "@/db/notizie";
import { notiziaIdDaParams } from "@/lib/notizia";
import { TabellaNotizie } from "./tabella-notizie";

export const metadata = { title: "Notizie · Monitoraggio ESG" };

export default function NotiziePage(props: PageProps<"/notizie">) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Notizie</h1>
      <Suspense fallback={<Caricamento />}>
        <Contenuto searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Contenuto({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = notiziaIdDaParams(await searchParams);
  const [notizie, notiziaAperta, atti] = await Promise.all([
    elencoNotizie(),
    id === null ? Promise.resolve(null) : trovaNotizia(id),
    attiPerSelezione(),
  ]);

  return <TabellaNotizie notizie={notizie} notiziaAperta={notiziaAperta} atti={atti} />;
}
