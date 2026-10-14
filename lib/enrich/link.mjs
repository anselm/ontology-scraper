// Link entities to Wikidata and, for places, replace the model's guessed point with the gazetteer's. One serial stream,
// a descriptive User-Agent, maxlag, a pause between calls, every lookup cached. A candidate must carry the entity's label
// or an alias exactly, and then pass a sanity check: a place must lie within a few radii of the model's approximate point
// (Stratford, Victoria is not Stratford, Connecticut); anything else must share a content word between Wikidata's
// description and our prototype or description. Unlinked beats wrongly linked; skipped rows are re-runnable.
import { entities, geocache } from "../store.mjs"; import * as pipe from "../pipeline.mjs"; import { USER_AGENT } from "../env.mjs"; import { key } from "../resolve/match.mjs";
export const LINK_VERSION = 1, PHASE = "link";
const API = "https://www.wikidata.org/w/api.php"; let last = 0;
async function wd(params) { const wait = 1100 - (Date.now() - last); if (wait > 0) await new Promise((r) => setTimeout(r, wait)); last = Date.now();
  const r = await fetch(API + "?" + new URLSearchParams({ format: "json", maxlag: "5", ...params }), { headers: { "user-agent": USER_AGENT, "accept-encoding": "gzip" }, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error("wikidata " + r.status); const j = await r.json(); if (j.error) throw new Error("wikidata " + j.error.code); return j; }
const RAD = { place: 25000, agent: 0, thing: 0, event: 0, work: 0 };
const STOP = new Set(["the", "a", "an", "of", "in", "and", "or", "for", "to", "on", "at", "by", "from", "with", "is", "was", "that", "this", "its", "as"]);
const words = (s) => new Set(key(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w)));
const km = (a, b) => { const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLon = ((b.lon - a.lon) * Math.PI) / 180; const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
// candidates in search order carrying the exact label or alias, each fetched for coordinates and description
export async function lookup(label, top, { approx = null, context = "" } = {}) {
  const ck = top + ":" + key(label) + (approx ? `@${approx.lat.toFixed(1)},${approx.lon.toFixed(1)}` : ""); const hit = await geocache.get(ck); if (hit) return hit.result;
  let result = null; const k = key(label);
  const s = await wd({ action: "wbsearchentities", search: label, language: "en", limit: "10", type: "item" });
  const cands = (s.search || []).filter((c) => key(c.label) === k || (c.aliases || []).some((a) => key(a) === k)).slice(0, 5);
  if (cands.length) {
    const g = await wd({ action: "wbgetentities", ids: cands.map((c) => c.id).join("|"), props: "claims|descriptions|sitelinks", languages: "en", sitefilter: "enwiki" });
    const full = cands.map((cand) => { const ent = g.entities?.[cand.id] || {}; const coord = ent.claims?.P625?.[0]?.mainsnak?.datavalue?.value; return { id: cand.id, label: cand.label, description: ent.descriptions?.en?.value || cand.description || "", wikipedia: ent.sitelinks?.enwiki?.title ? "https://en.wikipedia.org/wiki/" + encodeURIComponent(ent.sitelinks.enwiki.title.replace(/ /g, "_")) : "", instanceOf: (ent.claims?.P31 || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean), coord: coord ? { lat: coord.latitude, lon: coord.longitude } : null }; });
    if (top === "place") { const ok = full.filter((c) => c.coord && (!approx || km(c.coord, approx) <= Math.max(50, 4 * (approx.radiusKm || 10)))); if (ok.length) result = approx ? ok.sort((a, b) => km(a.coord, approx) - km(b.coord, approx))[0] : (ok.length === 1 ? ok[0] : null); }
    else { const ours = words(context); const scored = full.map((c) => ({ c, n: [...words(c.description)].filter((w) => ours.has(w)).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n); if (scored.length && (scored.length === 1 || scored[0].n > scored[1].n)) result = scored[0].c; }
    if (result) result.candidates = full.length;
  }
  await geocache.upsert(ck, { result, at: new Date() }); return result;
}
export async function linkOne(log = () => {}) {
  const doc = await pipe.claim("entities", PHASE, LINK_VERSION, { kind: "instance" });
  if (!doc) return false;
  try {
    const loc = doc.components.location; const approx = loc?.method === "model" ? { lat: loc.lat, lon: loc.lon, radiusKm: (loc.rad || 10000) / 1000 } : null;
    const proto = (doc.components.kinds?.items || []).map((i) => i.label).join(" ");
    const r = await lookup(doc.components.meta.label, doc.top, { approx, context: proto + " " + (doc.components.meta.description || "") });
    if (!r) { await pipe.skip("entities", PHASE, doc._id, LINK_VERSION, "no wikidata candidate passed the sanity check"); return true; }
    const set = { "components.identity.wikidata": r.id, "components.identity.wikipedia": r.wikipedia, "components.identity.instanceOf": r.instanceOf, "components.identity.wdDescription": r.description };
    if (r.coord && (doc.top === "place" || !doc.components.location)) set["components.location"] = { lat: r.coord.lat, lon: r.coord.lon, rad: doc.components.location?.rad || RAD[doc.top] || 10000, method: "wikidata", label: r.label };
    await pipe.done("entities", PHASE, doc._id, LINK_VERSION, set); log(`${doc.components.meta.label} → ${r.id}${r.coord ? " @" + r.coord.lat.toFixed(2) + "," + r.coord.lon.toFixed(2) : ""}`);
  } catch (e) { await pipe.fail("entities", PHASE, doc._id, e); log(`link failed ${doc.components.meta.label}: ${e.message}`); if (/wikidata (429|5)/.test(e.message)) return false; }
  return true;
}
