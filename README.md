This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Componenti UI

I componenti riutilizzabili dell'interfaccia sono in `src/components/ui/` e seguono la convenzione [shadcn/ui](https://ui.shadcn.com/). Per aggiungere un componente usare il CLI shadcn, per esempio `npx shadcn add dialog`, poi adattare il componente ai testi e alle esigenze dell'app.

Usare questi componenti per i controlli interattivi e gli stati condivisi. Le classi Tailwind locali restano appropriate per il layout specifico di una pagina; non serve creare un componente per ogni elemento HTML.

Per le tabelle con filtri, ordinamento o paginazione complessi si potrà valutare TanStack Table in una modifica separata; non fa parte della base UI.

## Accesso (Neon Auth)

L’app richiede l’accesso con email e password (Neon Auth, Managed Better Auth). Mantieni disabilitata la registrazione pubblica nelle impostazioni di Neon Auth. Crea gli utenti e avvia il recupero password dal pannello Neon (progetto `esg-agent` → Auth → Users).

Variabili d'ambiente (in `.env.local`, mai nel repository):

| Variabile | Descrizione |
| --- | --- |
| `DATABASE_URL` | Connessione Postgres su Neon |
| `NEON_AUTH_BASE_URL` | URL di Neon Auth del branch (pannello Neon → Auth → Configuration) |
| `NEON_AUTH_COOKIE_SECRET` | Segreto per i cookie di sessione, almeno 32 caratteri: `openssl rand -base64 32` |
| `PARALLEL_API_KEY` | API key di Parallel, per avviare le Ricerche e leggerne i risultati |
| `PARALLEL_WEBHOOK_SECRET` | Segreto dei webhook di Parallel (`whsec_…`, in Parallel → Settings → Webhooks): verifica la firma del webhook |
| `PARALLEL_WEBHOOK_URL` | Facoltativa. URL a cui Parallel manda il webhook; se manca, `https://<dominio di produzione Vercel>/api/parallel/webhook` |
| `CRON_SECRET` | Segreto del cron delle Ricerche, almeno 16 caratteri: `openssl rand -base64 32`. Vercel lo manda come `Authorization: Bearer <CRON_SECRET>`; senza, l'endpoint del cron risponde 500 |
| `TETTO_RICERCHE` | Facoltativa. Numero massimo di Ricerche per Esecuzione (intero positivo, default 20) |

Per le scritture (azioni server e rotte API) usare `utenteRichiesto()` da `@/lib/auth`: restituisce l'utente corrente o lancia `NonAutenticatoError`. Fanno eccezione il webhook di Parallel (`/api/parallel/webhook`), che si autentica con la firma di Parallel, e il cron delle Ricerche (`/api/cron/esecuzione`), che si autentica con `CRON_SECRET` (vedi "Agente (Parallel)").

Il proxy (`src/proxy.ts`) rimanda a `/auth/sign-in` chi non ha una sessione, tranne per il webhook di Parallel e il cron. Ogni scrittura verifica comunque la sessione (o la firma e il segreto) lato server.

Better Auth UI fornisce i moduli di accesso e reset password, la vista di uscita e il menu utente. I vecchi link `/accedi` e `/reimposta` funzionano ancora.

I componenti del registro shadcn sono in `src/components/auth/`. Se li aggiorni, mantieni nascosti i link di registrazione. Allinea `better-auth` alla versione compatibile con `@neon/auth`.

## Agente (Parallel)

L'agente è una pipeline di Ricerche asincrone ([ADR 0002](docs/adr/0002-agente-come-pipeline-con-webhook.md)). `avviaEsecuzione` (`src/lib/esecuzione.ts`) registra in `esecuzione_ricerca` una Ricerca per Fonte, poi `avviaRicercaPerFonte` (`src/lib/ricerca-fonte.ts`) avvia ognuna come task run sulla [Task API di Parallel](https://docs.parallel.ai/task-api/webhooks). A fine run Parallel chiama `POST /api/parallel/webhook`. La rotta verifica la firma (Standard Webhooks, HMAC-SHA256), legge il risultato dalla Task API, lo valida con lo schema versionato in `src/lib/output-ricerca.ts` e salva le Notizie senza duplicati (URL normalizzato).

La rotta del webhook è esclusa dal proxy: si autentica con la firma, non con la sessione. Una risposta diversa da 2xx fa riprovare Parallel per 48 ore, quindi un errore temporaneo (DB, rete) non perde il risultato.

Il webhook non raggiunge `localhost`: in locale si prova con il client finto dei test (`npm test`).

### Atti nuovi dall'agente

