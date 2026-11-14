## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Next.js

Questa versione di Next.js ha breaking changes: API, convenzioni e struttura dei file possono differire da ciò che conosci. Prima di scrivere codice leggi la guida pertinente in `node_modules/next/dist/docs/` e rispetta i deprecation notice.

## Database

Postgres su Neon (progetto `esg-agent`, regione Francoforte). La stringa di connessione è in `.env.local` (`DATABASE_URL`), non va committata.
