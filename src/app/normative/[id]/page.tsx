import { Suspense } from "react";
import Link from "next/link";
import { Bot, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { separaAvvisoAgente } from "@/lib/avviso-agente";
import { Button } from "@/components/ui/button";
import { Caricamento } from "@/app/caricamento";
import { attoDaParams } from "../trova-da-params";
import {
  etichettaGiurisdizione,
  etichettaProvenienza,
  etichettaStato,
  etichettaTipoAtto,
} from "@/lib/etichette";
import { righeSoglie } from "@/lib/soglie";
import { ClientiToccati } from "./clienti-toccati";
import { EliminaAtto } from "../elimina-atto";

export const metadata = { title: "Atto normativo · Monitoraggio ESG" };

export default function SchedaAttoPage(props: PageProps<"/normative/[id]">) {
  return (
    <div>
      <Link href="/normative" className="text-sm hover:underline">
        ← Tutte le Normative
      </Link>
      <Suspense fallback={<Caricamento />}>
        <Scheda params={props.params} />
      </Suspense>
    </div>
  );
}

// Le date del database sono "AAAA-MM-GG": nessun fuso orario da applicare.
function dataIt(valore: string | null) {
  if (!valore) return "data non indicata";
  const [a, m, g] = valore.split("-");
  return `${g}/${m}/${a}`;
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{titolo}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

const vuoto = (testo: string) => <p className="text-sm text-muted-foreground">{testo}</p>;

async function Scheda({ params }: { params: Promise<{ id: string }> }) {
  const atto = await attoDaParams(params);
  const soglie = righeSoglie(atto.criteriSoglie);
  const haCriteri = soglie.length > 0 || atto.criteriTesto !== "";
  const provenienza = etichettaProvenienza[atto.provenienzaContenuti];
  const { avviso, testo } = separaAvvisoAgente(atto.summary);

  return (
    <>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">{atto.titolo}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href={`/normative/${atto.id}/modifica`} />}>
            Modifica
          </Button>
          <EliminaAtto id={atto.id} titolo={atto.titolo} />
        </div>
      </div>
      {atto.identificativoUfficiale && (
        <p className="mt-1 text-sm text-muted-foreground">{atto.identificativoUfficiale}</p>
      )}
      <p className="mt-3 flex flex-wrap gap-2">
        <Badge variant="secondary">{etichettaGiurisdizione[atto.giurisdizione]}</Badge>
        <Badge variant="outline">{etichettaTipoAtto[atto.tipo]}</Badge>
        <Badge>{etichettaStato[atto.stato]}</Badge>
        {atto.nonRilevante && <Badge variant="destructive">Non rilevante</Badge>}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">Contenuti: {provenienza}</p>
      {atto.recepimentoEntro && (
        <p className="mt-2 text-sm text-muted-foreground">
          Recepimento entro il {dataIt(atto.recepimentoEntro)}
        </p>
      )}
      {atto.urlTesto && (
        <p className="mt-2 text-sm">
          <a href={atto.urlTesto} target="_blank" rel="noreferrer" className="underline">
            Testo ufficiale
          </a>
        </p>
      )}

      <Sezione titolo="Riepilogo">
        {avviso && (
          <div className="mb-3 flex max-w-3xl flex-col gap-2">
            {avviso.daNotizia && (
              <Alert>
                <Bot />
                <AlertTitle>Dati ricavati dall&apos;agente</AlertTitle>
                <AlertDescription>
                  Presi da{" "}
                  <a href={avviso.daNotizia} target="_blank" rel="noreferrer">
                    questo articolo
                  </a>
                  : controllali prima di fidarti.
                </AlertDescription>
              </Alert>
            )}
            {avviso.discrepanze.length > 0 && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>Gli articoli trovati non concordano</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {avviso.discrepanze.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        {testo ? <p className="max-w-3xl whitespace-pre-line">{testo}</p> : vuoto("Nessun riepilogo.")}
      </Sezione>

      <Sezione titolo="Criteri di applicabilità">
        {haCriteri ? (
          <>
            {soglie.length > 0 && (
              <ul className="list-disc pl-5">
                {soglie.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            {atto.criteriTesto && (
              <p className="mt-2 max-w-3xl whitespace-pre-line">{atto.criteriTesto}</p>
            )}
          </>
        ) : (
          vuoto("Nessun criterio indicato.")
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          {atto.criteriConfermati
            ? "Criteri confermati da una persona."
            : "Criteri non ancora confermati da una persona."}
        </p>
      </Sezione>

      <Sezione titolo="Settori">
        {atto.tuttiISettori ? (
          <p>Tutti i Settori</p>
        ) : atto.settori.length === 0 ? (
          vuoto("Nessun Settore collegato.")
        ) : (
          <ul className="flex flex-wrap gap-2">
            {atto.settori.map((s) => (
              <li key={s.id}>
                <Link href={`/settori/${s.id}`}>
                  <Badge variant="outline">{s.nome}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Sezione>

      <Sezione titolo="Clienti soggetti alla norma">
        <Suspense fallback={<Caricamento />}>
          <ClientiToccati atto={atto} />
        </Suspense>
      </Sezione>

      <Sezione titolo="Temi">
        {atto.temi.length === 0 ? (
          vuoto("Nessun Tema collegato.")
        ) : (
          <ul className="flex flex-wrap gap-2">
            {atto.temi.map((t) => (
              <li key={t.id}>
                <Badge variant="secondary">{t.nome}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Sezione>

      <Sezione titolo="Relazioni tra Atti">
        {atto.relazioni.length === 0 ? (
          vuoto("Nessuna Relazione indicata.")
        ) : (
          <ul className="divide-y border-y">
            {atto.relazioni.map((r) => (
              <li key={`${r.tipo}-${r.attoId}`} className="py-2 text-sm">
                <span className="font-medium">{r.tipo}</span>{" "}
                <Link href={`/normative/${r.attoId}`} className="underline">{r.titolo}</Link>
              </li>
            ))}
          </ul>
        )}
      </Sezione>

      <Sezione titolo="Notizie collegate">
        {atto.notizie.length === 0 ? (
          vuoto("Nessuna Notizia collegata.")
        ) : (
          <ul className="divide-y border-y">
            {atto.notizie.map((n) => (
              <li key={n.id} className="py-3">
                <a href={n.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                  {n.titolo}
                </a>
                <p className="mt-1 text-sm text-muted-foreground">
                  {n.fonte} · {dataIt(n.data)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Sezione>

      <Sezione titolo="Storico degli Stati">
        {atto.storico.length === 0 ? (
          vuoto("Nessuno storico disponibile.")
        ) : (
          <ul className="divide-y border-y">
            {atto.storico.map((s) => (
              <li key={s.id} className="flex gap-3 py-2 text-sm">
                <span className="w-24 text-muted-foreground">{dataIt(s.data)}</span>
                <span>{etichettaStato[s.stato]}</span>
              </li>
            ))}
          </ul>
        )}
      </Sezione>
    </>
  );
}
