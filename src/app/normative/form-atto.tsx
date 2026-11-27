"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { SogliaModulo, ValoriModuloAtto } from "@/lib/atto";
import { etichettaStato, etichettaTipoAtto } from "@/lib/etichette";
import { TIPI_ATTO, tipiAmmessi } from "@/lib/tipi-atto";
import { elencoPaesi } from "@/lib/paesi";
import {
  SelezioneMultipla,
  SelezioneSingola,
  type Voce as VoceSelezione,
} from "@/app/clienti/selezione-multipla";
import type { StatoModuloAtto } from "./azioni";

type Azione = (stato: StatoModuloAtto, formData: FormData) => Promise<StatoModuloAtto>;
type VoceAtto = { id: number; nome: string };
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
              <Select
                value={soglia.campo}
                onValueChange={(campo) =>
                  modifica(indice, {
                    campo: campo as SogliaModulo["campo"],
                    paesi: [],
                  })
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dipendenti">Dipendenti</SelectItem>
                  <SelectItem value="fatturato">Fatturato (€)</SelectItem>
                  <SelectItem value="paesi">Paesi</SelectItem>
                </SelectContent>
              </Select>
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
                <SelezioneMultipla
                  id={`paesi-${indice}`}
                  voci={opzioniPaesi}
                  iniziali={soglia.paesi}
                  segnaposto="Cerca un paese…"
                  vuoto="Nessun paese trovato."
                  onChange={(paesi) => modifica(indice, { paesi })}
                />
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
            <Select
              value={relazione.tipo}
              onValueChange={(tipo) =>
                onChange(
                  valori.map((r, i) =>
                    i === indice ? { ...r, tipo: tipo as typeof r.tipo } : r,
                  ),
                )
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recepisce">Recepisce</SelectItem>
                <SelectItem value="modifica">Modifica</SelectItem>
                <SelectItem value="sostituisce">Sostituisce</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="min-w-64 flex-[3] text-sm">
            Atto collegato (ricerca per titolo)
            <SelezioneSingola
              id={`atto-relazione-${indice}`}
              voci={atti.map((atto): VoceSelezione => ({ value: String(atto.id), label: atto.titolo }))}
              valore={relazione.attoId}
              segnaposto="Cerca per titolo…"
              vuoto="Nessun Atto trovato."
              onChange={(attoId) =>
                onChange(valori.map((r, i) => (i === indice ? { ...r, attoId } : r)))
              }
            />
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(valori.filter((_, i) => i !== indice))}>Rimuovi</Button>
        </div>
      ))}
      {errore && <p id="errore-relazioni" role="alert" className="text-sm text-destructive">{errore}</p>}
    </div>
  );
}

export function FormAtto({ azione, id, iniziali, settori, temi, atti, etichettaInvio, tornaA, onAnnulla, onSalvato }: { azione: Azione; id?: number; iniziali: ValoriModuloAtto; settori: VoceAtto[]; temi: VoceAtto[]; atti: AttoVoce[]; etichettaInvio: string; tornaA?: string; onAnnulla?: () => void; onSalvato?: (id: number, esito: "creato" | "modificato") => void }) {
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
          <Select
            id="giurisdizione"
            name="giurisdizione"
            value={giurisdizione || null}
            onValueChange={(nuova) => {
              const valore = nuova ?? "";
              setGiurisdizione(valore);
              if (
                (valore === "ue" || valore === "italia") &&
                !tipiAmmessi(valore).some((opzione) => opzione === tipo)
              ) {
                setTipo("");
              }
            }}
            required
          >
            <SelectTrigger id="giurisdizione" className="h-9 w-full">
              <SelectValue placeholder="Scegli…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ue">UE</SelectItem>
              <SelectItem value="italia">Italia</SelectItem>
            </SelectContent>
          </Select>
        </Campo>
        <Campo nome="tipo" etichetta="Tipo di atto *" errore={errore("tipo")}>
          <Select id="tipo" name="tipo" value={tipo || null} onValueChange={(valore) => setTipo(valore ?? "")} required>
            <SelectTrigger id="tipo" className="h-9 w-full">
              <SelectValue placeholder="Scegli…" />
            </SelectTrigger>
            <SelectContent>
              {tipi.map((tipo) => <SelectItem key={tipo} value={tipo}>{etichettaTipoAtto[tipo]}</SelectItem>)}
            </SelectContent>
          </Select>
        </Campo>
        <Campo nome="stato" etichetta="Stato *" errore={errore("stato")}>
          <Select id="stato" name="stato" defaultValue={valori.stato || undefined} required>
            <SelectTrigger id="stato" className="h-9 w-full">
              <SelectValue placeholder="Scegli…" />
            </SelectTrigger>
            <SelectContent>
              {stati.map((stato) => <SelectItem key={stato} value={stato}>{etichettaStato[stato]}</SelectItem>)}
            </SelectContent>
          </Select>
        </Campo>
        <Campo nome="dataStato" etichetta="Data dello Stato *" errore={errore("dataStato")}>
          <Input id="dataStato" name="dataStato" type="date" defaultValue={valori.dataStato} required aria-invalid={!!errore("dataStato")} />
        </Campo>
      </div>

      <Campo nome="recepimentoEntro" etichetta="Recepimento entro (direttive UE)" errore={errore("recepimentoEntro")}>
        <Input id="recepimentoEntro" name="recepimentoEntro" type="date" defaultValue={valori.recepimentoEntro} aria-invalid={!!errore("recepimentoEntro")} />
      </Campo>

      <Campo nome="summary" etichetta="Summary" errore={errore("summary")}><Textarea id="summary" name="summary" defaultValue={valori.summary} rows={3} /></Campo>
      <Campo nome="urlTesto" etichetta="Link al testo ufficiale" errore={errore("urlTesto")}><Input id="urlTesto" name="urlTesto" type="url" defaultValue={valori.urlTesto} placeholder="https://…" /></Campo>

      <div className="flex flex-col gap-3">
        <Label>Settori</Label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="tuttiISettori" checked={tuttiISettori} onChange={(e) => setTuttiISettori(e.target.checked)} /> Tutti i Settori</label>
        <SelezioneMultipla
          id="settori"
          name="settori"
          voci={settori.map((settore): VoceSelezione => ({ value: String(settore.id), label: settore.nome }))}
          iniziali={valori.settori}
          segnaposto="Cerca un Settore…"
          vuoto="Nessun Settore trovato."
          disabled={tuttiISettori}
          nonValido={!!errore("settori")}
          descrittoDa={descrizione("settori")}
        />
        <p className="text-xs text-muted-foreground">Facoltativo. Cerca e seleziona i Settori. La selezione è esclusiva rispetto a “Tutti i Settori”.</p>
        {errore("settori") && <p id="errore-settori" role="alert" className="text-sm text-destructive">{errore("settori")}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="temi">Temi</Label>
        <SelezioneMultipla
          id="temi"
          name="temi"
          voci={temi.map((tema): VoceSelezione => ({ value: String(tema.id), label: tema.nome }))}
          iniziali={valori.temi}
          segnaposto="Cerca un Tema…"
          vuoto="Nessun Tema trovato."
          nonValido={!!errore("temi")}
          descrittoDa={descrizione("temi")}
        />
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
        <Button type="button" variant="ghost" onClick={() => onAnnulla ? onAnnulla() : router.push(tornaA ?? (id ? `/normative/${id}` : "/normative"))}>Annulla</Button>
      </div>
    </form>
  );
}
