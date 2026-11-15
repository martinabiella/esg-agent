import { eq } from "drizzle-orm";
import { config } from "dotenv";

config({ path: ".env.local" });

type SeedCliente = {
  ragioneSociale: string;
  attivitaSpecifica: string;
  dipendenti: number | null;
  fatturato: string | null;
  annoRiferimento: number | null;
  paesi: string[] | null;
  note: string | null;
  settori: string[];
};

const CLIENTI: SeedCliente[] = [
  {
    ragioneSociale: "Alba Energia S.p.A.",
    attivitaSpecifica:
      "Produzione di energia elettrica da fonti rinnovabili e gestione di impianti fotovoltaici.",
    dipendenti: 184,
    fatturato: "28750000.1250",
    annoRiferimento: 2024,
    paesi: ["IT", "DE", "FR"],
    note: "Sede operativa a Milano; gruppo in espansione nell'Europa centrale.",
    settori: ["Energia e utilities"],
  },
  {
    ragioneSociale: "Officina Bianchi S.r.l.",
    attivitaSpecifica: "Lavorazioni meccaniche conto terzi per componenti industriali.",
    dipendenti: null,
    fatturato: null,
    annoRiferimento: null,
    paesi: null,
    note: null,
    settori: ["Metallurgia e siderurgia"],
  },
  {
    ragioneSociale: "Rete Verde Cooperativa",
    attivitaSpecifica:
      "Consulenza e servizi tecnici per progetti di economia circolare e gestione dei rifiuti.",
    dipendenti: 42,
    fatturato: null,
    annoRiferimento: null,
    paesi: ["IT"],
    note: null,
    settori: ["Servizi professionali", "Gestione rifiuti e acqua"],
  },
];

async function main() {
  // Import dinamico: dotenv deve caricare DATABASE_URL prima del modulo db.
  const { db } = await import("./index");
  const { cliente, clienteSettore, settore } = await import("./schema");
  const settori = await db.select({ id: settore.id, nome: settore.nome }).from(settore);
  const idPerSettore = new Map(settori.map((s) => [s.nome, s.id]));

  let clientiInseriti = 0;
  let collegamentiInseriti = 0;

  for (const seed of CLIENTI) {
    const settoreIds = seed.settori.map((nome) => {
      const id = idPerSettore.get(nome);
      if (id === undefined) {
        throw new Error(`Settore non trovato: ${nome}. Esegui prima seed-settori.`);
      }
      return id;
    });

    const [giaPresente] = await db
      .select({ id: cliente.id })
      .from(cliente)
      .where(eq(cliente.ragioneSociale, seed.ragioneSociale));

    const clienteId =
      giaPresente?.id ??
      (
        await db
          .insert(cliente)
          .values({
            ragioneSociale: seed.ragioneSociale,
            attivitaSpecifica: seed.attivitaSpecifica,
            dipendenti: seed.dipendenti,
            fatturato: seed.fatturato,
            annoRiferimento: seed.annoRiferimento,
            paesi: seed.paesi,
            note: seed.note,
          })
          .returning({ id: cliente.id })
      )[0].id;

    if (!giaPresente) clientiInseriti++;

    const collegamenti = await db
      .insert(clienteSettore)
      .values(settoreIds.map((settoreId) => ({ clienteId, settoreId })))
      .onConflictDoNothing()
      .returning();
    collegamentiInseriti += collegamenti.length;
  }

  console.log(
    `Clienti inseriti: ${clientiInseriti} su ${CLIENTI.length}; collegamenti Settore inseriti: ${collegamentiInseriti}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((errore) => {
    console.error(errore);
    process.exit(1);
  });
