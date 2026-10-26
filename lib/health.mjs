// Health: what a person would want to know about the service without opening it. `check()` computes a digest (the
// day's intake, analyses, spend, freshness, backlog, counts) and a list of problems, each with a stable key so a
// notifier can avoid repeating itself. The checks are the failures this service has actually had: the present
// starved by a backlog (2026-10-26), a billing error burning retries (2026-10-19), the worker stopping, a full disk.
import { statfs } from "node:fs/promises";
import { content, analyses, entities, sources } from "./store.mjs"; import { spend } from "./service.mjs";
const H = 36e5, ago = (d) => (Date.now() - new Date(d)) / H, hrs = (h) => (h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`);
const BUDGET = Number(process.env.ANALYZE_BUDGET || 100), HOST = process.env.CANONICAL_HOST || "";
export async function check() {
  const day = new Date(Date.now() - 24 * H), problems = [];
  const [inDay, analysedDay, failedDay, pending, instN, protoN, relN, active] = await Promise.all([
    content.count({ fetched: { $gte: day } }), analyses.count({ at: { $gte: day } }), content.count({ "phases.analyze.status": "failed", "phases.analyze.at": { $gte: day } }),
    content.count({ "phases.extract.status": "done", $or: [{ "phases.analyze.status": "pending" }, { "phases.analyze.status": { $exists: false } }] }),
    entities.count({ kind: "instance" }), entities.count({ kind: "prototype", "components.concept.status": { $ne: "merged" } }), entities.count({ kind: "relation" }), sources.count({ status: "active" })]);
  const [last] = await analyses.find({}, { sort: { at: -1 }, limit: 1, projection: { at: 1, published: 1 } });
  const [newest] = await analyses.find({}, { sort: { published: -1 }, limit: 1, projection: { published: 1 } });
  const [newestIn] = await content.find({}, { sort: { published: -1 }, limit: 1, projection: { published: 1 } });
  const billing = await content.count({ "phases.analyze.at": { $gte: day }, "phases.analyze.error": { $regex: "402|429|credit", $options: "i" } });
  const usd = (await spend()).filter((r) => r.day === new Date().toISOString().slice(0, 10)).reduce((a, r) => a + r.usd, 0);
  const budgetUsed = await analyses.count({ at: { $gte: day }, contributed: { $ne: true } });
  let disk = null; try { const s = await statfs("/"); disk = 1 - s.bavail / s.blocks; } catch {}
  let site = null; if (HOST) { try { const r = await fetch(`https://${HOST}/version.json`, { signal: AbortSignal.timeout(10000) }); site = r.ok ? (await r.json()).sha : `http ${r.status}`; } catch (e) { site = e.name === "TimeoutError" ? "timeout" : e.message; } }
  // problems
  const readLag = newest && newestIn ? (new Date(newestIn.published) - new Date(newest.published)) / H : 0;
  if (newest && readLag > 24) problems.push({ key: "stale", text: `newest news read is ${hrs(ago(newest.published))} old; newest fetched is ${hrs(ago(newestIn.published))} old (budget ${budgetUsed}/${BUDGET}, backlog ${pending})` });
  if (last && ago(last.at) > 3 && pending > 0 && budgetUsed < BUDGET) problems.push({ key: "stalled", text: `no analysis for ${hrs(ago(last.at))} with ${pending} pending and budget ${budgetUsed}/${BUDGET}` });
  if (active && inDay === 0) problems.push({ key: "intake", text: `nothing fetched in 24 h from ${active} active sources` });
  if (billing) problems.push({ key: "billing", text: `${billing} documents hit a billing or rate error in 24 h` });
  if (failedDay >= 10 && failedDay > analysedDay * 0.2) problems.push({ key: "failures", text: `${failedDay} analyses failed in 24 h against ${analysedDay} done` });
  if (disk != null && disk > 0.85) problems.push({ key: "disk", text: `disk ${Math.round(disk * 100)}% full` });
  if (HOST && site && !/^[0-9a-f]{7,}/.test(site)) problems.push({ key: "site", text: `${HOST} not answering: ${site}` });
  const digest = { inDay, analysedDay, failedDay, budgetUsed, budget: BUDGET, usd: +usd.toFixed(2), pending, newestRead: newest?.published || null, lastRun: last?.at || null, instances: instN, prototypes: protoN, relations: relN, disk, site };
  const text = `${inDay} in, ${analysedDay} read (${failedDay} failed), $${digest.usd} today; newest read ${newest ? hrs(ago(newest.published)) : "never"} old; backlog ${pending}; ${instN} things, ${protoN} kinds, ${relN} relations${disk != null ? `; disk ${Math.round(disk * 100)}%` : ""}${site ? `; site ${site}` : ""}`;
  return { ok: !problems.length, problems, digest, text };
}
