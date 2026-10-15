# ontology-scraper

Project-specific orientation only. House policy (devlog, git, UX, writing,
deploy) comes from the harness and is not repeated here.

## What this is

A machine reads the news on a schedule, finds the real things it is about,
decides what kinds of things they are (prototypes) and what parts those kinds
share (components), and shows its working: things on a map over time, a
relationship graph, the vocabulary of kinds and parts, and dated notes for
readers. The deep goal is entity, prototype and component discovery with
refactoring over time. Live on exe.dev VM `ontology-monster`; domain
`ontology.monster` (Cloudflare). Continues `saltspring-ontology`.

## Where things are

- Code: this folder. Repo: `anselm/ontology-scraper`.
- Devlog: `devlog/` (dated entries; read the tail first). The 2026-10-14
  entries hold the three literature surveys and the architecture decisions.
- Reader notes: `notes/` (dated markdown, bundled into the site at `/notes`).
- Deploy: `deploy/provision.sh`, `deploy/secrets.sh`, `deploy/deploy.sh`
  (manual; push is not deploy). Units on the VM: `ontology-server` (:8100)
  and `ontology-worker`. Secrets in `/etc/ontology.env` on the VM, from the
  local `.env`.

## Project-specific facts

- Models, in tier order: Anthropic SDK (`ANTHROPIC_API_KEY`; the account had
  no credits on 2026-10-14, so the tier retires itself on a billing error),
  OpenRouter (`OPENROUTER_API_KEY`, default `anthropic/claude-opus-5.5`),
  local ollama (`gpt-oss:20b`, canada1 only). Per-phase override via
  `MODEL_<PHASE>` / `OPENROUTER_MODEL_<PHASE>`. `ANALYZE_BUDGET` documents a
  day (default 100). Measured 2026-10-14: about 5.7k in + 3.6k out tokens per
  article on Opus 5.5 through OpenRouter.
- Mongo: `ontology` database; locally the hustles docker mongo on :27017, on
  the VM a docker mongo bound to localhost. `lib/store.mjs` is the only
  module touching it.
- Phases are claimed by status with a lease (`lib/pipeline.mjs`); bump a
  phase's VERSION constant or run `bin/rerun.mjs <phase>` to re-run it.
- Wikidata linking is deliberately conservative: a place must sit within a
  few radii of the model's approximate point, anything else must share a
  description word; otherwise skipped (homonyms: Stratford, Maffra).
- MapLibre 6.14 loads its worker from a file beside the bundle that Vite does
  not emit; `scripts/copy-worker.mjs` (prebuild) copies it to
  `public/maplibre/` and MapView calls `setWorkerUrl`.
- The server caches `dist/index.html` at start: restart it after a build.
- Screenshots: `scripts/shot.mjs <url> <out> [w] [h] [dark]` (CDP, waits for
  the socket; run with the sandbox off).
- Sources whose terms forbid machine reading (BBC, NYT) are seeded with
  `status: review` and not polled. Bodies are stored, never served.
- ontology.monster and www are live (2026-10-14): grey-cloud CNAMEs to
  `ontology-monster.exe.xyz`, registered with exe.dev. Rebind or add a
  domain with `~/projects/2027/harness/bin/exe-domain <vm> <domain>` on canada1. See
  `deploy/DEPLOYMENT.md` and `devlog/20261014-domain-live.md`.
