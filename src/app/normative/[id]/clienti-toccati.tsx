import { Badge } from "@/components/ui/badge";
import { elencoClienti } from "@/db/clienti";
import {
  attoCalcolabile,
  calcolaApplicabilita,
  type Applicabilita,
} from "@/lib/applicabilita";
import { etichettaApplicabilita } from "@/lib/etichette";

type AttoScheda = {
  stato: string;
  nonRilevante: boolean;
  criteriSoglie: unknown;
  criteriTesto: string;
  criteriConfermati: boolean;
  tuttiISettori: boolean;
  settori: { id: number }[];
};

const ORDINE: Record<Applicabilita, number> = {
  applicabile: 0,
  da_verificare: 1,
  non_applicabile: 2,
};

const nota = (testo: string) => <p className="text-sm text-muted-foreground">{testo}</p>;

// Clienti toccati dall'Atto: applicabili e da verificare, con l'esito calcolato.
// L'esito è provvisorio finché i Criteri non sono confermati da una persona.
export async function ClientiToccati({ atto }: { atto: AttoScheda }) {
  if (!attoCalcolabile(atto)) {
    return nota(
      atto.nonRilevante
        ? "Atto non rilevante: l'Applicabilità non viene calcolata."
        : "Atto abrogato: l'Applicabilità non viene calcolata.",
    );
  }

  const clienti = await elencoClienti();
  const settoriAtto = atto.settori.map((s) => s.id);
  const esiti = clienti.map((c) => ({
    cliente: c,
    esito: calcolaApplicabilita(
      {
        criteriSoglie: atto.criteriSoglie,
        criteriTesto: atto.criteriTesto,
        tuttiISettori: atto.tuttiISettori,
        settori: settoriAtto,
      },
      {
        dipendenti: c.dipendenti,
        fatturato: c.fatturato,
        paesi: c.paesi,
        settori: c.settori.map((s) => s.id),
      },
    ),
  }));

  const toccati = esiti
    .filter((e) => e.esito !== "non_applicabile")
    .sort(
      (a, b) =>
        ORDINE[a.esito] - ORDINE[b.esito] ||
        a.cliente.ragioneSociale.localeCompare(b.cliente.ragioneSociale, "it"),
    );
  const esclusi = esiti.length - toccati.length;

  return (
    <>
      {!atto.criteriConfermati && (
        <p className="mb-2 text-sm text-muted-foreground">
          Esito provvisorio: i Criteri di applicabilità non sono ancora confermati da una persona.
        </p>
      )}
      {toccati.length === 0 ? (
        nota("Nessun Cliente toccato da questo Atto.")
      ) : (
        <ul className="divide-y border-y">
          {toccati.map(({ cliente, esito }) => (
            <li key={cliente.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>{cliente.ragioneSociale}</span>
              <Badge variant={esito === "applicabile" ? "default" : "secondary"}>
                {etichettaApplicabilita[esito]}
                {!atto.criteriConfermati && " (provvisorio)"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {esclusi > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {esclusi === 1 ? "1 Cliente non applicabile" : `${esclusi} Clienti non applicabili`} non
          mostrati.
        </p>
      )}
    </>
  );
}
