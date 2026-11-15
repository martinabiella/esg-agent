"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SogliaModulo, ValoriModuloAtto } from "@/lib/atto";
import { etichettaStato, etichettaTipoAtto } from "@/lib/etichette";
import { TIPI_ATTO, tipiAmmessi } from "@/lib/tipi-atto";
import { elencoPaesi } from "@/lib/paesi";
import type { StatoModuloAtto } from "./azioni";

type Azione = (stato: StatoModuloAtto, formData: FormData) => Promise<StatoModuloAtto>;
type Voce = { id: number; nome: string };
type AttoVoce = { id: number; titolo: string; giurisdizione: "ue" | "italia" };

const stati = ["proposta", "in_discussione", "approvato", "in_vigore", "modificato", "abrogato"] as const;
const paesi = elencoPaesi();
const opzioniPaesi = [{ value: "UE", label: "Unione Europea (UE)" }, ...paesi.map((p) => ({ value: p.codice, label: p.nome }))];
const vuotaSoglia = (): SogliaModulo => ({ campo: "dipendenti", minimo: "", massimo: "", paesi: [] });

function Campo({ nome, etichetta, errore, children, aiuto }: { nome: string; etichetta: string; errore?: string; children: ReactNode; aiuto?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={nome}>{etichetta}</Label>
      {children}
      {aiuto && !errore && <p id={`aiuto-${nome}`} className="text-xs text-muted-foreground">{aiuto}</p>}
      {errore && <p id={`errore-${nome}`} role="alert" className="text-sm text-destructive">{errore}</p>}
    </div>
  );
}

function Soglie({
  valori,
  onChange,
  errore,
}: {
  valori: SogliaModulo[];
  onChange: (valori: SogliaModulo[]) => void;
  errore?: string;
}) {
  function modifica(indice: number, modifica: Partial<SogliaModulo>) {
    onChange(valori.map((s, i) => (i === indice ? { ...s, ...modifica } : s)));
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Label>Soglie</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...valori, vuotaSoglia()])}>Aggiungi Soglia</Button>
      </div>
      {valori.map((soglia, indice) => (
        <div key={indice} className="rounded-lg border p-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
              Campo
              <select className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm" value={soglia.campo} onChange={(e) => modifica(indice, { campo: e.target.value as SogliaModulo["campo"], paesi: [] })}>
                <option value="dipendenti">Dipendenti</option>
                <option value="fatturato">Fatturato (€)</option>
                <option value="paesi">Paesi</option>
              </select>
            </label>
            {soglia.campo !== "paesi" ? (
              <>
                <label className="flex min-w-32 flex-1 flex-col gap-1 text-sm">
                  Minimo incluso
                  <Input inputMode={soglia.campo === "fatturato" ? "decimal" : "numeric"} value={soglia.minimo} onChange={(e) => modifica(indice, { minimo: e.target.value })} />
                </label>
                <label className="flex min-w-32 flex-1 flex-col gap-1 text-sm">
                  Massimo escluso
                  <Input inputMode={soglia.campo === "fatturato" ? "decimal" : "numeric"} value={soglia.massimo} onChange={(e) => modifica(indice, { massimo: e.target.value })} />
                </label>
              </>
            ) : (
              <label className="min-w-52 flex-1 text-sm">
                Paesi
                <select multiple className="mt-1 h-24 w-full rounded-lg border border-input bg-transparent px-2 text-sm" value={soglia.paesi} onChange={(e) => modifica(indice, { paesi: Array.from(e.target.selectedOptions, (o) => o.value) })}>
                  {opzioniPaesi.map((paese) => <option key={paese.value} value={paese.value}>{paese.label}</option>)}
                </select>
              </label>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(valori.filter((_, i) => i !== indice))}>Rimuovi</Button>
          </div>
        </div>
      ))}
      {errore && <p id="errore-soglie" role="alert" className="text-sm text-destructive">{errore}</p>}
    </div>
  );
}

