import { config } from "dotenv";
import type { CampiFonte } from "../lib/fonte";

config({ path: ".env.local" });

// Fonti ufficiali iniziali (URL verificati il 2026-11-19). Nessuna Fonte
// editoriale: le aggiungono gli utenti dalla pagina Fonti.
const FONTI: CampiFonte[] = [
  { nome: "EUR-Lex", url: "https://eur-lex.europa.eu/", tipo: "ufficiale" },
  { nome: "Legislative Observatory", url: "https://oeil.europarl.europa.eu/oeil/en", tipo: "ufficiale" },
  {
    nome: "Commissione europea – Finanza sostenibile",
    url: "https://finance.ec.europa.eu/sustainable-finance_en",
    tipo: "ufficiale",
  },
  { nome: "Gazzetta Ufficiale", url: "https://www.gazzettaufficiale.it/", tipo: "ufficiale" },
  { nome: "Camera dei deputati", url: "https://www.camera.it/", tipo: "ufficiale" },
  { nome: "Senato della Repubblica", url: "https://www.senato.it/", tipo: "ufficiale" },
];

async function main() {
  // Import dinamico: dotenv deve caricare DATABASE_URL prima del modulo db.
  const { db } = await import("./index");
  const { fonte } = await import("./schema");
  // Rieseguibile: salta le Fonti con lo stesso URL o nome (indici unici senza
  // maiuscole né barra finale) e non sovrascrive le modifiche degli utenti.
  const inserite = await db
    .insert(fonte)
    .values(FONTI)
    .onConflictDoNothing()
    .returning({ id: fonte.id });
  console.log(`Fonti inserite: ${inserite.length} su ${FONTI.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((errore) => {
    console.error(errore);
    process.exit(1);
  });
