import { config } from "dotenv";

config({ path: ".env.local" });

const SETTORI: { nome: string; descrizione: string }[] = [
  { nome: "Energia e utilities", descrizione: "Produzione, trasmissione e distribuzione di energia elettrica e gas, teleriscaldamento, energie rinnovabili e servizi di fornitura." },
  { nome: "Petrolio e gas", descrizione: "Estrazione, raffinazione, trasporto e commercializzazione di petrolio, gas naturale e prodotti derivati." },
  { nome: "Chimica", descrizione: "Produzione di chimica di base e fine, plastiche, fertilizzanti, vernici, detergenti e altri prodotti chimici industriali." },
  { nome: "Metallurgia e siderurgia", descrizione: "Produzione di acciaio, alluminio e altri metalli, fonderie, lavorazione e trasformazione dei metalli." },
  { nome: "Cemento e materiali da costruzione", descrizione: "Cemento, calce, laterizi, vetro, ceramica e altri materiali per l'edilizia." },
  { nome: "Costruzioni e immobiliare", descrizione: "Imprese edili, ingegneria civile, impiantistica, sviluppo, gestione e compravendita immobiliare." },
  { nome: "Automotive e trasporti", descrizione: "Produzione di veicoli e componentistica, trasporto passeggeri e merci su strada, ferrovia, aereo e mare." },
  { nome: "Logistica e spedizioni", descrizione: "Magazzinaggio, spedizioni, corrieri, intermediazione di trasporto e gestione della catena di fornitura." },
  { nome: "Agroalimentare", descrizione: "Trasformazione e produzione di alimenti e bevande, distribuzione all'ingrosso di prodotti alimentari." },
  { nome: "Agricoltura", descrizione: "Coltivazioni, allevamento, silvicoltura e pesca, inclusi servizi di supporto alla produzione primaria." },
  { nome: "Tessile e moda", descrizione: "Filatura, tessitura, confezione, abbigliamento, calzature, pelletteria e accessori." },
  { nome: "Beni di consumo e retail", descrizione: "Produzione di beni di largo consumo, commercio al dettaglio, grande distribuzione ed e-commerce." },
  { nome: "Elettronica e tecnologia", descrizione: "Hardware, semiconduttori, apparecchiature elettriche, software, servizi IT e data center." },
  { nome: "Servizi finanziari", descrizione: "Banche, gestione del risparmio, intermediazione, private equity e altri servizi di investimento." },
  { nome: "Assicurazioni", descrizione: "Compagnie e intermediari assicurativi, riassicurazione e fondi pensione." },
  { nome: "Servizi professionali", descrizione: "Consulenza, servizi legali, contabili, di ingegneria, architettura, pubblicità e ricerca." },
  { nome: "Sanità e farmaceutica", descrizione: "Industria farmaceutica, dispositivi medici, strutture sanitarie e servizi di assistenza." },
  { nome: "Turismo e ospitalità", descrizione: "Alberghi, ristorazione, agenzie di viaggio, tour operator e servizi per il tempo libero." },
  { nome: "Gestione rifiuti e acqua", descrizione: "Raccolta, trattamento e smaltimento dei rifiuti, riciclo, captazione, depurazione e distribuzione dell'acqua." },
  { nome: "Media e telecomunicazioni", descrizione: "Editoria, televisione, radio, produzione di contenuti, reti e servizi di telecomunicazione." },
];

async function main() {
  // Import dinamico: dotenv deve caricare DATABASE_URL prima del modulo db.
  const { db } = await import("./index");
  const { settore } = await import("./schema");
  // Non sovrascrive: le modifiche fatte dall'utente restano.
  const inseriti = await db
    .insert(settore)
    .values(SETTORI)
    .onConflictDoNothing({ target: settore.nome })
    .returning({ id: settore.id });
  console.log(`Settori inseriti: ${inseriti.length} su ${SETTORI.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((errore) => {
    console.error(errore);
    process.exit(1);
  });
