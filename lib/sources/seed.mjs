// The curated source list lives in config/sources.json; seeding inserts the ones the database does not know and leaves
// the poll state of known ones alone. A source added by hand later is just a row with the same shape.
import { readFileSync } from "node:fs"; import { join } from "node:path"; import { ROOT } from "../env.mjs"; import { sources } from "../store.mjs";
export function list() { return JSON.parse(readFileSync(join(ROOT, "config", "sources.json"), "utf8")); }
export async function seed() {
  let added = 0;
  for (const s of list()) {
    const { inserted } = await sources.upsert(s._id, { url: s.url, title: s.title, publisher: s.publisher, tags: s.tags || [], terms: s.terms || "", note: s.note || "" }, { status: s.status || "active", poll: { interval: 3600, lambda: 0, next: new Date(0), last: null, etag: "", lastModified: "", failures: 0, parseErrors: 0, lastError: "" }, stats: { items: 0, lastItemAt: null }, added: new Date() });
    if (inserted) added++;
  }
  return added;
}
// everything the pipeline needs present before it runs: sources, component definitions, the five top kinds
import { seeds, TOP_KINDS } from "../ontology/components.mjs"; import { components, entities } from "../store.mjs";
export async function seedAll() {
  for (const c of seeds()) await components.upsert(c._id, { doc: c.doc, fields: c.fields, normative: true, version: c.version }, { status: "seed", since: new Date() });
  for (const [k, doc] of Object.entries(TOP_KINDS)) await entities.upsert("top:" + k, { top: k }, { kind: "prototype", components: { meta: { label: k, key: k, description: doc, aliases: [], aliasKeys: [], tags: [] }, concept: { prefLabel: k, altLabel: [], broader: [], related: [], closeMatch: [], bundle: {}, top: k, status: "top" } }, stats: { instances: 0, firstSeen: new Date() }, phases: {} });
  return seed();
}
