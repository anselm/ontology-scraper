// Does induction rediscover the hand-made vocabulary? Compares the live components and prototypes against the
// schema-test fixture (reference/schema-test/data, hand-written 2026-04-30 to 05-01: 20 components, 12 prototypes) by
// name and by field overlap, and checks which of the fixture's fields the extractor has produced as attribute keys at
// all. No model calls. Usage: node bin/eval-induction.mjs   (MONGODB_URI picks the database)
import { readdirSync, readFileSync } from "node:fs";
import { entities, components, claims } from "../lib/store.mjs"; import { key } from "../lib/resolve/match.mjs"; import { COMPONENTS } from "../lib/ontology/components.mjs";
const ROOT = new URL("../reference/schema-test/data/", import.meta.url), load = (rel) => JSON.parse(readFileSync(new URL(rel, ROOT), "utf8"));
const norm = (f) => key(f.replace(/_(m|kg|t|km|cm)$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " "));
const jaccard = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1); };
const VARIANTS = { harbor: "harbour", organisation: "organization" };
const refComponents = readdirSync(new URL("components/", ROOT)).filter((f) => f.endsWith(".json")).map((f) => load("components/" + f)).map((c) => ({ name: c.components.schema.componentName, fields: new Set(Object.keys(c.components.schema.fields || {}).map(norm)) }));
const refProtos = load("prototypes/_index.json").prototypes.map((p) => p.slug);
const docs = await components.find({ status: { $ne: "retired" } });
const live = [...Object.entries(COMPONENTS).map(([n, c]) => ({ name: n, status: "seed", fields: new Set(Object.keys(c.fields).map(norm)) })), ...docs.filter((d) => d.status !== "seed").map((d) => ({ name: d.extends ? d.extends + "+" : d._id, status: d.status, fields: new Set(Object.keys(d.fields || {}).map(norm)) }))];
const keys = new Set((await claims.aggregate([{ $match: { component: "attributes" } }, { $group: { _id: "$field" } }])).map((k) => norm(k._id)));
const pad = (s, n) => String(s).padEnd(n);
console.log(`\nComponents: fixture (${refComponents.length}) against live (${live.length}: ${live.filter((l) => l.status === "seed").length} seed, ${live.filter((l) => l.status === "proposed").length} proposed)\n`);
console.log(pad("fixture", 12) + pad("fields", 7) + pad("as keys", 8) + pad("best live match", 28) + pad("overlap", 8) + "status");
let hit = 0;
for (const r of refComponents.sort((a, b) => a.name.localeCompare(b.name))) {
  const inKeys = [...r.fields].filter((f) => keys.has(f)).length;
  const byName = live.find((l) => key(l.name) === key(r.name));
  const best = live.map((l) => ({ l, j: jaccard(r.fields, l.fields) })).sort((a, b) => b.j - a.j)[0];
  const m = byName ? { l: byName, j: jaccard(r.fields, byName.fields) } : best.j > 0 ? best : null;
  if (m && (byName || m.j >= 0.25)) hit++;
  console.log(pad(r.name, 12) + pad(r.fields.size, 7) + pad(inKeys, 8) + pad(m ? m.l.name : "-", 28) + pad(m ? m.j.toFixed(2) : "-", 8) + (m ? m.l.status + (byName ? " (by name)" : "") : ""));
}
console.log(`\n${hit}/${refComponents.length} fixture components have a live counterpart by name or with field overlap >= 0.25\n`);
const protos = await entities.find({ kind: "prototype" }, { projection: { components: 1, stats: 1, top: 1 } });
const find = (slug) => { const want = new Set([key(slug.replace(/-/g, " ")), key(VARIANTS[slug] || slug)]); return protos.find((p) => want.has(key(p.components.concept.prefLabel)) || (p.components.concept.altLabel || []).some((a) => want.has(key(a)))); };
console.log(`Prototypes: fixture (${refProtos.length}) against live (${protos.length})\n`);
console.log(pad("fixture", 16) + pad("live label", 18) + pad("top", 7) + pad("things", 8) + pad("status", 10) + "relation slots");
let ph = 0;
for (const slug of refProtos) { const p = find(slug); if (p) ph++;
  const c = p?.components.concept || {}; const slots = (c.relations || []).slice(0, 3).map((r) => `${r.direction === "in" ? "is " : ""}${r.predicate}${r.direction === "in" ? " by" : ""} ${r.typical || r.kind} ${Math.round(r.share * 100)}%`).join("; ");
  console.log(pad(slug, 16) + pad(p ? c.prefLabel : "-", 18) + pad(p ? p.top : "", 7) + pad(p ? p.stats?.instances || 0 : "", 8) + pad(p ? c.status || "live" : "", 10) + slots); }
console.log(`\n${ph}/${refProtos.length} fixture prototypes exist as live prototypes by label\n`);
process.exit(0);
