// The component vocabulary and the five rigid top kinds. Components are normative feature bundles (the parts a person
// expects a thing of that sort to have), not necessary conditions. They are seeded from here into the `components`
// collection and may be refactored there at runtime; this file is the version-zero statement. Names follow the
// social-knowledge-service base schemas where one existed (meta, location, address, relation, stats); the rest come from
// the 2026-10-14 ontology survey. `fields` are documentation and light validation, not a schema the store enforces.
export const VERSION = 1;
export const TOP_KINDS = {
  agent: "something that acts on its own account: a person, an organisation, a government, a company, a crew",
  place: "somewhere: a country, a city, a strait, a river, a building, a region; has a location or an extent",
  thing: "a physical, movable object: a ship, an aircraft, a weapon, a satellite, a cargo",
  event: "something that happens: a storm, an election, a strike, a collision, a summit; has an occurrence",
  work: "an informational artefact: a law, a treaty, a report, a dataset, a film, a company product",
};
export const COMPONENTS = {
  meta: { doc: "what every entity has: a label, a description, aliases, tags", fields: { label: "string", description: "string", aliases: "string[]", depiction: "url", tags: "string[]" } },
  identity: { doc: "external identifiers", fields: { wikidata: "Q-id", wikipedia: "url", geonames: "id", imo: "ship number", mmsi: "ship radio id", iso3166: "country or subdivision code" } },
  location: { doc: "a point and a radius; crude by design", fields: { lat: "number", lon: "number", rad: "metres", method: "gazetteer | model | text", label: "place name used" } },
  extent: { doc: "a shape when a point is wrong: a river, a border, a strait", fields: { geometry: "GeoJSON" } },
  address: { doc: "a human-legible address", fields: { street: "string", city: "string", region: "string", country: "string", countryCode: "ISO 3166-1 alpha-2" } },
  lifespan: { doc: "when a persistent thing began and ended: birth, founding, launch, sinking", fields: { begins: "date", ends: "date", precision: "year | month | day" } },
  occurrence: { doc: "when and where something happened and who took part; the mark of an event", fields: { begins: "date", ends: "date", participants: "[{entity, role}]", place: "entity id" } },
  agency: { doc: "the capacity to act: legal form, jurisdiction, size", fields: { legalForm: "string", jurisdiction: "entity id", headcount: "number" } },
  role: { doc: "an office or position someone holds, in something, for a while; anti-rigid, never a kind", fields: { office: "string", in: "entity id", begins: "date", ends: "date" } },
  membership: { doc: "belonging to a group for a while", fields: { group: "entity id", begins: "date", ends: "date", rank: "string" } },
  vessel: { doc: "a ship's particulars", fields: { imo: "string", mmsi: "string", flag: "country", type: "string", tonnage: "number" } },
  jurisdiction: { doc: "what a polity governs", fields: { polity: "string", level: "string", capital: "entity id" } },
  provenance: { doc: "where the entity's evidence came from", fields: { sources: "[{content, source, url, title, published, quote}]", extractor: "string", model: "string", promptVersion: "number" } },
  kinds: { doc: "which prototypes this entity is an instance of, as scored claims with ranks; never a fact", fields: { items: "[{prototype, score, rank, since, until, sources, extractor}]" } },
  relation: { doc: "an edge: subject, predicate, object; present only on relation entities", fields: { subject: "entity id", predicate: "string", object: "entity id", surface: "verb phrase as written", stance: "supports | opposes | neutral" } },
  concept: { doc: "a prototype's SKOS-like record: preferred label, alternates, broader with confidence, the typicality of each component", fields: { prefLabel: "string", altLabel: "string[]", broader: "[{id, confidence}]", related: "string[]", closeMatch: "[{scheme, id}]", bundle: "{component: typicality 0..1}", top: "one of the top kinds" } },
  merge: { doc: "a recorded merge decision, so it can be undone", fields: { winner: "entity id", loser: "entity id", evidence: "object", model: "string", at: "date" } },
  stats: { doc: "computed counts", fields: { mentions: "number", sources: "number", firstSeen: "date", lastSeen: "date", degree: "number" } },
};
export const seeds = () => Object.entries(COMPONENTS).map(([name, c]) => ({ _id: name, ...c, normative: true, version: VERSION, status: "seed", since: new Date() }));
