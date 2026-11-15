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

## Accesso (Neon Auth)

Tutta l'app è dietro login (Neon Auth, Managed Better Auth, email e password). Non c'è registrazione pubblica: gli utenti si creano dal pannello Neon (progetto `esg-agent` → Auth → Users). Il recupero password si gestisce dal pannello.

Variabili d'ambiente (in `.env.local`, mai nel repository):

| Variabile | Descrizione |
| --- | --- |
| `DATABASE_URL` | Connessione Postgres su Neon |
| `NEON_AUTH_BASE_URL` | URL di Neon Auth del branch (pannello Neon → Auth → Configuration) |
| `NEON_AUTH_COOKIE_SECRET` | Segreto per i cookie di sessione, almeno 32 caratteri: `openssl rand -base64 32` |

Per le scritture (azioni server e rotte API) usare `utenteRichiesto()` da `@/lib/auth`: restituisce l'utente corrente o lancia `NonAutenticatoError`.

Il proxy (`src/proxy.ts`) reindirizza a `/accedi` chi non è autenticato, ma non basta: ogni scrittura deve verificare la sessione lato server.
