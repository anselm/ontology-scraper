#!/usr/bin/env node
// One-off: place the agents, things, events and works already resolved before placement existed, from their analyses'
// place hints. Safe to re-run; only entities without a location are touched.
import "../lib/env.mjs"; import { analyses, content, entities, close } from "../lib/store.mjs"; import { key } from "../lib/resolve/match.mjs";
let placed = 0, seen = 0;
for (const a of await analyses.find({ status: "done" }, { projection: { content: 1, entities: 1 } })) {
  const c = await content.get(a.content, { entityIds: 1 }); if (!c?.entityIds?.length) continue;
  const ents = await entities.find({ _id: { $in: c.entityIds } }, { projection: { components: 1, top: 1 } }); const byKey = new Map(); for (const e of ents) { byKey.set(e.components.meta.key, e); for (const k of e.components.meta.aliasKeys || []) if (!byKey.has(k)) byKey.set(k, e); }
  for (const e of a.entities) { if (e.kind === "place" || !e.place) continue; const me = byKey.get(key(e.name)); if (!me || me.components.location) continue; seen++;
    let p = byKey.get(key(e.place)); if (!p || p.top !== "place") p = await entities.one({ kind: "instance", top: "place", $or: [{ "components.meta.key": key(e.place) }, { "components.meta.aliasKeys": key(e.place) }] }, { components: 1 });
    const loc = p?.components?.location; if (!loc) continue;
    await entities.update(me._id, { "components.location": { lat: loc.lat, lon: loc.lon, rad: loc.rad, method: "via", via: p._id, label: e.place } }); me.components.location = loc; placed++; }
}
console.log(`${placed} placed of ${seen} unplaced with a place hint`); await close();
