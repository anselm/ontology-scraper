# 2026-10-14 — Architecture: decisions, data model, module map

Point-in-time entry. Rests on Anselm's brief (2026-10-14), the three survey
entries of the same date (`20261014-survey-aggregation.md`,
`20261014-survey-extraction.md`, `20261014-survey-ontology.md`), the
saltspring-ontology re-examination (2026-08-02) and the house skills
(modular-architecture, house-ux, local-llm). Nothing here has run yet.

## Decisions

1. **Write our own aggregator, in Node.** The survey found every maintained
   open-source aggregator is a reader with per-user read state on Postgres or
   MySQL; none stores raw bodies with phase flags, and none fits beside
   Mongo. The fetch-and-normalise layer is small once the policy is settled.
   We copy Miniflux's rules rather than re-derive them: SHA-256 hash chain
   (guid, then guid+url, then guid+position, then url, then title+content),
   unique index on (source, hash), missing dates become fetch time, three
   parse errors stop a source until a human acts, poll interval clamped
   between 5 minutes and 24 hours, conditional GET with both validators,
   full-jitter backoff on transport errors, tombstones instead of deletes.
2. **Libraries.** `@rowanmanning/feed-parser` (released 2026-09, two deps,
   handles RSS 1.0 RDF which DW, Nature and Science use);
   `@extractus/article-extractor` for body text (Readability on linkedom
   with a sanitiser); raw HTML kept so re-extraction costs nothing. No
   Python sidecar unless a measured sample shows the Node pair failing.
3. **Phases pick work by status; no job queue, no event sourcing.** This is
   the crawler pattern (Nutch's CrawlDb). Every document carries
   `phases.<name> = {status, at, attempt, error, version}`; a worker claims
   with an atomic update and a lease; a sweeper re-queues expired leases.
   Retries are bounded. Changing a phase's version marks everything dirty
   for that phase without touching the others, which is the re-run Anselm
   asked for after a scheme change.
4. **Two analysis passes, separate collections.** Pre-analysis is per
   document and cached by model and prompt version: entity mentions with
   verbatim spans, kind guesses, relations conditioned on the entity list,
   stance as a small enum, time and place hints. Resolution is a batch
   phase that turns mentions into entities: alias match first, embeddings
   for blocking, a model judge only for the uncertain pairs, every
   mention-to-entity link scored and revisable. KGGen and GraphRAG both
   point this way; GraphRAG's finding that recall halves at long chunk
   sizes sets the chunk at roughly 600 tokens with a gleaning pass.
5. **Identity is arbitrary; names are evidence; merges are events.** The
   saltspring flaw (id = hash of name) is not repeated. An entity's id is a
   random id at creation. A merge writes a `merge` entity recording both
   ids, the evidence and the model, so it can be undone.
6. **Kinds are scored claims with ranks, never facts.** Each entity carries
   a `kinds` component: `[{prototype, score, rank, since, until, sources,
   extractor}]` with Wikidata's rank discipline (preferred, normal,
   deprecated; deprecate with a reason rather than delete; time-bound when
   a kind was once true).
7. **Five rigid top kinds, everything else soft.** `agent`, `place`,
   `thing`, `event`, `work`. These are the only kinds every upper ontology
   agrees on (persistent thing versus happening, then agent and place).
   Below them prototypes are SKOS-like concepts with scored `broader`
   links, induced from instances. A prototype earns existence only when it
   predicts components or fields its parent does not (Noy and McGuinness).
   Roles (`politician`, `captain`) are anti-rigid per OntoClean and are a
   `role` component on a person, never a kind above one.
8. **Components are normative feature bundles**, in Hampton's sense:
   correlated features, not necessary conditions. The starter set keeps
   the social-knowledge-service names where they exist. The component
   definitions live in the database as data (seeded from code) so they can
   be refactored at runtime; each prototype carries the typicality weight
   of each component learned from its instances.
9. **Time is bitemporal.** Every extracted fact is an observation: valid
   time from the text, transaction time from the source's publish date and
   our fetch. The entity document holds a computed view; the `claims`
   collection holds the observations and is never overwritten. Conflicts
   between sources stay visible.
10. **Places are a point and a radius, with an optional polygon later.**
    Wikidata gives one point; GeoNames gives a bounding box; radius comes
    from the box diagonal or a default per feature class. The Strait of
    Hormuz is Q79883, a point with a stated width of 55 km.
11. **Models.** Anthropic API first, local ollama second, nothing third;
    every analysis records which model and prompt version produced it.
    The default model for every phase is `claude-opus-5-5` at low effort
    with structured outputs; the per-phase model is an environment
    variable so Anselm can move the bulk pass to a cheaper tier. A daily
    budget caps the number of documents analysed. The 2026-09-15
    matchmaker benchmark showed local models fail at batched JSON tagging,
    so local is a fallback, not the default.
