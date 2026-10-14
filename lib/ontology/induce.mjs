// Induction: the periodic pass that looks at the accumulated instances and revises the vocabulary. Three jobs. The
// census computes, per prototype, how many instances it has and how typical each component and attribute key is (its
// normative bundle). The hierarchy pass asks a model, per top kind, which prototypes are the same kind under different
// names (merge) and which broader kind each belongs under (SKOS-like broader with a confidence). The component pass
// looks at the attribute keys that recur across prototypes and asks the model to propose new normative components from
// them; proposals are stored with status "proposed" for a human to accept. Merges are applied and recorded as merge
// entities; broader links are written; nothing is deleted.
import { z } from "zod"; import { entities, claims, components, state } from "../store.mjs"; import { ask, available } from "../analyze/llm.mjs"; import { TOP_KINDS, COMPONENTS } from "./components.mjs"; import { protoId } from "../resolve/index.mjs"; import { key } from "../resolve/match.mjs";
export const INDUCE_VERSION = 1;
const COMPONENT_NAMES = ["location", "lifespan", "occurrence", "role", "identity", "extent", "address", "agency", "membership", "vessel", "jurisdiction"];
export async function census(log = () => {}) {
  const protos = await entities.find({ kind: "prototype" }, { projection: { _id: 1, components: 1, stats: 1 } });
  for (const p of protos) {
    const inst = await entities.find({ kind: "instance", "components.kinds.items.prototype": p._id }, { projection: { components: 1 }, limit: 2000 });
    const n = inst.length, bundle = {}; if (!n) { await entities.update(p._id, { "stats.instances": 0 }); continue; }
    for (const c of COMPONENT_NAMES) { const k = inst.filter((e) => e.components[c] && (c !== "role" || e.components.role.items?.length)).length; if (k) bundle[c] = +(k / n).toFixed(2); }
    const keys = await claims.aggregate([{ $match: { entity: { $in: inst.map((e) => e._id) }, component: "attributes" } }, { $group: { _id: { field: "$field", entity: "$entity" } } }, { $group: { _id: "$_id.field", n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 12 }]);
    const attributeKeys = Object.fromEntries(keys.map((k) => [k._id, +(k.n / n).toFixed(2)]));
    await entities.update(p._id, { "stats.instances": n, "components.concept.bundle": bundle, "components.concept.attributeKeys": attributeKeys });
  }
  log(`census over ${protos.length} prototypes`); return protos.length;
}
const Hierarchy = z.object({
  merges: z.array(z.object({ keep: z.string(), drop: z.array(z.string()), why: z.string() })).describe("groups that name the same kind; keep the most standard label"),
  broader: z.array(z.object({ prototype: z.string(), broader: z.string(), confidence: z.number() })).describe("for each prototype its nearest broader kind: another prototype in the list, a new intermediate kind, or the top kind itself"),
  roles: z.array(z.string()).describe("prototypes that are really roles or offices (anti-rigid: a person can stop being one) rather than kinds"),
});
export async function hierarchy(log = () => {}) {
  if (!available()) return 0; let changes = 0;
  for (const top of Object.keys(TOP_KINDS)) {
    const protos = (await entities.find({ kind: "prototype", top, "components.concept.status": { $ne: "merged" } }, { projection: { components: 1, stats: 1 }, sort: { "stats.instances": -1 }, limit: 300 })).filter((p) => p.stats?.instances);
    if (protos.length < 4) continue;
    const list = protos.map((p) => `${p.components.concept.prefLabel} (${p.stats.instances}${Object.keys(p.components.concept.attributeKeys || {}).length ? "; " + Object.keys(p.components.concept.attributeKeys).slice(0, 4).join(", ") : ""})`).join("\n");
    try {
      const { data, model } = await ask("induce", `You curate a soft taxonomy of kinds under the top kind "${top}" (${TOP_KINDS[top]}). Merge only true synonyms or trivial variants (singular/plural, "government" and "national government"). A kind deserves to exist only if it predicts properties its parent does not. Broader kinds should be basic, everyday words. Flag roles (offices someone holds for a while) so they can be demoted. Use the labels exactly as given.`, `Prototypes (label (instances; frequent attribute keys)):\n${list}`, Hierarchy, { effort: "medium" });
      const known = new Set(protos.map((p) => p.components.concept.prefLabel));
      for (const m of data.merges) { if (!known.has(m.keep)) continue; const keepId = protoId(m.keep);
        for (const d of m.drop) { if (!known.has(d) || d === m.keep) continue; const dropId = protoId(d);
          const n = await entities.modify({ kind: "instance", "components.kinds.items.prototype": dropId }, { $set: { "components.kinds.items.$.prototype": keepId, "components.kinds.items.$.label": m.keep } });
          await entities.modify({ _id: keepId }, { $inc: { "stats.instances": n }, $addToSet: { "components.concept.altLabel": d } });
          await entities.update(dropId, { "components.concept.status": "merged", "components.concept.mergedInto": keepId, "stats.instances": 0 });
          await entities.insert({ _id: "merge:" + dropId.slice(6) + ":" + Date.now(), kind: "merge", top: "merge", components: { merge: { winner: keepId, loser: dropId, evidence: { why: m.why, instances: n }, model, at: new Date() } }, stats: {}, phases: {} }); changes++; } }
      for (const b of data.broader) { if (!known.has(b.prototype)) continue; const id = protoId(b.prototype); const bid = key(b.broader) === top || b.broader === top ? "top:" + top : protoId(b.broader);
        if (bid === id) continue;
        if (!known.has(b.broader) && bid !== "top:" + top) await entities.upsert(bid, {}, { kind: "prototype", top, components: { meta: { label: key(b.broader), key: key(b.broader), aliases: [], aliasKeys: [], description: "proposed intermediate kind", tags: [] }, concept: { prefLabel: key(b.broader), altLabel: [], broader: [{ id: "top:" + top, confidence: 0.8 }], related: [], closeMatch: [], bundle: {}, top, status: "intermediate" } }, stats: { instances: 0, firstSeen: new Date() }, phases: {} });
        await entities.update(id, { "components.concept.broader": [{ id: bid, confidence: Math.max(0, Math.min(1, b.confidence)) }, { id: "top:" + top, confidence: 1 }] }); changes++; }
      for (const r of data.roles) if (known.has(r)) { await entities.update(protoId(r), { "components.concept.roleLike": true }); changes++; }
      log(`${top}: ${data.merges.length} merges, ${data.broader.length} broader links, ${data.roles.length} role-like (${model})`);
    } catch (e) { log(`hierarchy ${top} failed: ${e.message}`); }
  }
  return changes;
}
const Proposals = z.object({ proposals: z.array(z.object({ name: z.string().describe("short lowercase noun, e.g. 'cargo', 'casualties', 'funding'"), doc: z.string().describe("what part of a thing this bundle describes, in plain words"), fields: z.array(z.object({ name: z.string(), from: z.array(z.string()).describe("the attribute keys it absorbs") })), prototypes: z.array(z.string()).describe("kinds whose instances typically carry it") })) });
export async function proposeComponents(log = () => {}) {
  if (!available()) return 0;
  const keys = await claims.aggregate([{ $match: { component: "attributes" } }, { $group: { _id: "$field", n: { $sum: 1 }, entities: { $addToSet: "$entity" } } }, { $project: { n: 1, e: { $size: "$entities" } } }, { $match: { e: { $gte: 3 } } }, { $sort: { e: -1 } }, { $limit: 120 }]);
  if (keys.length < 8) return 0;
  const existing = Object.entries(COMPONENTS).map(([n, c]) => `${n}: ${Object.keys(c.fields).join(", ")}`).join("\n");
  try {
    const { data, model } = await ask("induce", `You design normative components for a knowledge graph: reusable bundles of properties that match what a person expects a thing to have (a ship has a flag and a tonnage; a storm has a category and a path). Given attribute keys the extractor has been producing, propose at most 6 new components that would absorb the frequent keys not already covered by the existing components. Prefer bundles reusable across several kinds. Do not propose what exists.`, `Existing components:\n${existing}\n\nAttribute keys (key: entities carrying it):\n${keys.map((k) => `${k._id}: ${k.e}`).join("\n")}`, Proposals, { effort: "medium" });
    let n = 0; for (const p of data.proposals) { const id = key(p.name).replace(/\s+/g, "_"); if (!id || COMPONENTS[id]) continue; const { inserted } = await components.upsert(id, { doc: p.doc, fields: Object.fromEntries(p.fields.map((f) => [f.name, "from: " + f.from.join(", ")])), prototypes: p.prototypes, proposedBy: model, updated: new Date() }, { normative: false, version: INDUCE_VERSION, status: "proposed", since: new Date() }); if (inserted) n++; }
    log(`${n} new component proposals (${model})`); return n;
  } catch (e) { log(`propose components failed: ${e.message}`); return 0; }
}
// run when enough has changed: at least 10 new prototypes since last time, or 6 hours have passed with any new instances
export async function maybeRun(log = () => {}) {
  const s = (await state.get("induce")) || { at: null, prototypes: 0, instances: 0 };
  const protos = await entities.count({ kind: "prototype" }), inst = await entities.count({ kind: "instance" });
  const due = protos - s.prototypes >= 10 || (inst > s.instances && (!s.at || Date.now() - new Date(s.at) > 6 * 3600e3));
  if (!due) return false;
  await census(log); await hierarchy(log); await proposeComponents(log);
  await state.upsert("induce", { at: new Date(), prototypes: await entities.count({ kind: "prototype" }), instances: inst }); return true;
}
