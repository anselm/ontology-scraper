# Porting what schema-test had: relation slots, component extensions, a fixture eval

2026-10-21. Applies the list in `20261021-schema-test-as-reference.md` (written by the Mac session that
brought `reference/schema-test/` in). Measured against the live database over the tunnel; the code is
committed but not deployed, so the live site shows the new census data only once it is.

## Done

1. **Relation slots on prototypes** (item 3). `census` now reads, for each prototype's instances, every
   relation entity they stand in, and stores the share standing in each (direction, predicate, other side's
   top kind) with the other side's most common prototype as the typical filler:
   `components.concept.relations = [{direction, predicate, kind, typical, share, n}]`, at most twelve,
   carriers of two or more. schema-test wrote these by hand as `expected_relations`; here they are learned.
   On the live data: container ship is controlled by a shipping company 50%, affected by a country 38%,
   located in a strait 25%; person works for a university 21%, leads a political party 14%; organisation is
   worked for by a person 19%, produces a report 14%. The prototype page shows them as a "Relation slots"
   section, each row read as `this → predicate → filler` or `filler → predicate → this`.
   Cost: the census went from two queries per prototype to four; 2 m 19 s for 1,534 prototypes over the
   tunnel, which will be well under a minute on the VM. It runs at most every six hours.

2. **Extending an existing component** (item 2). The component pass now asks the model first which frequent
   attribute keys belong to an existing component's essence and takes those as extension proposals with a
   reason, then for at most four new components. An extension is stored in `components` as
   `<component>+<field>+<field>` with `extends: <component>`, status `proposed`, like any proposal; the
   components page shows it as "agency + fields". Fields the component already has, or that an earlier
   extension already proposed, are dropped.

3. **Repeats dropped.** The live proposal list had 43 entries of which many were synonyms the earlier
   pass had re-proposed on each run (award / accolade / honor / recognition; case / legalcase / proceeding
   / proceedings / legal; finance / finances / funding; election / contest / electoral). The pass now shows
   the model what is already proposed and tells it not to repeat or rename, and a new proposal whose field
   set overlaps an existing or proposed one by Jaccard 0.5 or more is dropped before it is stored. The
   first run after the change: 2 extensions (vessel + cargo, crew; agency + members, memberStates), 2 new
   (health: diagnosis, injury; force: troops), 1 dropped. The 43 earlier repeats are still there; pruning
   them is a human decision, see open.

4. **A fixture eval** (item 5). `bin/eval-induction.mjs` compares the live vocabulary against schema-test's
   twenty hand-made components and twelve prototypes: by name, by field overlap (names normalised), and
   whether each fixture field has appeared as an attribute key at all. No model calls. Live today: 8/20
   components have a counterpart (location 0.67, meta 0.43, event→lifespan 0.40, relation 0.30, region→
   address 0.25, plus condition, facility, vessel by name with little field overlap); habitat, geology,
   taxonomy, media, schedule, quantity, party, post have none, and most of their fields have never been
   produced as keys, which says the news feeds do not carry that material rather than that induction
   missed it. 7/12 prototypes exist by label (container ship 8 things, port as harbour 10, person 1,782,
   organisation merged, organism and incident as proposed intermediates, place as the top kind); fishing
   boat, dive site, warehouse, consignment, refuel event do not, for the same reason.

5. **Lineage cited** (item 1): README "Reading further" and CLAUDE.md point at the reference folder and
   its two origin notes.

Not done: item 4, structured-record import, which waits for structured data to load.

## Open

- The 43 earlier proposals should be pruned by hand (or accept one of each synonym group and retire the
  rest); the components page has no accept/retire control yet, so it is a Mongo edit.
- Slot fillers use the preferred prototype label of the other side; for person→works-for the filler is
  "university" because universities are the best-resolved employers, not because they are the most common.
- Whether the simulation thread (systems over components, orbital-sim) lives here is still Anselm's call.