12. **Legal posture.** Bodies are stored privately for extraction and never
    served. The site publishes entities, short quoted spans with links, and
    source links. Each source carries a `terms` note; a source's bodies can
    be purged by one command. BBC and NYT terms forbid machine analysis
    without permission; they are seeded as `status: review` and not polled
    until Anselm decides.
13. **Transport.** fastify plus socket.io, requests as `{name, payload}`
    switched in one handler map; HTTP only for the static build, the notes
    and a plain rendering of entity pages for crawlers.
14. **Notes for readers.** `notes/` holds dated markdown written for a
    reader who did not watch, rendered at `/notes` by the app. The devlog
    stays the working record in the repository. The README points to both.

## Data model (Mongo, database `ontology`)

- `sources`: `_id` (slug), `url`, `title`, `publisher`, `tags[]`, `terms`,
  `status` (active, paused, review, dead), `poll` {`interval`, `lambda`,
  `next`, `last`, `etag`, `lastModified`, `failures`, `parseErrors`,
  `lastError`}, `stats` {`items`, `lastItemAt`}.
- `content`: `_id` = sha256 hash per the chain, `source`, `url`, `title`,
  `author`, `published` (claimed), `fetched`, `summary`, `html`, `text`,
  `extractor`, `lang`, `present`, `gone`, `phases` {`extract`, `analyze`,
  `resolve`}.
- `analyses`: `_id` = content id + model + prompt version, `content`,
  `model`, `promptVersion`, `at`, `summary`, `stance`, `entities[]`
  {`name`, `kind`, `description`, `span`, `aliases[]`, `place`, `when`},
  `relations[]` {`from`, `predicate`, `to`, `quote`, `stance`, `when`},
  `status`.
- `entities`: `_id` random, `kind` (instance, prototype, relation, merge),
  `components` {see below}, `phases` {`embed`, `geocode`, `link`}, `stats`
  {`mentions`, `sources`, `firstSeen`, `lastSeen`}.
- `claims`: `_id`, `entity`, `component`, `field`, `value`, `validFrom`,
  `validTo`, `content`, `source`, `publishedAt`, `ingestedAt`, `extractor`,
  `confidence`.
- `components`: `_id` name, `description`, `fields` {name: {type, doc}},
  `normative`, `version`, `since`, `status` (seed, proposed, accepted,
  retired).

Starter components: `meta` (label, description, aliases, depiction, tags),
`identity` (wikidata, geonames, imo, iso3166), `location` (lat, lon, rad,
point, method), `extent` (geometry), `address`, `lifespan` (begins, ends,
precision), `occurrence` (begins, ends, participants, place), `agency`
(legalForm, jurisdiction, headcount), `role` (office, in, begins, ends),
`membership` (group, begins, ends), `vessel` (imo, mmsi, flag, type),
`jurisdiction` (polity, level, capital), `provenance` (sources, extractor,
model, promptVersion), `kinds` (scored claims), `relation` (subject,
predicate, object), `concept` (prefLabel, altLabel, broader, related,
closeMatch, bundle), `stats`.

## Module map

```
lib/env.mjs                 .env loader, no dependency
lib/store.mjs               the only module that imports mongodb; a repository per collection
lib/sources/seed.mjs        the curated source list (config/sources.json) and seeding
lib/sources/schedule.mjs    next-poll maths: Poisson estimate, clamp, full-jitter backoff
lib/inhale/feed.mjs         fetch a feed with conditional GET, parse, normalise, hash chain
lib/inhale/article.mjs      fetch a page, extract body text, keep html
lib/inhale/index.mjs        phases: poll, extract
lib/analyze/llm.mjs         tiered model client (Anthropic then ollama), labelled outputs
lib/analyze/extract.mjs     phase: analyze; the pre-analysis prompt and schema, versioned
lib/resolve/index.mjs       phase: resolve; mentions to entities, claims, relations, merges
lib/resolve/match.mjs       alias normalisation, blocking, scoring
lib/enrich/embed.mjs        phase: embed (ollama nomic-embed-text, clustering prefix)
lib/enrich/geo.mjs          phase: geocode (Wikidata then GeoNames, cached)
lib/enrich/link.mjs         phase: link (Wikidata reconciliation API)
lib/ontology/components.mjs seed component definitions and the five top kinds
lib/ontology/induce.mjs     periodic: prototype bundles, component census, split and merge proposals
lib/pipeline.mjs            the phase registry, claim-with-lease, sweeper, dirty marking
lib/service.mjs             read side for the UI: window queries, graph, vocabulary, pipeline status
server/index.mjs            fastify, static build, socket.io handler map
bin/worker.mjs              the loop; bin/seed.mjs; bin/rerun.mjs <phase>
src/                        Svelte 5 app: map with time slider, graph, prototypes, components, sources, pipeline, notes
notes/                      dated reader-facing notes
```

## What is deliberately not built yet

WebSub receiver, polygons for places, Wikipedia Current Events as a
discovery source, a labelled pair set for calibrating merge thresholds,
agreement-based confidence across models, state-change detection on
relations. Each is named in a survey with its evidence.
