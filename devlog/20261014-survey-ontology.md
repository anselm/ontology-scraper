# 2026-10-14 — Survey: ontology and schema design

Literature survey written 2026-10-14 by a research agent (Claude) at the
start of the project, before any code. Every claim carries the URL it came
from; where a page did not say something the report says so. Point in time.
The synthesis and decisions are in `20261014-architecture.md`.


## 1. Prior art for component-style schemas outside games

**ECS itself.** "An ECS consists of entities composed of data components, along with systems that operate on those components"; an entity "is typically just a unique ID"; it "prioritizes composition over inheritance". Uses outside games: only robotics simulators, flagged "citation needed" (https://en.wikipedia.org/wiki/Entity_component_system).

**ECS applied to knowledge representation: essentially nothing.** An extended search for "entity component system" with knowledge graph / ontology / knowledge representation returned only patents and generic KR texts (e.g. https://link.springer.com/chapter/10.1007/3-540-36678-4_5), none about ECS. The framing is novel in name; the *structure* has close relatives:

- **Datomic / EAV.** A database is "a set of immutable atomic facts called datoms" (entity, attribute, value, transaction, op). There are no tables; there is "a universal schema of user-defined attributes, in which any entity can possess any attribute", and "Decisions about which attributes apply to which entities are made by your application." Retractions are new datoms; the store is "indelible and chronological" and readable "as of" any time (https://docs.datomic.com/whatis/data-model.html). ECS minus named component bundles, plus the history a refactoring loop needs.
- **RDF open world.** Under the open-world assumption "lack of knowledge does not imply falsity" (https://en.wikipedia.org/wiki/Open-world_assumption). The page is silent on RDF; that a stated type list is never complete is my inference.
- **schema.org.** Types sit in "a multiple inheritance hierarchy"; an entity may be "both a Book and a Product"; type-property associations are "closer to 'guidelines' than to formal rules"; "some data is better than none" (https://schema.org/docs/datamodel.html). "Pending" is "a staging area for new schema.org terms that are under discussion and review"; rejected terms go to the Attic; "826 Types, 1540 Properties" (https://schema.org/docs/schemas.html). Pending/attic is a ready-made lifecycle for proposed and retired prototypes.
- **Wikidata.** P31 "instance of" is not transitive; P279 "subclass of" "is a transitive property"; "An item can be both an instance and a class"; P31/P279 statements "should not have any restrictive qualifier" (https://www.wikidata.org/wiki/Help:Basic_membership_properties). The root is Q35120 "entity", "anything that can be considered, discussed, or observed", mapped to owl:Thing, schema.org Thing, CIDOC CRM E1 and rdfs:Resource; "Every entity in Wikidata is implicitly an instance of (P31) entity" (https://www.wikidata.org/wiki/Q35120). Ranks: "The preferred rank is assigned to the most current statement or statements that best represent consensus"; deprecated is for "information that was never correct, but was at some point thought to be"; historical values are not deprecated but given start time (P580) / end time (P582) qualifiers; "Deprecating an error is preferred over deleting it" (https://www.wikidata.org/wiki/Help:Ranking). This is the clearest existing model of kind-assignment as a revisable claim.
- **Dublin Core application profiles.** The Singapore Framework (presented 2007) defines a profile as "the set of guidelines, description rules, and constraints used in creating a specific set of metadata records"; designers "snap together" "building blocks" from independently created vocabularies, "The metaphor of the Lego set" (https://www.dublincore.org/specifications/dublin-core/singapore-framework/). A profile is a component bundle by another name.
- **CIDOC CRM.** ISO 21127:2023; core classes Space-Time, Events, Material Things, Immaterial Things; Events cover "participants (people, either individually or in groups)" (https://en.wikipedia.org/wiki/CIDOC_Conceptual_Reference_Model). E-codes and E55 Type were not on the page; cidoc-crm.org not fetched.
- **Mixins and traits.** A mixin is "a class that contains methods for use by other classes without having to be the parent class" (Symbolics Flavors), used "to avoid the inheritance ambiguity that multiple inheritance can cause" (https://en.wikipedia.org/wiki/Mixin).
- **Noy & McGuinness, Ontology Development 101.** "There is no one correct way to model a domain— there are always viable alternatives"; "Ontology development is necessarily an iterative process"; a subclass is introduced "usually only when there is something that we can say about this class that we cannot say about the superclass"; "Individual instances are the most specific concepts represented in a knowledge base" and where instances begin "depends on what the potential applications of the ontology are" (https://protege.stanford.edu/publications/ontology_development/ontology101.pdf). The "new class only if new slots" rule is the best single test for when a prototype deserves to exist versus being a tag.
- **OntoClean (Guarino & Welty).** Metaproperties: rigidity (+R essential to all instances, e.g. person; ~R anti-rigid, instances "must be able to lose", e.g. student), identity, unity, dependence (student requires a teacher). Inheritance constraints: +I, +U, ~U, ~R, +D pass to subclasses; −R, +R, −U, −D do not (https://en.wikipedia.org/wiki/OntoClean). A bioinformatics paper citing Guarino (1999, 2002) states a material role is anti-rigid, inherits identity and is dependent: (−R, +I, +D) (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3509948/, via search snippet; the LOA overview PDF was image-only). This answers "is 'politician' a kind or a role?": a role, anti-rigid and dependent on an office; roles must not sit above rigid types.

## 2. Upper ontologies

| Ontology | Top split | Notes (from fetched pages) |
|---|---|---|
| BFO | continuant vs occurrent, "two disjoint categories" | ISO/IEC 21838-2:2021; 650+ projects, mostly biomedicine/defence (https://en.wikipedia.org/wiki/Basic_Formal_Ontology) |
| DOLCE | not stated on fetched pages | "stable after its first release in 2002/2003", FOL; OWL versions "do not cover modality, nor temporal indexing" (http://www.loa.istc.cnr.it/dolce/overview.html); categories "thought of as cognitive artifacts" (https://en.wikipedia.org/wiki/Upper_ontology) |
| SUMO | Entity → Physical (Object, Process) / Abstract (Quantity, Proposition, Attribute, Relation, Set or Class) | first release Dec 2000; mapped to WordNet (https://en.wikipedia.org/wiki/Suggested_Upper_Merged_Ontology) |
| Cyc | individuals, collections, functions, predicates; microtheories as contexts | OpenCyc shut ~2017 (https://en.wikipedia.org/wiki/Cyc) |
| gist | "around 100 classes"; "a small number of top-level concepts", everyday names "person, organization, and agreement"; "extensive and fine-grained disjointness at the highest level" | CC BY 4.0; gist:Category and events not described on the page (https://www.semanticarts.com/gist/) |
| schema.org | Thing; commonly used: Action, CreativeWork, Event, Organization, Person, Place, Product | pending/attic lifecycle (https://schema.org/docs/schemas.html) |
| Wikidata | entity (Q35120), subdivisions abstract/physical, individual/collective | (https://www.wikidata.org/wiki/Q35120) |
| CIDOC CRM Core | Space-Time, Events, Material Things, Immaterial Things | (https://en.wikipedia.org/wiki/Upper_ontology) |
| YAMATO | "an advanced description of processes and events" and "a theory of roles" | (https://en.wikipedia.org/wiki/Upper_ontology) |

Criticisms on the same page: "No particular upper ontology has yet gained widespread acceptance as a de facto standard"; "There is no self-evident way of dividing the world up into concepts, and certainly no non-controversial one" (https://en.wikipedia.org/wiki/Upper_ontology).

**Least contested small set.** The one distinction every system above shares is *thing that persists* vs *thing that happens* (BFO continuant/occurrent, SUMO Object/Process, CIDOC Material Things/Events, schema.org Thing-children vs Event). Below that, agent, place and abstract/informational object recur in gist, schema.org and CIDOC. Roles are the contested area: BFO's and DOLCE's role handling was not on the pages fetched; OntoClean makes roles anti-rigid and dependent; YAMATO has a role theory. For a news graph: four rigid top kinds (agent, place, physical thing, event) plus work, with everything role-like a component, not a kind (section 7).

## 3. How humans categorise

- **Rosch.** Prototype theory emerged in 1971; "Natural categories" (1973), "Cognitive representations of semantic categories" (1975): 200 students rated furniture; chair and sofa top, telephone 60th. Typicality shows in response time ("a robin is a bird" faster). Basic level = highest cue and category validity; "chair" easy to picture, "furniture" not. Hampton reframed prototypes as "bundles of correlated features", covering graded typicality and vague boundaries (https://en.wikipedia.org/wiki/Prototype_theory).
- **Wittgenstein.** Games share "a complicated network of similarities overlapping and criss-crossing", no single defining feature (same page).
- **Lakoff (1987, U. Chicago Press).** Idealized cognitive models, "structured mental representations that can be culturally specific"; radial categories, "a network radiating from a central prototype"; the classical view "assumes that all category members share a set of defining features"; the title is from Dyirbal, where one noun class holds "women, water, fire, violence, and certain animals" (https://en.wikipedia.org/wiki/Women,_Fire,_and_Dangerous_Things).
- **Berlin's folk taxonomy.** "Typically, five such ranks are recognized": unique beginner, life form, generic, specific, varietal; the generic level is "the most important level" and "the first level to be learned by children" (maple tree, blue jay). The ranks' existence "has been questioned for more than 20 years" because folk taxonomies "are not neatly hierarchical" (https://en.wikipedia.org/wiki/Folk_taxonomy; Berlin, Breedlove & Raven 1966 *Science* and 1973 *Am. Anthropologist* are the cited works).
- **Natural kinds.** Boyd's "homeostatic property clusters" were built for biological species, "where vague boundaries are expected" (https://en.wikipedia.org/wiki/Natural_kind).
- **Criticisms.** "Pet fish" has a prototype not built from "pet" and "fish" (Osherson & Smith 1981, https://en.wikipedia.org/wiki/Prototype_theory): "container ship" must be learned from instances, not composed.
- **The platypus.** 1799, George Shaw: "impossible not to entertain doubts as to its genuine nature"; he checked for stitching; egg-laying was confirmed by Caldwell in 1884; the genome has "both reptilian and mammalian elements" (https://en.wikipedia.org/wiki/Platypus). Monotremes are "the only mammals still in existence which lay eggs"; their taxonomy "is under debate" (https://en.wikipedia.org/wiki/Monotreme). Lesson: the platypus was not a misclassification but a new prototype that made "live birth" optional in "mammal" while a rigid identity (lactation) held. News will deliver platypuses: a drone-mothership "carrier", an unrecognised "country".
- **Bowker & Star, *Sorting Things Out* (MIT Press, 1999).** The MIT Press page returned 403; Wikipedia confirms co-authorship, publisher, and the introduction title "To Classify Is Human" (https://en.wikipedia.org/wiki/Geoffrey_Bowker). No source fetched for "residual categories" or "torque", so I do not quote them.

**What this implies.** "Normative components" should be Hampton-style *correlated feature bundles*, not necessary-and-sufficient conditions. A prototype is a kind whose typical instances carry a characteristic bundle; membership is graded by how much of the bundle an instance has. The basic level (ship, river, politician) is where prototypes should be dense; superordinates (vehicle, agent) are thin and mostly rigid.

## 4. Ontology evolution and induction

- **Classic evolution literature.** Noy & Klein, "Ontology Evolution: Not the Same as Schema Evolution", *KAIS* 6(4), 2004: the database versioning/evolution split does not carry over and the change-operation set differs (https://www.datalearner.com/academic/journal-papers/0219-1377/volumes-and-issues/6/paper-detail/15707). Zablith et al., "Ontology Evolution: a process-centric survey", *KER* 2013 (https://research.modul.ac.at/en/publications/ontology-evolution-a-process-centric-survey/).
- **Ontology learning from text.** Eight tasks: terminology extraction (TF/IDF, C-value), concept discovery, hierarchy derivation (clustering, Hearst 1992 patterns), non-taxonomic relations, rule discovery, population, hierarchy extension, frame/event detection; Buitelaar, Cimiano & Magnini (eds.), *Ontology Learning from Text*, IOS Press 2005 (https://en.wikipedia.org/wiki/Ontology_learning). The "layer cake" phrase is not on that page.
- **SPIRES / OntoGPT.** Caufield et al., arXiv:2304.02711, *Bioinformatics* 2024: "recursively performs prompt interrogation against GPT-3+ to obtain a set of responses matching the provided schema"; "uses existing ontologies and vocabularies to provide identifiers for all matched elements"; accuracy "comparable to the mid-range of existing Relation Extraction (RE) methods" (https://arxiv.org/abs/2304.02711). Schema-first; good for populating components once a schema exists.
- **GraphRAG.** Edge et al., arXiv:2404.16130: extraction prompt takes "One of the following types: [{entity_types}]", defaulting to "people, places, and organizations", hierarchical Leiden "recursively detecting sub-communities"; entity matching is "exact string matching" (https://arxiv.org/html/2404.16130v2). Not schema-free; types are a prompt parameter.
- **AutoSchemaKG.** Bai et al., arXiv:2505.23628: LLMs "simultaneously extract knowledge triples and induce comprehensive schemas directly from text", modelling "both entities and events" with "conceptualization to organize instances into semantic categories"; ATLAS has "900+ million nodes and 5.9 billion edges"; schema induction reaches "92% semantic alignment" with human schemas (https://arxiv.org/abs/2505.23628). The closest published pipeline to "schema-free then induce".
- **Chain-of-Layer** (CIKM 2024): top-down, layer-at-a-time taxonomy induction (https://dl.acm.org/doi/10.1145/3627673.3679608; page returned 403, from search snippet).
- **EvoTaxo.** Li, Ma & Ye, arXiv:2603.19711 (March 2026): "converts each post into a structured draft action over the current taxonomy"; evidence accumulates across time windows; edits consolidated by "dual-view clustering that combines semantic similarity with temporal locality"; a refinement-and-arbitration step selects edits; each node keeps a concept memory bank (https://arxiv.org/abs/2603.19711). This is the nearest thing to the requested refactoring loop. The abstract does not give the split/merge rules.
- **SKOS.** `skos:broader` "is not a transitive property"; `broaderTransitive` is inferred, not asserted; "SKOS is not a formal knowledge representation language"; exactMatch means "a high degree of confidence that the concepts can be used interchangeably"; closeMatch is non-transitive; concepts carry prefLabel/altLabel/hiddenLabel (https://www.w3.org/TR/skos-reference/). SKOS is the right carrier for a soft prototype hierarchy because its relations "do not have any formal semantics".

**Strategy that emerges.** Extract with a generous type list (GraphRAG/AutoSchemaKG), store raw type strings as claims, periodically induce the hierarchy from accumulated instances (Chain-of-Layer, clustering), consolidate edits over time windows (EvoTaxo), keep the taxonomy in SKOS. SPIRES-style schema-first extraction is the second pass once components are stable.

## 5. Talisman's Ontology Pipeline; Z39.19 and ISO 25964

Book: *Ontology Pipeline: A Framework for Knowledge Engineering*, Jessica Talisman, Technics Publications; "a clear sequence: controlled vocabularies, metadata schemas, taxonomies, thesauri, ontologies, and knowledge graphs". Chapter topics per stage: controlled vocabularies (corpus analysis, duplicates and homonyms, normalization, SKOS, Z39.19 governance); metadata schema (application profiles, semantic layer, MDM); taxonomy (coverage models, hierarchy, alternative labels, SKOS anatomy, lifecycle governance); thesaurus (concept relations, "lightweight inference", "why SKOS is enough"); ontology (RDF/RDFS/OWL, design heuristics, competency questions, "ontologies with AI"); knowledge graph (validation and query layers, NLP, vector databases, embeddings, deployment, governance) (https://technicspub.com/ontology-pipeline). Her Substack says it "will be available September/October, 2026" (https://jessicatalisman.substack.com/p/my-upcoming-book); the publisher page gives prices but no date, so shipping status today is unknown. Neither page says how an LLM fits each stage; the mapping below is mine.

Mapping to an LLM-laboured pipeline (mine): controlled vocabulary = the alias table the extractor builds; metadata schema = the component definitions; taxonomy = the induced prototype hierarchy; thesaurus = related and mapping links to Wikidata/schema.org; ontology = the rigid top layer plus OntoClean constraints; knowledge graph = the entity store with scored claims.

Standards: ANSI/NISO Z39.19-2005 (R2010), *Guidelines for the Construction, Format, and Management of Monolingual Controlled Vocabularies*, covering "lists, synonym rings, taxonomies, and thesauri" (https://www.niso.org/publications/ansiniso-z3919-2005-r2010). ISO 25964-1 (2011) and -2 (2013) define three relationship types: equivalence (synonyms), hierarchical (broader/narrower), associative ("closely related in some non-hierarchical way"); Part 2 covers mapping to other vocabularies; Z39.19 "has no data model" and both are "broadly compatible" (https://en.wikipedia.org/wiki/ISO_25964). The notations USE/UF, BT/NT, RT are conventional thesaurus shorthand; none of the pages I fetched defined them, so take that labelling as unsourced. For this project: equivalence = entity aliases (one preferred label, many alternates), hierarchical = prototype broader/narrower, associative = cross-links between prototypes that are not kinds of each other.

## 6. The user's prior design (social-knowledge-service)

DESIGN.md (Nov 2025) "explicitly prefers an ECS-style (entity component system) approach over rich, class-based objects"; only `kid` is required, `kind` is "debatable"; it "currently uses components themselves as types", considers schema.org-style multiple typing, and a hyphenated hierarchy (`party:person`, `party:pet`); relationships are separate objects (`subject`, `predicate`, `target`, `start`); confidence is "not discussed" (https://raw.githubusercontent.com/anselm/social-knowledge-service/main/packages/knowledge/DESIGN.md).

base-schemas.json has 6 components and 8 entities, no inheritance, `additionalProperties: false`:
- `meta`: slug, label, content, depiction, view, tags, aliases, provenance, created, updated, creatorAddress, permissions, props
- `time`: begins, ends, duration
- `location`: lat, lon (required), alt, rad, point (GeoJSON)
- `address`: streetAddress, city, region, postalCode, country, countryCode, admin1, admin2, iso_3166_2
- `stats`: children, upvotes, visited, observers, activity, reputation, distance
- `relation`: subject, predicate, object (required), rank, weight
- entities: post, event, thing, place, party, org, group, edge, each with `kind` const (https://raw.githubusercontent.com/anselm/social-knowledge-service/main/packages/knowledge/schemas/base-schemas.json).

Recommendations below keep these names where they exist.

## 7. Recommendations

**Starter components (normative feature bundles).** Fields are proposals; names reuse base-schemas where possible.

1. `meta` — label, description, aliases[], depiction, tags[], created, updated (from base-schemas; "description" replaces "content" for news entities).
2. `identity` — external ids: wikidata, schemaorg type, imo (ships), iso3166, geonames; one preferred label per language (SKOS prefLabel discipline).
3. `location` — lat, lon, alt, rad, point (as is).
4. `extent` — geometry (GeoJSON LineString/Polygon) for rivers, straits, borders; location alone is wrong for them.
5. `address` — as is.
6. `lifespan` — begins, ends, duration, precision (rename of `time`; use for births, foundings, launches, sinkings).
7. `occurrence` — begins, ends, participants[] (entity, role), location ref; the component that makes an entity an event (CIDOC "participants").
8. `agency` — can act: legalForm, jurisdiction, headcount. Marks agent-hood without a class.
9. `role` — holder-of: office/position, in (org or place), begins, ends. Anti-rigid and dependent per OntoClean; never a kind.
10. `membership` — member-of: group, begins, ends, rank.
11. `vessel` — imo, mmsi, flag, tonnage, type string. Domain bundle; one of many.
12. `jurisdiction` — governs: polity, level, capital.
13. `provenance` — sources[] (url, publisher, retrieved, span), extractor, model, prompt version.
14. `kinds` — see below: a list of scored kind claims, itself a component.
15. `stats` — as is, computed.

**Starter top-level prototypes (rigid, OntoClean +R).** `agent` (person, organisation), `place` (with extent or location), `thing` (physical, movable: ship, aircraft, weapon), `event` (has `occurrence`), `work` (document, law, treaty, dataset). Everything below is a soft prototype: `ship > container ship`, `agent > person > politician` is wrong by OntoClean; `politician` is `person` + `role{office}`. Use the Noy & McGuinness test: a prototype earns existence only when it predicts components or fields its parent does not.

**Soft hierarchy.** Store prototypes as SKOS-like concepts: `prefLabel`, `altLabel[]`, `broader[]` each with `confidence` and `evidence_count`, `related[]`, `closeMatch`/`exactMatch` to Wikidata Qids and schema.org types. Assert only direct `broader`; compute transitive closure. Each prototype carries its *normative bundle*: expected components with a typicality weight learned from instances (Hampton's correlated features), e.g. `ship: {location 0.98, vessel 0.95, lifespan 0.8, agency 0.1}`.

**Kind assignment as a scored claim.** Each entity's `kinds` component is a list of `{prototype, score, rank: preferred|normal|deprecated, since, until, sources[], extractor}` following Wikidata ranks: never delete, deprecate with a reason; time-bound with since/until rather than deprecate when the kind was once true. Score = extractor confidence combined with bundle fit (weighted fraction of the prototype's expected components present). The best basic-level prototype is `preferred`; its broader ones are `normal`.

**Refactoring loop (LLM-driven, EvoTaxo-shaped).**
- *Trigger to split:* a prototype's instances form two clusters over component presence or field values (e.g. half of `ship` carry `vessel.type = tanker`), and the LLM can name both clusters with a field they predict differently. Evidence threshold: both clusters above a minimum instance count and the split improves bundle fit for a majority.
- *Trigger to merge:* two prototypes have near-identical normative bundles, high altLabel overlap, or map to the same Wikidata class via closeMatch; or one has too few instances to have a stable bundle.
- *Trigger to demote to role/component:* a prototype's instances lose it over time (anti-rigidity detected from since/until on kinds): move it from the hierarchy into a `role` or `membership` value.
- *Platypus trigger:* an instance whose bundle fits no prototype above a threshold, or fits two disjoint top kinds. Park it as `kinds: [{prototype: null, candidates: [...]}]`; after N such instances, propose a new prototype.
- *Mechanics:* accumulate draft edits per time window, consolidate by semantic and temporal similarity, have the LLM arbitrate with the evidence attached, apply as a versioned taxonomy edit (schema.org pending → accepted → attic), then re-run kind assignment over affected instances only. Keep a Datomic-style append-only claim log so any assignment can be read "as of" a date.
- *Guardrails from the literature:* never let an anti-rigid prototype subsume a rigid one (OntoClean); keep the top five kinds disjoint (gist's "fine-grained disjointness"); keep hierarchy relations SKOS, not OWL, so induction errors are navigational and not logical.

## Not readable or not fetched

MIT Press *Sorting Things Out* page (403), ACM Chain-of-Layer page (403), LOA OntoClean overview PDF (image-only), the Zablith 2013 and Noy & Klein 2004 full texts (abstract pages only).
