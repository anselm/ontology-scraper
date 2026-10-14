# 2026-10-14 — First build: pipeline, site, live on exe.dev

Point-in-time entry, written at the end of the first day. Rests on
`20261014-architecture.md` and the three survey entries; what is below was
run and looked at, not planned.

## What exists

- **Pipeline** (`lib/`): poll → extract → analyze → resolve on `content`,
  link and embed on `entities`, induction over the vocabulary when enough
  has accumulated. Phases are claimed by status with a lease; bounded
  retries; a VERSION constant per phase and `bin/rerun.mjs` mark work dirty.
- **Store**: one module, repositories per collection: sources, content,
  analyses, entities (instances, prototypes, relations, merges, all one
  shape), claims (bitemporal observations), components (definitions as
  data), geocache, state, hits.
- **Site** (Svelte 5, Tailwind 4, Vite 8, socket.io): map with a time
  window slider and a detail card; relationship graph; prototypes and
  components pages; sources and pipeline (public operator views); a
  per-document "reading" page showing spans and relations; dated reader
  notes from `notes/`; about. Light and dark verified by screenshot at
  desktop and phone widths.
- **Live**: https://ontology-monster.exe.xyz, VM `ontology-monster`, docker
  mongo, units `ontology-server` and `ontology-worker`, manual deploy.
  `ssh exe.dev domain add` done for ontology.monster and www.

## First results

Fifteen sources polled: 527 items on the first pass. Two articles analysed
and resolved on this box as the test: 33 instances, 26 prototypes, 20
relations, 20 claims. The extraction looked right at a glance: places came
with approximate coordinates and radii, offices stayed off the prototype
(a "person" with a role), attributes came as key/value, predicates on the
spine with the surface verb kept.

## Dead ends and surprises

- **The Anthropic account has no credits** (400 on the first call). The
  model layer now retires that tier for the session on a billing error and
  falls to OpenRouter, where the same model family is listed and Anselm's
  key is funded. Measured cost: about 5.7k input and 3.6k output tokens per
  article on Opus 5.5, roughly ten cents an article at list rates; the
  daily budget is 100 articles. Moving the bulk pass to Haiku is one
  environment variable and about twenty-five times cheaper; his call.
- **Wikidata linking by exact label is wrong two times in five.** Stratford
  (Victoria) linked to Stratford, Connecticut; Maffra to a different
  Maffra. The linker now demands a coordinate within a few radii of the
  model's approximate point for places, and a shared description word for
  everything else; it skips rather than guesses. Two of five linked after
  the change, both right.
- **MapLibre 6.14 does not inline its worker**; Vite emitted no worker file
  and every GeoJSON layer stayed empty with "Worker failed to load". A
  prebuild step copies the worker into `public/` and the map calls
  `setWorkerUrl`. matchmaker on 6.10 is unaffected.
- **Svelte effect loop in the graph**: the build wrote `links` and then
  read it to seed the force simulation inside the same effect. Untracked.
- **The server caches the HTML shell** at start; after a rebuild every page
  was blank until a restart. Deploy restarts the units, so only local runs
  are affected.
- ReliefWeb's feed returns 406 to our accept header; left for later.

## Decisions made while building

- Geocode and link collapsed into one `link` phase: one Wikidata lookup
  gives both the id and the point.
- Induction runs when ten new prototypes have appeared or six hours have
  passed with new instances; it needs four prototypes under a top kind
  before asking for a hierarchy.
- Extraction fetches publisher pages at the worker's pace with no per-host
  delay beyond the tick; polite enough at forty pages a minute across
  fifteen hosts, but a per-host pause belongs in the next pass.

## Pending Anselm

- Cloudflare DNS for ontology.monster: root CNAME, grey cloud, flattened,
  to `ontology-monster.exe.xyz`, and `www` the same. The zone token in
  `~/.config/cf/token` expired 2026-09-30, so this needs a fresh token or
  his hand.
- Whether the bulk analysis runs on Opus 5.5 (default, ~$10 a day at the
  budget) or Haiku 5.5.
- Whether to fund the Anthropic account; until then OpenRouter carries it.
- Push: everything is committed and unpushed.

## Next

Let the VM worker read for a day, then look at what induction proposes:
the prototype hierarchy per top kind, the role-like flags, and the first
component proposals from recurring attribute keys. Write a reader note on
what it found. Then a per-host politeness delay, the ReliefWeb header, and
a labelled pair set to calibrate the resolver's thresholds.
