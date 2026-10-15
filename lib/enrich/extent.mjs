// Extents: a shape for places that are not points. Natural Earth (public domain) countries, states and provinces, and
// marine areas, each carrying a Wikidata id. A place entity gets its shape when its Wikidata id matches, or when its
// name matches and the model's approximate point falls inside the shape's bounding box (so the Georgia in the Caucasus
// and the Georgia in the United States stay apart). The point becomes the box centre and the radius half its diagonal.
// Files come from scripts/fetch-ne.sh into data/ne/; the phase waits when they are absent.
import { readFileSync, existsSync } from "node:fs"; import { join } from "node:path"; import { ROOT } from "../env.mjs"; import { entities } from "../store.mjs"; import * as pipe from "../pipeline.mjs"; import { key } from "../resolve/match.mjs";
export const EXTENT_VERSION = 2, PHASE = "extent";
const FILES = [["ne_50m_admin_0_countries", "country"], ["ne_10m_admin_1_states_provinces", "admin1"], ["ne_10m_geography_marine_polys", "marine"]];
let byWd = null, byName = null, loaded = false;
function bbox(g) { let w = 180, s = 90, e = -180, n = -90; const walk = (c) => { if (typeof c[0] === "number") { if (c[0] < w) w = c[0]; if (c[0] > e) e = c[0]; if (c[1] < s) s = c[1]; if (c[1] > n) n = c[1]; } else c.forEach(walk); }; walk(g.coordinates); return [w, s, e, n]; }
export function load() {
  if (loaded) return byWd !== null; loaded = true; byWd = new Map(); byName = new Map();
  for (const [file, layer] of FILES) { const p = join(ROOT, "data", "ne", file + ".geojson"); if (!existsSync(p)) { byWd = null; return false; }
    for (const f of JSON.parse(readFileSync(p, "utf8")).features) { const pr = f.properties; const wd = pr.WIKIDATAID || pr.wikidataid || ""; const names = [pr.NAME, pr.NAME_LONG, pr.NAME_EN, pr.ADMIN, pr.name, pr.name_en, pr.name_long, pr.label].filter(Boolean);
      const rec = { layer, featurecla: pr.featurecla || pr.FEATURECLA || "", name: pr.NAME || pr.name || "", wikidata: wd, geometry: f.geometry, bbox: bbox(f.geometry) };
      if (wd) byWd.set(wd, rec); for (const nm of names) { const k = key(nm); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(rec); } } }
  return true;
}
const inBox = ([w, s, e, n], lat, lon, padKm = 50) => { const pad = padKm / 111; return lon >= w - pad && lon <= e + pad && lat >= s - pad && lat <= n + pad; };
const km = (a, b) => { const R = 6371, dLat = ((b[1] - a[1]) * Math.PI) / 180, dLon = ((b[0] - a[0]) * Math.PI) / 180; const x = Math.sin(dLat / 2) ** 2 + Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
export function match(doc) {
  const wd = doc.components.identity?.wikidata; if (wd && byWd.has(wd)) return { rec: byWd.get(wd), how: "wikidata" };
  // by name: the label only (extracted aliases are noisy), and a city never takes a province's shape on a name alone
  const k = key(doc.components.meta.label); const proto = (doc.components.kinds?.items || []).find((i) => i.rank === "preferred")?.label || ""; const cityish = /\b(city|town|locality|village|suburb|municipality|capital|port|district|neighbou?rhood)\b/.test(proto);
  const cands = (byName.get(k) || []).filter((r) => !(cityish && r.layer === "admin1"));
  if (!cands.length) return null; const loc = doc.components.location;
  if (cands.length === 1 && cands[0].layer === "country" && !loc) return { rec: cands[0], how: "name" }; // a country name alone is unambiguous enough
  if (!loc) return null; const ok = cands.filter((r) => inBox(r.bbox, loc.lat, loc.lon)); return ok.length === 1 ? { rec: ok[0], how: "name+point" } : ok.length > 1 ? { rec: ok.sort((a, b) => km([(a.bbox[0] + a.bbox[2]) / 2, (a.bbox[1] + a.bbox[3]) / 2], [loc.lon, loc.lat]) - km([(b.bbox[0] + b.bbox[2]) / 2, (b.bbox[1] + b.bbox[3]) / 2], [loc.lon, loc.lat]))[0], how: "name+nearest" } : null;
}
export async function extentOne(log = () => {}) {
  if (!load()) return false;
  const doc = await pipe.claim("entities", PHASE, EXTENT_VERSION, { kind: "instance", top: "place" });
  if (!doc) return false;
  try {
    const m = match(doc); if (!m) { await pipe.skip("entities", PHASE, doc._id, EXTENT_VERSION, "no natural earth match"); return true; }
    const [w, s, e, n] = m.rec.bbox; const cx = (w + e) / 2, cy = (s + n) / 2; const rad = Math.max(2000, (km([w, s], [e, n]) / 2) * 1000);
    const set = { "components.extent": { geometry: m.rec.geometry, source: "natural-earth", layer: m.rec.layer, featurecla: m.rec.featurecla, name: m.rec.name, matched: m.how, bbox: m.rec.bbox } };
    const loc = doc.components.location; if (!loc || loc.method === "model") set["components.location"] = { lat: cy, lon: cx, rad, method: "natural-earth", label: m.rec.name }; else set["components.location.rad"] = rad;
    if (!doc.components.identity?.wikidata && m.rec.wikidata) set["components.identity.wikidata"] = m.rec.wikidata;
    await pipe.done("entities", PHASE, doc._id, EXTENT_VERSION, set); log(`extent ${doc.components.meta.label} ← ${m.rec.name} (${m.rec.layer}, ${m.how})`);
  } catch (e) { await pipe.fail("entities", PHASE, doc._id, e); log(`extent failed ${doc.components.meta.label}: ${e.message}`); }
  return true;
}
