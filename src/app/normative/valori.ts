import { sogliaModuloDaJson, type ValoriModuloAtto } from "@/lib/atto";
import type { trovaAtto } from "@/db/atti";

type Atto = NonNullable<Awaited<ReturnType<typeof trovaAtto>>>;

export function valoriDaAtto(atto: Atto): ValoriModuloAtto {
  const soglie = sogliaModuloDaJson(atto.criteriSoglie);
  return {
    titolo: atto.titolo,
    identificativoUfficiale: atto.identificativoUfficiale ?? "",
    giurisdizione: atto.giurisdizione,
    tipo: atto.tipo,
    stato: atto.stato,
    dataStato: atto.storico.at(-1)?.data ?? new Date().toISOString().slice(0, 10),
    summary: atto.summary,
    urlTesto: atto.urlTesto ?? "",
    tuttiISettori: atto.tuttiISettori,
    settori: atto.settori.map((s) => String(s.id)),
    temi: atto.temi.map((t) => String(t.id)),
    nuovoTema: "",
    criteriTesto: atto.criteriTesto,
    soglie: soglie.soglie,
    minimoSoglie: soglie.minimoSoglie,
    relazioni: atto.relazioni.map((r) => ({ tipo: r.tipo, attoId: String(r.attoId) })),
    nonRilevante: atto.nonRilevante,
  };
}

export function valoriAttoNuovo(): ValoriModuloAtto {
  return {
    titolo: "",
    identificativoUfficiale: "",
    giurisdizione: "",
    tipo: "",
    stato: "",
    dataStato: new Date().toISOString().slice(0, 10),
    summary: "",
    urlTesto: "",
    tuttiISettori: false,
    settori: [],
    temi: [],
    nuovoTema: "",
    criteriTesto: "",
    soglie: [],
    minimoSoglie: "",
    relazioni: [],
    nonRilevante: false,
  };
}
