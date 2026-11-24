// Vocabolario: vedi GLOSSARY.md (Avviso di conferma, Controllato, Novità)
//
// Logica pura dell'Avviso di conferma: raggruppa per Atto i motivi per cui
// una persona deve controllare qualcosa. Le righe arrivano da src/db/avviso-di-conferma.ts.

export type RigheAvviso = {
  // Atti con contenuti generati dall'agente non ancora confermati.
  attiDaConfermare: { attoId: number; titolo: string; aggiornatoIl: string }[];
  // Cambi di Stato rilevati dall'agente e non ancora visti.
  cambiDiStato: { attoId: number; titolo: string; stato: string; data: string }[];
  // Notizie che segnalano una novità, per ogni Atto collegato non ancora controllato.
  notizieSuAtti: { notiziaId: number; notiziaTitolo: string; notiziaCreataIl: string; attoId: number; attoTitolo: string }[];
  // Notizie che segnalano una novità senza Atti collegati, non ancora controllate.
  notizieSenzaAtto: { id: number; titolo: string }[];
};

export type VoceAtto = {
  attoId: number;
  titolo: string;
  contenutiGenerati: boolean;
  cambiDiStato: { stato: string; data: string }[];
  notizie: { id: number; titolo: string }[];
  // Data (AAAA-MM-GG) dell'ultimo fatto che ha messo l'Atto nell'Avviso.
  ultimoMovimento: string;
};

export type VoceNotizia = { id: number; titolo: string };

export type Avviso = { atti: VoceAtto[]; notizie: VoceNotizia[] };

export function costruisciAvviso(righe: RigheAvviso): Avviso {
  const perAtto = new Map<number, VoceAtto>();
  const voce = (attoId: number, titolo: string): VoceAtto => {
    let v = perAtto.get(attoId);
    if (!v) {
      v = { attoId, titolo, contenutiGenerati: false, cambiDiStato: [], notizie: [], ultimoMovimento: "" };
      perAtto.set(attoId, v);
    }
    return v;
  };
  const movimento = (v: VoceAtto, data: string) => {
    if (data > v.ultimoMovimento) v.ultimoMovimento = data;
  };

  for (const a of righe.attiDaConfermare) {
    const v = voce(a.attoId, a.titolo);
    v.contenutiGenerati = true;
    movimento(v, a.aggiornatoIl.slice(0, 10));
  }
  for (const c of righe.cambiDiStato) {
    const v = voce(c.attoId, c.titolo);
    v.cambiDiStato.push({ stato: c.stato, data: c.data });
    movimento(v, c.data);
  }
  for (const n of righe.notizieSuAtti) {
    const v = voce(n.attoId, n.attoTitolo);
    v.notizie.push({ id: n.notiziaId, titolo: n.notiziaTitolo });
    movimento(v, n.notiziaCreataIl.slice(0, 10));
  }

  return {
    atti: [...perAtto.values()],
    notizie: righe.notizieSenzaAtto.map((n) => ({ id: n.id, titolo: n.titolo })),
  };
}

export type ImpattoClienti = { applicabili: number; daVerificare: number };

// Più Clienti toccati prima: conta l'esito applicabile, poi il da verificare;
// a parità i movimenti più recenti. Un Atto senza impatto noto vale zero.
export function ordinaPerImpatto(
  voci: readonly VoceAtto[],
  impatto: ReadonlyMap<number, ImpattoClienti>,
): VoceAtto[] {
  const impattoDi = (v: VoceAtto) => impatto.get(v.attoId) ?? { applicabili: 0, daVerificare: 0 };
  return [...voci].sort(
    (a, b) =>
      impattoDi(b).applicabili - impattoDi(a).applicabili ||
      impattoDi(b).daVerificare - impattoDi(a).daVerificare ||
      b.ultimoMovimento.localeCompare(a.ultimoMovimento) ||
      a.attoId - b.attoId,
  );
}

// Titolo del riquadro; null quando non c'è nulla da controllare (il riquadro non compare).
export function titoloAvviso(nAtti: number, nNotizie: number): string | null {
  const parti = [
    nAtti > 0 ? `${nAtti} ${nAtti === 1 ? "Atto" : "Atti"}` : null,
    nNotizie > 0 ? `${nNotizie} ${nNotizie === 1 ? "Notizia" : "Notizie"}` : null,
  ].filter((p) => p !== null);
  return parti.length > 0 ? `${parti.join(" e ")} da controllare` : null;
}
