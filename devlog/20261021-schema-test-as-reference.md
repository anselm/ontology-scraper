# schema-test brought in as reference

Anselm: "i want to just look at and compare and contrast this code to a similar code effort at
../../2027/automatic-schema-validator ... should i throw away ../../2027/automatic-schema-validator or is
there work that can be kept or used here?" and then: "i think i would merge it in here as reference
material actually - maybe add a devlog entry citing it - and then let the other version of claude pick it
up and apply changes?"

Done by a Claude Code session (Opus 5.5) on nudibranch, session `2b5acb50-6662-4688-ad8d-d74d1c9c23ed`,
log at `~/.claude/projects/-Volumes-summer-projects-2026-ontology-scraper/` on that Mac. No code in this
project changed; the work below is left for the room on canada1.

## What it is

`reference/schema-test/` is a verbatim copy of `~/projects/2027/automatic-schema-validator` (package name
`schema-test`), written 2026-04-30 to 2026-05-01. It was never a git repo, so this copy is now its only
versioned home; the original folder is untouched. No secrets were in it (no `.env`).

It is a CLI chain over flat JSON: `generate` (Claude writes short invented news vignettes), `import`
(JSON records or text into a source envelope), `extract` (entities and relations), `derive` (decompose
entities into ECS components, reusing, extending or inventing). Two invented sources, 20 components
seeded from social appliance's `public/shared/schema-components`, 12 hand-written prototypes. It is not
wired into this project's build or runtime; nothing imports it.

## What this project already supersedes

Real feeds instead of invented stories, Mongo through `lib/store.mjs` instead of files, phases with leases,
resolution and Wikidata linking (schema-test deferred dedupe), induced prototypes with a census, hierarchy
and merges in `lib/ontology/induce.mjs` (schema-test's were hand-written and its cluster step never
built), the UI and the deploy.

## What to take from it (for the canada1 room to apply)

1. **The origin notes.** `reference/schema-test/notes/20260430-initial-prompt.md` (Anselm's own brief)
   and `20260430-initial-thoughts.md` (an 18 KB conversation decomposing social objects into components).
   They state the ECS motive and the hope that a simulation would consume the components. Read them;
   cite them from here rather than copying.
2. **Extending an existing component.** `bin/derive-components.js` and `componentDecompositionPrompt` in
   `lib/prompts.js` let the model add fields to an existing component with a rationale, recorded as
   provenance. `proposeComponents` in `lib/ontology/induce.mjs` only invents new components from
   attribute-key frequency. Adding an "extend" path (proposed, for a human to accept, like the rest) is
   the closest thing to the refactoring-over-time this project wants.
3. **Expected relations on prototypes.** The hand-written prototypes in `reference/schema-test/data/prototypes/`
   carry `expected_relations` (dive site: `inhabited_by` organism, `located_in` region). Our
   `concept.bundle` has component typicality and attribute keys but no relation slots. The census could
   compute predicate typicality per prototype from the relation entities already stored, giving each kind
   FrameNet-like slots learned rather than written.
4. **Structured-record import.** `bin/import-source.js` keeps typed fields and the extraction prompt tells
   the model to prefer them over prose. Our inhale reads only feeds and articles. Worth porting only when
   there is structured data to load (e.g. into-the.blue dive sites).
5. **An evaluation fixture.** The 20 components and 12 prototypes are a hand-made answer to compare
   induction against: does it rediscover something like `vessel`, `cargo`, `condition`, `habitat`?

Not worth taking: the vignette generator, the file storage, the CLI glue, the Claude client.

## One divergence to keep in view

schema-test aimed at simulation: its README says the real test is writing tick-based systems over the
components (ties to orbital-sim). This project's components are normative feature bundles for an
ontology, and nothing consumes them as systems. Whether that thread lives here is Anselm's call.