function Relazioni({ valori, atti, onChange, errore }: { valori: ValoriModuloAtto["relazioni"]; atti: AttoVoce[]; onChange: (v: ValoriModuloAtto["relazioni"]) => void; errore?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Relazioni tra Atti</Label>
          <p className="mt-1 text-xs text-muted-foreground">Questo Atto recepisce, modifica o sostituisce l&apos;Atto scelto.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...valori, { tipo: "modifica", attoId: "" }])}>Aggiungi Relazione</Button>
      </div>
      {valori.map((relazione, indice) => (
        <div key={indice} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
          <label className="flex min-w-36 flex-1 flex-col gap-1 text-sm">
            Tipo
            <select className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm" value={relazione.tipo} onChange={(e) => onChange(valori.map((r, i) => i === indice ? { ...r, tipo: e.target.value as typeof r.tipo } : r))}>
              <option value="recepisce">Recepisce</option>
              <option value="modifica">Modifica</option>
              <option value="sostituisce">Sostituisce</option>
            </select>
          </label>
          <label className="min-w-64 flex-[3] text-sm">
            Atto collegato (ricerca per titolo)
            <Input list="atti-relazioni" className="mt-1" value={atti.find((a) => String(a.id) === relazione.attoId)?.titolo ?? ""} onChange={(e) => {
              const trovato = atti.find((a) => a.titolo === e.target.value);
              onChange(valori.map((r, i) => i === indice ? { ...r, attoId: trovato ? String(trovato.id) : "" } : r));
            }} placeholder="Cerca per titolo…" />
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(valori.filter((_, i) => i !== indice))}>Rimuovi</Button>
        </div>
      ))}
      <datalist id="atti-relazioni">
        {atti.map((atto) => <option key={atto.id} value={atto.titolo}>{atto.giurisdizione === "ue" ? "UE" : "Italia"}</option>)}
      </datalist>
      {errore && <p id="errore-relazioni" role="alert" className="text-sm text-destructive">{errore}</p>}
    </div>
  );
}

