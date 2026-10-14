# ontology-scraper

Reads the news, finds the real things it is about, works out what kinds of things they are and what parts those kinds share, and shows its working. Live at [ontology.monster](https://ontology.monster).

The deep goal is entity, prototype and component discovery with refactoring over time: a tool for watching how the concept space of the news organises itself, and for revising the vocabulary when it strains.

- **Notes for readers**: [ontology.monster/notes](https://ontology.monster/notes), from `notes/` (dated markdown, bundled into the site).
- **Working log**: [`devlog/`](devlog/), dated entries including the three literature surveys of 2026-10-14 and the architecture decisions. Read the tail first.
- **Architecture**: `devlog/20261014-architecture.md` has the decisions, data model and module map.

## Run

```
npm install
cp .env.example .env     # mongo, and a model key (ANTHROPIC_API_KEY or OPENROUTER_API_KEY); ollama is the free fallback
npm run seed             # sources, component definitions, top kinds
npm run once             # one pass of the pipeline
npm run worker           # the loop
npm start                # the server on :8100 (serves dist/ after npm run build)
npm run dev              # the Vite dev server on :5174, proxied to :8100
```

`bin/rerun.mjs <phase>` marks a phase dirty after a prompt or scheme change. Deploy with `deploy/provision.sh`, `deploy/secrets.sh`, `deploy/deploy.sh` (manual; push is not deploy).

## Shape

`lib/store.mjs` is the only module that touches Mongo. `lib/pipeline.mjs` is the phase machinery (status per document, claim with lease, bounded retries, dirty marking). Phases: `lib/inhale` (poll, extract), `lib/analyze` (the pre-analysis prompt and schema), `lib/resolve` (mentions to entities, claims, relations, merges), `lib/enrich` (Wikidata link, embeddings), `lib/ontology` (component seeds, induction). `lib/service.mjs` is the read side; `server/index.mjs` the socket.io transport; `src/` the Svelte 5 app.