Oltre alle Notizie, l'output (schema v2) ha `atti_candidati`: un candidato per ogni atto con identificativo ufficiale citato negli articoli. `decidiAttiNuovi` (`src/lib/atti-nuovi.ts`, pura) decide quali diventano Atti, e `completaRicerca` (`src/db/ricerche.ts`) li scrive in un'unica istruzione insieme alle Notizie.
- **Si crea l'Atto** solo con un identificativo ufficiale, se il catalogo non lo ha già (`trovaAttoCitato`: identificativo, poi titolo e Giurisdizione), se non è ambiguo, se non è un Atto Non rilevante e se supera `validaAtto` (Tipo coerente con la Giurisdizione, date, Soglie). Altrimenti non si crea nulla, il motivo va nel log del server e la Notizia resta col flag.
- **Come nasce.** Provenienza `agente`, Criteri non confermati, `fonte_id` della Fonte, `stato_confermato_il` vuoto.
- **Settori e Temi.** I Settori sono solo quelli esistenti. Se nessuno corrisponde, l'Atto resta senza Settore (voluto: meglio un Atto da completare che perderlo) e compare nell'Avviso di conferma con il motivo «Settori da assegnare». I Temi nuovi si creano, con nome unico senza distinguere le maiuscole. Al massimo 5 Temi per Atto.
- **Unicità.** La deduplica del codice (`chiaveIdentificativo`) ignora maiuscole, spazi, i prefissi italiani (`D.L.`, `D.Lgs.`, `L.`, `D.P.R.`) e `final`/`definitivo`/`def.`; l'indice sull'identificativo, più stretto (maiuscole e spazi), resta come rete se due Ricerche scrivono insieme. Se il catalogo contiene già duplicati, la migrazione si ferma: risolverli prima di riprovare.
- **Origine e disaccordi** stanno in testa al summary (`src/lib/avviso-agente.ts`) e la scheda dell'Atto li mostra in riquadri a parte.
- **Una Notizia che cita un Atto appena creato** si collega a lui e mantiene il flag di novità.
- **Versioni dello schema.** I run avviati con la v1 o la v2 e conclusi dopo il deploy si leggono ancora (senza gli elenchi nuovi).

### Cambi di Stato dall'agente

L'output (schema v3) ha anche `cambi_di_stato`: atti già noti con nuovo Stato e data. `decidiCambiDiStato` (`src/lib/cambi-di-stato.ts`, pura) seleziona i cambi. `completaRicerca` blocca gli Atti interessati, poi legge di nuovo lo storico e salva i cambi ancora validi nella stessa transazione.
- **Solo Fonti ufficiali.** Una Fonte editoriale non cambia mai lo Stato (il tipo viaggia nei metadati del run: senza, vale come editoriale).
- **Si applica** se l'Atto è riconosciuto dall'identificativo ufficiale, non è Non rilevante né abrogato, lo Stato è diverso e la data è posteriore all'ultima voce dello storico (un ritorno a uno Stato precedente vale, se più recente). Cambi dello stesso run sullo stesso Atto: in ordine di data.
- **Cosa cambia.** `stato`, `stato_confermato_il` e una riga in `stato_storico` (provenienza `agente`, `visto_il` vuoto). `aggiornato_il` resta invariato: i Criteri di applicabilità non sono cambiati. L'indice unico su Atto, Stato e data vale solo per le righe dell'agente. Un ritorno manuale allo stesso Stato nella stessa data resta nello storico.
- **Non visti.** `cambiDiStatoNonVisti()` (`src/db/cambi-di-stato.ts`) elenca i cambi dell'agente con `visto_il` vuoto, per l'Avviso di conferma (#11).
- **Migrazione.** `0008_storico_agente` aggiunge `provenienza`, `visto_il` e l'indice per le righe dell'agente. Rimuove il vecchio indice globale, se presente. Applicare le migrazioni prima del deploy con `npm run db:migrate`.

### Esecuzione settimanale e pulsante

Un'Esecuzione parte in due modi:
- il cron di Vercel (`vercel.json`) chiama `GET /api/cron/esecuzione` ogni lunedì alle 05:00 UTC, cioè tra le 6 e le 7 in inverno e tra le 7 e le 8 in estate in Italia. Con il piano Hobby parte in un momento qualunque di quell'ora;
- il pulsante «Avvia ricerca ora» nella pagina Fonti, per qualunque utente autenticato.

Regole dell'Esecuzione:
- **Tetto.** Partono al massimo `TETTO_RICERCHE` Ricerche: prima le Fonti ufficiali, poi le editoriali. A parità di tipo partono prima le Fonti mai partite e poi quelle partite meno di recente. Le altre sono registrate come «saltate per tetto».
- **Blocco dei nuovi avvii.** Se una Ricerca avviata da meno di 2 ore è ancora in corso, né il cron né il pulsante avviano un'altra Esecuzione. Dopo 2 ore la Ricerca non blocca più e risulta «Senza risposta» nel riepilogo, ma può ancora ricevere il risultato.
- **Ritardi.** Dopo 48 ore, la prossima Esecuzione chiude solo le Ricerche senza un ID di run Parallel. Per le altre, un webhook in ritardo può ancora salvare le Notizie.
- **Nessun retry.** Una Ricerca fallita si recupera all'Esecuzione successiva grazie alla finestra temporale.

Cose da sapere sul cron:
- Vercel lo chiama solo sul deploy di produzione, non ritenta in caso di errore e non segue i redirect: per questo la rotta è esclusa dal proxy.
- Un cambio di `CRON_SECRET` vale solo dal deploy successivo.
- In locale non parte: per provarlo, `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/esecuzione`. Questo avvia Ricerche vere su Parallel.
