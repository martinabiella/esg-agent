import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { avvisoDiConferma } from "@/db/avviso-di-conferma";
import { titoloAvviso } from "@/lib/avviso-di-conferma";
import { etichettaStato } from "@/lib/etichette";
import { segnaAttoControllatoAzione, segnaNotiziaControllataAzione } from "./azioni-avviso";
import { PulsanteControllato } from "./pulsante-controllato";

// Avviso di conferma (vedi GLOSSARY.md): sparisce quando non c'è nulla da controllare.
export async function AvvisoDiConferma() {
  const { atti, notizie } = await avvisoDiConferma();
  const titolo = titoloAvviso(atti.length, notizie.length);
  if (titolo === null) return null;

  return (
    <Card className="mt-6" aria-labelledby="titolo-avviso">
      <CardHeader>
        <CardTitle id="titolo-avviso" className="text-lg">
          {titolo}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Contenuti generati dall&apos;agente e novità da verificare, in ordine di impatto sui Clienti.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {atti.length > 0 && (
          <ul className="flex flex-col divide-y">
            {atti.map((atto) => (
              <li key={atto.attoId} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Link href={`/normative/${atto.attoId}`} className="font-medium hover:underline">
                    {atto.titolo}
                  </Link>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {atto.contenutiGenerati && <Badge variant="secondary">Contenuti generati da confermare</Badge>}
                    {atto.cambiDiStato.map((c) => (
                      <Badge key={`${c.stato}-${c.data}`} variant="outline">
                        Stato: {etichettaStato[c.stato as keyof typeof etichettaStato] ?? c.stato} ({c.data})
                      </Badge>
                    ))}
                  </div>
                  {atto.notizie.length > 0 && (
                    <ul className="text-sm text-muted-foreground">
                      {atto.notizie.map((n) => (
                        <li key={n.id}>
                          Notizia:{" "}
                          <Link href={`/notizie?id=${n.id}`} className="underline-offset-4 hover:underline">
                            {n.titolo}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <PulsanteControllato
                  azione={segnaAttoControllatoAzione}
                  id={atto.attoId}
                  etichetta="Segna come controllato"
                />
              </li>
            ))}
          </ul>
        )}

        {notizie.length > 0 && (
          <section aria-labelledby="notizie-avviso">
            <h2 id="notizie-avviso" className="mb-2 text-sm font-medium">
              Notizie che segnalano una nuova normativa
            </h2>
            <ul className="flex flex-col divide-y">
              {notizie.map((n) => (
                <li key={n.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0">
                  <Link href={`/notizie?id=${n.id}`} className="font-medium hover:underline">
                    {n.titolo}
                  </Link>
                  <PulsanteControllato
                    azione={segnaNotiziaControllataAzione}
                    id={n.id}
                    etichetta="Segna come controllata"
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
