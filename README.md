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

Per le scritture (azioni server e rotte API) usare `utenteRichiesto()` da `@/lib/auth`: restituisce l'utente corrente o lancia `NonAutenticatoError`.

Il proxy (`src/proxy.ts`) rimanda a `/auth/sign-in` chi non ha una sessione. Ogni scrittura verifica comunque la sessione lato server.

Better Auth UI fornisce i moduli di accesso e reset password, la vista di uscita e il menu utente. I vecchi link `/accedi` e `/reimposta` funzionano ancora.

I componenti del registro shadcn sono in `src/components/auth/`. Se li aggiorni, mantieni nascosti i link di registrazione. Allinea `better-auth` alla versione compatibile con `@neon/auth`.

## Agente (Parallel)

L'agente è una pipeline di Ricerche asincrone ([ADR 0002](docs/adr/0002-agente-come-pipeline-con-webhook.md)). `avviaRicercaPerFonte` (`src/lib/ricerca-fonte.ts`) avvia un task run sulla [Task API di Parallel](https://docs.parallel.ai/task-api/webhooks) e registra la Ricerca in `esecuzione_ricerca`. A fine run Parallel chiama `POST /api/parallel/webhook`. La rotta verifica la firma (Standard Webhooks, HMAC-SHA256), legge il risultato dalla Task API, lo valida con lo schema versionato in `src/lib/output-ricerca.ts` e salva le Notizie senza duplicati (URL normalizzato).

La rotta del webhook è esclusa dal proxy: si autentica con la firma, non con la sessione. Una risposta diversa da 2xx fa riprovare Parallel per 48 ore, quindi un errore temporaneo (DB, rete) non perde il risultato.

Il webhook non raggiunge `localhost`: in locale si prova con il client finto dei test (`npm test`).
