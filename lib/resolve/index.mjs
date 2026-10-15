// Resolution: an analysis's named things become entities, claims and relation entities. Identity is arbitrary (a random
// id); names are evidence. Matching: exact key or alias key within the same top kind first; then a fuzzy block from text
// search scored by token similarity; the uncertain middle goes to a model judge in one call per document. Every link is
// scored. Prototypes are entities too, upserted by name under their top kind, and every stated attribute becomes a
// bitemporal claim behind the entity's computed view. Relations are entities keyed by (subject, predicate, object).
import { randomUUID, createHash } from "node:crypto"; import { z } from "zod";
import { content, analyses, entities, claims } from "../store.mjs"; import * as pipe from "../pipeline.mjs"; import { ask, available } from "../analyze/llm.mjs"; import { key, similarity } from "./match.mjs";
export const RESOLVE_VERSION = 1, PHASE = "resolve";
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 24);
export const protoId = (label) => "proto:" + key(label).replace(/\s+/g, "-");
const asDate = (s) => { if (!s) return null; const d = new Date(/^\d{4}$/.test(s) ? s + "-01-01" : s); return isNaN(d) ? null : d; };
const Judge = z.object({ decisions: z.array(z.object({ pair: z.number(), same: z.boolean(), why: z.string() })) });
async function upsertPrototype(label, top, published) {
  const id = protoId(label); const k = key(label);
  await entities.upsert(id, { "stats.lastSeen": published }, { kind: "prototype", top, components: { meta: { label: k, key: k, aliases: [], aliasKeys: [], description: "", tags: [] }, concept: { prefLabel: k, altLabel: [], broader: [{ id: "top:" + top, confidence: 1 }], related: [], closeMatch: [], bundle: {}, top } }, "stats.instances": 0, "stats.firstSeen": published, phases: {} });
  return id;
}
function viewFrom(e, doc, a) { // the components a fresh entity starts with, from one extraction
  const c = { meta: { label: e.name, key: key(e.name), aliases: e.aliases.filter((x) => key(x) !== key(e.name)), aliasKeys: e.aliases.map(key).filter((x) => x && x !== key(e.name)), description: e.description, tags: [] }, kinds: { items: [] }, provenance: { sources: [] } };
  if (e.kind === "place" && e.approx) c.location = { lat: e.approx.lat, lon: e.approx.lon, rad: Math.max(1, e.approx.radiusKm) * 1000, method: "model", label: e.name };
  if (e.when && (e.when.begins || e.when.ends)) { const t = { begins: asDate(e.when.begins), ends: asDate(e.when.ends) }; if (e.kind === "event") c.occurrence = { ...t, participants: [], place: null }; else c.lifespan = { ...t, precision: /^\d{4}$/.test(e.when.begins || "") ? "year" : "day" }; }
  if (e.roles?.length) c.role = { items: e.roles.map((r) => ({ office: r.office, in: r.in, since: doc.published })) };
  return c;
}
async function writeClaims(entityId, e, doc, a) {
  const rows = e.attributes.filter((x) => x.key && x.value).map((x) => ({ _id: sha(entityId + "|" + x.key + "|" + x.value + "|" + doc._id), entity: entityId, component: "attributes", field: key(x.key).replace(/\s+/g, "_"), value: x.value, validFrom: asDate(e.when?.begins) || doc.published, validTo: asDate(e.when?.ends) || null, content: doc._id, source: doc.source, publishedAt: doc.published, ingestedAt: new Date(), extractor: a.model, confidence: 0.6 }));
  for (const r of e.roles || []) rows.push({ _id: sha(entityId + "|role|" + r.office + "|" + doc._id), entity: entityId, component: "role", field: "office", value: r.office + (r.in ? " @ " + r.in : ""), validFrom: doc.published, validTo: null, content: doc._id, source: doc.source, publishedAt: doc.published, ingestedAt: new Date(), extractor: a.model, confidence: 0.6 });
  if (rows.length) await claims.insertMany(rows);
}
const source = (doc, quote) => ({ content: doc._id, source: doc.source, url: doc.url, title: doc.title, published: doc.published, quote: (quote || "").slice(0, 240) });
export async function resolveOne(log = () => {}) {
  const doc = await pipe.claim("content", PHASE, RESOLVE_VERSION, { "phases.analyze.status": "done", analysis: { $exists: true } });
  if (!doc) return false;
  try {
    const a = await analyses.get(doc.analysis); if (!a) throw new Error("analysis missing");
    const ids = {}, created = [], linked = [], pending = []; // pending: {e, cand, sim} for the judge
    for (const e of a.entities) {
      if (!e.name || ids[e.name]) continue;
      const k = key(e.name), aks = e.aliases.map(key).filter(Boolean);
      const exact = (await entities.find({ kind: "instance", top: e.kind, $or: [{ "components.meta.key": { $in: [k, ...aks] } }, { "components.meta.aliasKeys": { $in: [k, ...aks] } }] }, { limit: 5 }))
        .sort((x, y) => (y.stats?.mentions || 0) - (x.stats?.mentions || 0));
      if (exact.length) { const same = exact.find((x) => x.components.kinds.items.some((i) => i.label === key(e.prototype))) || exact[0]; ids[e.name] = same._id; linked.push({ e, ent: same, score: same === exact[0] && exact.length === 1 ? 0.95 : 0.85 }); continue; }
      let best = null; try { for (const c of await entities.textSearch(e.name, { kind: "instance", top: e.kind }, 8, { components: 1, stats: 1 })) { const s = Math.max(similarity(e.name, c.components.meta.label), ...c.components.meta.aliases.map((al) => similarity(e.name, al))); if (!best || s > best.sim) best = { cand: c, sim: s }; } } catch {}
      if (best && best.sim >= 0.92) { ids[e.name] = best.cand._id; linked.push({ e, ent: best.cand, score: 0.75 }); continue; }
      if (best && best.sim >= 0.55 && available()) { pending.push({ e, cand: best.cand, sim: best.sim }); continue; }
      created.push(e);
    }
    if (pending.length) {
      try {
        const user = pending.map((p, i) => `${i}. A: "${p.e.name}" (${p.e.kind}; ${p.e.prototype}): ${p.e.description}\n   B: "${p.cand.components.meta.label}" (${p.cand.top}; ${p.cand.components.kinds.items[0]?.label || ""}): ${p.cand.components.meta.description}`).join("\n");
        const { data } = await ask("judge", "For each numbered pair decide whether A and B are the same real-world thing. Same spelling is not enough; a different person, place or ship with the same name is not the same. Answer every pair.", user, Judge);
        for (const d of data.decisions) { const p = pending[d.pair]; if (!p) continue; if (d.same) { ids[p.e.name] = p.cand._id; linked.push({ e: p.e, ent: p.cand, score: 0.7, why: d.why }); } else created.push(p.e); }
        for (const p of pending) if (!ids[p.e.name] && !created.includes(p.e)) created.push(p.e);
      } catch (e) { log(`judge failed (${e.message}); treating ${pending.length} uncertain as new`); for (const p of pending) created.push(p.e); }
    }
    for (const e of created) {
      const id = randomUUID(); const pid = await upsertPrototype(e.prototype, e.kind, doc.published); ids[e.name] = id;
      const c = viewFrom(e, doc, a); c.kinds.items.push({ prototype: pid, label: key(e.prototype), score: 0.7, rank: "preferred", since: doc.published, until: null, sources: [doc._id], extractor: a.model }); c.provenance.sources.push(source(doc, e.span));
      await entities.insert({ _id: id, kind: "instance", top: e.kind, components: c, stats: { mentions: 1, sources: 1, firstSeen: doc.published, lastSeen: doc.published, degree: 0 }, phases: {}, created: new Date() });
      await entities.modify({ _id: pid }, { $inc: { "stats.instances": 1 } }); await writeClaims(id, e, doc, a);
    }
    for (const { e, ent, score } of linked) {
      const pid = await upsertPrototype(e.prototype, e.kind, doc.published); const has = ent.components.kinds.items.find((i) => i.prototype === pid);
      const set = { "stats.lastSeen": ent.stats.lastSeen && ent.stats.lastSeen > doc.published ? ent.stats.lastSeen : doc.published, "stats.firstSeen": ent.stats.firstSeen && ent.stats.firstSeen < doc.published ? ent.stats.firstSeen : doc.published };
      if (!ent.components.location && e.kind === "place" && e.approx) set["components.location"] = { lat: e.approx.lat, lon: e.approx.lon, rad: Math.max(1, e.approx.radiusKm) * 1000, method: "model", label: e.name };
      if (!ent.components.meta.description && e.description) set["components.meta.description"] = e.description;
      const fresh = viewFrom(e, doc, a); for (const comp of ["occurrence", "lifespan"]) if (fresh[comp] && !ent.components[comp]) set["components." + comp] = fresh[comp];
      await entities.modify({ _id: ent._id }, { $set: set, $inc: { "stats.mentions": 1 }, $addToSet: { "components.meta.aliasKeys": { $each: [key(e.name), ...e.aliases.map(key)].filter((x) => x && x !== ent.components.meta.key) }, "components.meta.aliases": { $each: [e.name, ...e.aliases].filter((x) => key(x) !== ent.components.meta.key) }, ...(fresh.role ? { "components.role.items": { $each: fresh.role.items } } : {}) }, $push: { "components.provenance.sources": { $each: [{ ...source(doc, e.span), score }], $slice: -200 } } });
      if (has) await entities.modify({ _id: ent._id, "components.kinds.items.prototype": pid }, { $inc: { "components.kinds.items.$.score": 0.05 }, $addToSet: { "components.kinds.items.$.sources": doc._id } });
      else { await entities.modify({ _id: ent._id }, { $push: { "components.kinds.items": { prototype: pid, label: key(e.prototype), score: 0.5, rank: "normal", since: doc.published, until: null, sources: [doc._id], extractor: a.model } } }); await entities.modify({ _id: pid }, { $inc: { "stats.instances": 1 } }); }
      await writeClaims(ent._id, e, doc, a);
    }
    // placement: an agent, thing, event or work named at a place is put at that place's point (via that entity) so it
    // can be drawn; the place is the one listed in this analysis if there is one, else a known place of that name
    let placed = 0;
    for (const e of a.entities) { if (e.kind === "place" || !e.place || !ids[e.name]) continue;
      let pid = ids[e.place]; if (!pid) { const p = await entities.one({ kind: "instance", top: "place", $or: [{ "components.meta.key": key(e.place) }, { "components.meta.aliasKeys": key(e.place) }] }, { components: 1 }); pid = p?._id; }
      if (!pid) continue; const p = await entities.get(pid, { components: 1 }); const loc = p?.components?.location; if (!loc) continue;
      const set = {}; const me = await entities.get(ids[e.name], { components: 1 }); if (!me) continue;
      if (!me.components.location) set["components.location"] = { lat: loc.lat, lon: loc.lon, rad: loc.rad, method: "via", via: pid, label: e.place };
      if (e.kind === "event" && me.components.occurrence && !me.components.occurrence.place) set["components.occurrence.place"] = pid;
      if (!me.components.occurrence && e.kind === "event") set["components.occurrence"] = { begins: asDate(e.when?.begins) || doc.published, ends: asDate(e.when?.ends), participants: [], place: pid };
      if (Object.keys(set).length) { await entities.update(ids[e.name], set); placed++; } }
    let rels = 0;
    for (const r of a.relations) {
      const s = ids[r.from], o = ids[r.to]; if (!s || !o || s === o) continue;
      const rid = "rel:" + sha(s + "|" + r.predicate + "|" + o); const when = asDate(r.when) || doc.published;
      const { inserted } = await entities.upsert(rid, { "stats.lastSeen": when }, { kind: "relation", top: "relation", components: { relation: { subject: s, predicate: r.predicate, object: o, surface: r.surface, stance: r.stance }, occurrence: { begins: when, ends: null }, provenance: { sources: [] } }, "stats.mentions": 0, "stats.firstSeen": when, phases: {} });
      await entities.modify({ _id: rid }, { $inc: { "stats.mentions": 1 }, $push: { "components.provenance.sources": { $each: [source(doc, r.quote)], $slice: -100 } }, $addToSet: { "components.relation.surfaces": r.surface } });
      if (inserted) { await entities.modify({ _id: { $in: [s, o] } }, { $inc: { "stats.degree": 1 } }); } rels++;
    }
    await pipe.done("content", PHASE, doc._id, RESOLVE_VERSION, { entityIds: Object.values(ids) });
    log(`${doc._id.slice(0, 8)} resolved: ${created.length} new, ${linked.length} linked (${pending.length} judged), ${placed} placed, ${rels} relations: ${doc.title.slice(0, 50)}`);
  } catch (e) { await pipe.fail("content", PHASE, doc._id, e); log(`${doc._id.slice(0, 8)} resolve failed: ${e.stack?.split("\n").slice(0, 2).join(" ")}`); }
  return true;
}