export function FormAtto({ azione, id, iniziali, settori, temi, atti, etichettaInvio, onAnnulla, onSalvato }: { azione: Azione; id?: number; iniziali: ValoriModuloAtto; settori: Voce[]; temi: Voce[]; atti: AttoVoce[]; etichettaInvio: string; onAnnulla?: () => void; onSalvato?: (id: number, esito: "creato" | "modificato") => void }) {
  const router = useRouter();
  const [stato, esegui, inCorso] = useActionState(azione, undefined);
  const valori = stato?.valori ?? iniziali;
  const [soglie, setSoglie] = useState(valori.soglie);
  const [relazioni, setRelazioni] = useState(valori.relazioni);
  const [giurisdizione, setGiurisdizione] = useState(valori.giurisdizione);
  const [tipo, setTipo] = useState(valori.tipo);
  const [tuttiISettori, setTuttiISettori] = useState(valori.tuttiISettori);
  useEffect(() => {
    if (stato?.salvato) {
      if (onSalvato) onSalvato(stato.salvato.id, stato.salvato.esito);
      else router.push(`/normative/${stato.salvato.id}`);
    }
  }, [stato?.salvato, onSalvato, router]);
  const chiave = stato?.valori ? JSON.stringify(stato.valori) : "iniziali";
  const errore = (nome: keyof ValoriModuloAtto | "relazioni") => stato?.errori?.[nome];
  const descrizione = (nome: keyof ValoriModuloAtto) => errore(nome) ? `errore-${nome}` : undefined;
  const tipi = giurisdizione === "ue" || giurisdizione === "italia" ? tipiAmmessi(giurisdizione) : TIPI_ATTO;

  return (
    <form key={chiave} action={esegui} className="mt-6 flex max-w-4xl flex-col gap-6">
      {id !== undefined && <input type="hidden" name="id" value={id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Campo nome="titolo" etichetta="Titolo *" errore={errore("titolo")}>
          <Input id="titolo" name="titolo" defaultValue={valori.titolo} required aria-invalid={!!errore("titolo")} aria-describedby={descrizione("titolo")} />
        </Campo>
        <Campo nome="identificativoUfficiale" etichetta="Identificativo ufficiale" errore={errore("identificativoUfficiale")} aiuto="Facoltativo, ma unico.">
          <Input id="identificativoUfficiale" name="identificativoUfficiale" defaultValue={valori.identificativoUfficiale} aria-invalid={!!errore("identificativoUfficiale")} aria-describedby={descrizione("identificativoUfficiale")} />
        </Campo>
        <Campo nome="giurisdizione" etichetta="Giurisdizione *" errore={errore("giurisdizione")}>
          <select id="giurisdizione" name="giurisdizione" value={giurisdizione} onChange={(e) => {
            const nuova = e.target.value;
            setGiurisdizione(nuova);
            if ((nuova === "ue" || nuova === "italia") && !tipiAmmessi(nuova).some((valore) => valore === tipo)) setTipo("");
          }} className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm" required>
            <option value="">Scegli…</option><option value="ue">UE</option><option value="italia">Italia</option>
          </select>
        </Campo>
        <Campo nome="tipo" etichetta="Tipo di atto *" errore={errore("tipo")}>
          <select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm" required>
            <option value="">Scegli…</option>{tipi.map((tipo) => <option key={tipo} value={tipo}>{etichettaTipoAtto[tipo]}</option>)}
          </select>
        </Campo>
        <Campo nome="stato" etichetta="Stato *" errore={errore("stato")}>
          <select id="stato" name="stato" defaultValue={valori.stato} className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm" required>
            <option value="">Scegli…</option>{stati.map((stato) => <option key={stato} value={stato}>{etichettaStato[stato]}</option>)}
          </select>
        </Campo>
        <Campo nome="dataStato" etichetta="Data dello Stato *" errore={errore("dataStato")}>
          <Input id="dataStato" name="dataStato" type="date" defaultValue={valori.dataStato} required aria-invalid={!!errore("dataStato")} />
        </Campo>
      </div>

      <Campo nome="summary" etichetta="Summary" errore={errore("summary")}><Textarea id="summary" name="summary" defaultValue={valori.summary} rows={3} /></Campo>
      <Campo nome="urlTesto" etichetta="Link al testo ufficiale" errore={errore("urlTesto")}><Input id="urlTesto" name="urlTesto" type="url" defaultValue={valori.urlTesto} placeholder="https://…" /></Campo>

      <div className="flex flex-col gap-3">
        <Label>Settori</Label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="tuttiISettori" checked={tuttiISettori} onChange={(e) => setTuttiISettori(e.target.checked)} /> Tutti i Settori</label>
        <select multiple name="settori" defaultValue={valori.settori} disabled={tuttiISettori} aria-invalid={!!errore("settori")} aria-describedby={descrizione("settori")} className="h-32 rounded-lg border border-input bg-transparent p-2 text-sm disabled:opacity-50">
          {settori.map((settore) => <option key={settore.id} value={settore.id}>{settore.nome}</option>)}
        </select>
        <p className="text-xs text-muted-foreground">Facoltativo. Tieni premuto Ctrl/⌘ per scegliere più Settori. La selezione è esclusiva rispetto a “Tutti i Settori”.</p>
        {errore("settori") && <p id="errore-settori" role="alert" className="text-sm text-destructive">{errore("settori")}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="temi">Temi</Label>
        <select id="temi" multiple name="temi" defaultValue={valori.temi} aria-invalid={!!errore("temi")} className="h-32 rounded-lg border border-input bg-transparent p-2 text-sm">
          {temi.map((tema) => <option key={tema.id} value={tema.id}>{tema.nome}</option>)}
        </select>
        <Input id="nuovoTema" name="nuovoTema" defaultValue={valori.nuovoTema} placeholder="Oppure crea un nuovo Tema…" />
        {errore("temi") && <p role="alert" className="text-sm text-destructive">{errore("temi")}</p>}
      </div>

      <div className="flex flex-col gap-4">
        <Campo nome="criteriTesto" etichetta="Criteri di applicabilità (testo libero)" errore={errore("criteriTesto")}><Textarea id="criteriTesto" name="criteriTesto" defaultValue={valori.criteriTesto} rows={3} /></Campo>
        <Soglie valori={soglie} onChange={setSoglie} errore={errore("soglie")} />
        <input type="hidden" name="soglie" value={JSON.stringify(soglie)} readOnly />
        <Campo nome="minimoSoglie" etichetta="Numero minimo di Soglie da rispettare" errore={errore("minimoSoglie")} aiuto="Se vuoto, devono essere rispettate tutte.">
          <Input id="minimoSoglie" name="minimoSoglie" inputMode="numeric" defaultValue={valori.minimoSoglie} />
        </Campo>
      </div>

      <Relazioni valori={relazioni} atti={atti} onChange={setRelazioni} errore={errore("relazioni")} />
      <input type="hidden" name="relazioni" value={JSON.stringify(relazioni)} readOnly />

      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="nonRilevante" defaultChecked={valori.nonRilevante} /> Non rilevante</label>
      {stato?.duplicatoId && <p className="text-sm text-destructive">Apri l&apos;Atto esistente: <Link href={`/normative/${stato.duplicatoId}`} className="underline">vai alla scheda</Link>.</p>}
      {stato?.errore && <Alert variant="destructive"><AlertDescription>{stato.errore}</AlertDescription></Alert>}
      <div className="flex items-center gap-3 border-t pt-4">
        <Button type="submit" disabled={inCorso}>{inCorso ? "Salvataggio…" : etichettaInvio}</Button>
        <Button type="button" variant="ghost" onClick={() => onAnnulla ? onAnnulla() : router.push(id ? `/normative/${id}` : "/normative")}>Annulla</Button>
      </div>
    </form>
  );
}
