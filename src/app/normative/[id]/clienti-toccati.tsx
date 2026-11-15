import { clientiSoggetti } from "@/db/applicabilita";
import { attoCalcolabile } from "@/lib/applicabilita";
import { OverrideDialog } from "@/app/override/override-dialog";
import { StatoApplicabilita } from "@/app/override/stato-applicabilita";

type AttoScheda = {
  id: number;
  titolo: string;
  stato: string;
  nonRilevante: boolean;
  aggiornatoIl: Date;
  criteriSoglie: unknown;
  criteriTesto: string;
  criteriConfermati: boolean;
  tuttiISettori: boolean;
  settori: { id: number }[];
};

const ORDINE = { applicabile: 0, da_verificare: 1, non_applicabile: 2 } as const;

const nota = (testo: string) => <p className="text-sm text-muted-foreground">{testo}</p>;

// Clienti soggetti all'Atto: applicabili e da verificare, con possibilità di Override.
// I non applicabili non si mostrano. L'esito è provvisorio finché i Criteri non sono confermati.
export async function ClientiToccati({ atto }: { atto: AttoScheda }) {
  if (!attoCalcolabile(atto)) {
    return nota(
      atto.nonRilevante
        ? "Atto non rilevante: l'Applicabilità non viene calcolata."
        : "Atto abrogato: l'Applicabilità non viene calcolata.",
    );
  }

  const soggetti = (await clientiSoggetti(atto)).sort(
    (a, b) =>
      ORDINE[a.valutazione.effettiva] - ORDINE[b.valutazione.effettiva] ||
      a.cliente.ragioneSociale.localeCompare(b.cliente.ragioneSociale, "it"),
  );

  return (
    <>
      {!atto.criteriConfermati && (
        <p className="mb-2 text-sm text-muted-foreground">
          Esito provvisorio: i Criteri di applicabilità non sono ancora confermati da una persona.
        </p>
      )}
      {soggetti.length === 0 ? (
        nota("Nessun Cliente soggetto a questo Atto.")
      ) : (
        <ul className="divide-y border-y">
          {soggetti.map(({ cliente, valutazione }) => (
            <li key={cliente.id} className="flex items-start justify-between gap-3 py-2 text-sm">
              <span className="pt-1">{cliente.ragioneSociale}</span>
              <div className="flex items-start gap-2">
                <StatoApplicabilita valutazione={valutazione} provvisorio={!atto.criteriConfermati} />
                <OverrideDialog
                  clienteId={cliente.id}
                  attoId={atto.id}
                  cliente={cliente.ragioneSociale}
                  atto={atto.titolo}
                  valutazione={valutazione}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
