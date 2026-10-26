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
  OpenRouter (`OPENROUTER_API_KEY`), local ollama (`gpt-oss:20b`, canada1
  only). Since 2026-10-19 the bulk phases run on haiku 5.5
  (`OPENROUTER_MODEL_ANALYZE`, `OPENROUTER_MODEL_JUDGE`) with sonnet 5.5 as
  the second-attempt fallback and opus 5.5 for induction; the measurement
  behind that is `devlog/20261019-cost-pass.md`. `ANALYZE_BUDGET` documents
  a day (400 on the VM). A 402/429 from OpenRouter pauses the tier and
  releases the claim; `bin/unfail.mjs analyze` revives documents that were
  failed by billing before that fix.
- Induction (`lib/ontology/induce.mjs`) learns relation slots per prototype in the census and proposes
  both new components and fields for existing ones, dropping repeats. `reference/schema-test/` is the
  April 2026 precursor kept verbatim (not built, not imported); `bin/eval-induction.mjs` compares the
  live vocabulary against its hand-made components and prototypes with no model calls.
- Alerts: `bin/health.mjs` (checks in `lib/health.mjs`: stale present, stalled worker, no intake, billing
  errors, failure rate, disk, site) runs hourly on the VM from `ontology-health.timer` and pushes problems,
  all-clears and a daily digest to ntfy topic `NTFY_TOPIC` (anselm-alerts) via `lib/alerts.mjs`; a 402 from
  OpenRouter pushes at once. Run it by hand with `node bin/health.mjs` (add `--force` to send a digest now).
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
