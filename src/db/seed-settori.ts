import { config } from "dotenv";

config({ path: ".env.local" });

const SETTORI: [string, string][] = [
  ["Energia e utilities", "Produzione, trasmissione e distribuzione di energia elettrica e gas, teleriscaldamento, energie rinnovabili e servizi di fornitura."],
  ["Petrolio e gas", "Estrazione, raffinazione, trasporto e commercializzazione di petrolio, gas naturale e prodotti derivati."],
  ["Chimica", "Produzione di chimica di base e fine, plastiche, fertilizzanti, vernici, detergenti e altri prodotti chimici industriali."],
  ["Metallurgia e siderurgia", "Produzione di acciaio, alluminio e altri metalli, fonderie, lavorazione e trasformazione dei metalli."],
  ["Cemento e materiali da costruzione", "Cemento, calce, laterizi, vetro, ceramica e altri materiali per l'edilizia."],
  ["Costruzioni e immobiliare", "Imprese edili, ingegneria civile, impiantistica, sviluppo, gestione e compravendita immobiliare."],
  ["Automotive e trasporti", "Produzione di veicoli e componentistica, trasporto passeggeri e merci su strada, ferrovia, aereo e mare."],
  ["Logistica e spedizioni", "Magazzinaggio, spedizioni, corrieri, intermediazione di trasporto e gestione della catena di fornitura."],
  ["Agroalimentare", "Trasformazione e produzione di alimenti e bevande, distribuzione all'ingrosso di prodotti alimentari."],
  ["Agricoltura", "Coltivazioni, allevamento, silvicoltura e pesca, inclusi servizi di supporto alla produzione primaria."],
  ["Tessile e moda", "Filatura, tessitura, confezione, abbigliamento, calzature, pelletteria e accessori."],
  ["Beni di consumo e retail", "Produzione di beni di largo consumo, commercio al dettaglio, grande distribuzione ed e-commerce."],
  ["Elettronica e tecnologia", "Hardware, semiconduttori, apparecchiature elettriche, software, servizi IT e data center."],
  ["Servizi finanziari", "Banche, gestione del risparmio, intermediazione, private equity e altri servizi di investimento."],
  ["Assicurazioni", "Compagnie e intermediari assicurativi, riassicurazione e fondi pensione."],
  ["Servizi professionali", "Consulenza, servizi legali, contabili, di ingegneria, architettura, pubblicità e ricerca."],
  ["Sanità e farmaceutica", "Industria farmaceutica, dispositivi medici, strutture sanitarie e servizi di assistenza."],
  ["Turismo e ospitalità", "Alberghi, ristorazione, agenzie di viaggio, tour operator e servizi per il tempo libero."],
  ["Gestione rifiuti e acqua", "Raccolta, trattamento e smaltimento dei rifiuti, riciclo, captazione, depurazione e distribuzione dell'acqua."],
  ["Media e telecomunicazioni", "Editoria, televisione, radio, produzione di contenuti, reti e servizi di telecomunicazione."],
];

async function main() {
  const { db } = await import("./index");
  const { settore } = await import("./schema");
  // Non sovrascrive: le modifiche fatte dall'utente restano.
  const inseriti = await db
    .insert(settore)
    .values(SETTORI.map(([nome, descrizione]) => ({ nome, descrizione })))
    .onConflictDoNothing({ target: settore.nome })
    .returning({ id: settore.id });
  console.log(`Settori inseriti: ${inseriti.length} su ${SETTORI.length}`);
}

main();
