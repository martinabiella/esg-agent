## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Next.js

Questa versione di Next.js ha breaking changes: API, convenzioni e struttura dei file possono differire da ciò che conosci. Prima di scrivere codice leggi la guida pertinente in `node_modules/next/dist/docs/` e rispetta i deprecation notice.

## UI

Usa sempre shadcn/ui per i componenti dell'interfaccia. Se un componente non è presente in `src/components/ui/`, aggiungilo con `npx shadcn@latest add <componente>` invece di scrivere HTML/Tailwind a mano.

## Database

Postgres su Neon (progetto `esg-agent`, regione Francoforte). La stringa di connessione è in `.env.local` (`DATABASE_URL`), non va committata.
