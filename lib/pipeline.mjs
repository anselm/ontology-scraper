// Phases pick work by status; there is no queue. Every document carries phases.<name> = {status, at, attempt, error,
// version, lease}. A worker claims one document with an atomic update that sets a lease; a crash leaves the lease to
// expire and the sweeper hands the document back. Retries are bounded. Bumping a phase's version in its module marks
// everything done under the old version dirty for that phase alone, which is the re-run after a scheme change.
// Statuses: (absent) never run; pending; running; done; failed (bounded retries exhausted); skipped.
import { content, entities } from "./store.mjs";
const REPOS = { content, entities };
export const LEASE_S = 10 * 60, MAX_ATTEMPTS = 3;
const p = (name) => `phases.${name}`;
// claim one document whose phase is unset, pending, or done under an older version; the caller passes the version it runs
// `sort` picks which eligible document goes first (analyze takes the newest published, so the site stays current and
// the backlog drains behind it); without it the oldest wins and a backlog starves the present
export async function claim(repo, phase, version, extra = {}, sort) {
  const now = new Date(), stale = new Date(Date.now() - LEASE_S * 1000);
  const filter = { ...extra, $or: [
    { [`${p(phase)}.status`]: { $exists: false } },
    { [`${p(phase)}.status`]: "pending", [`${p(phase)}.attempt`]: { $lt: MAX_ATTEMPTS } },
    { [`${p(phase)}.status`]: "running", [`${p(phase)}.lease`]: { $lt: stale } },
    { [`${p(phase)}.status`]: "done", [`${p(phase)}.version`]: { $lt: version } },
  ] };
  const doc = await REPOS[repo].claim(filter, { [`${p(phase)}.status`]: "running", [`${p(phase)}.lease`]: now, [`${p(phase)}.at`]: now }, sort);
  if (doc) await REPOS[repo].modify({ _id: doc._id }, { $inc: { [`${p(phase)}.attempt`]: 1 } });
  return doc;
}
export const done = (repo, phase, id, version, extra = {}) => REPOS[repo].update(id, { [`${p(phase)}.status`]: "done", [`${p(phase)}.version`]: version, [`${p(phase)}.at`]: new Date(), [`${p(phase)}.attempt`]: 0, [`${p(phase)}.error`]: "", ...extra });
export const skip = (repo, phase, id, version, why) => REPOS[repo].update(id, { [`${p(phase)}.status`]: "skipped", [`${p(phase)}.version`]: version, [`${p(phase)}.at`]: new Date(), [`${p(phase)}.error`]: why });
// hand a claimed document back untouched: the phase could not run (no model, no credits), the document is not at fault
export const release = (repo, phase, id) => REPOS[repo].modify({ _id: id }, { $set: { [`${p(phase)}.status`]: "pending", [`${p(phase)}.lease`]: null }, $inc: { [`${p(phase)}.attempt`]: -1 } });
export async function fail(repo, phase, id, err) {
  const doc = await REPOS[repo].get(id, { phases: 1 }); const attempt = doc?.phases?.[phase]?.attempt || 1;
  return REPOS[repo].update(id, { [`${p(phase)}.status`]: attempt >= MAX_ATTEMPTS ? "failed" : "pending", [`${p(phase)}.error`]: String(err?.message || err).slice(0, 500), [`${p(phase)}.at`]: new Date() });
}
// mark a whole phase dirty (after a prompt or scheme change): done becomes pending, attempts reset
export const rerun = (repo, phase, filter = {}) => REPOS[repo].updateWhere({ ...filter, [`${p(phase)}.status`]: { $in: ["done", "failed", "skipped"] } }, { [`${p(phase)}.status`]: "pending", [`${p(phase)}.attempt`]: 0 });
export async function status() {
  const out = {};
  for (const [repo, phases] of [["content", ["extract", "analyze", "resolve"]], ["entities", ["embed", "link", "extent"]]]) {
    for (const phase of phases) { const rows = await REPOS[repo].aggregate([{ $group: { _id: `$phases.${phase}.status`, n: { $sum: 1 } } }]); out[`${repo}.${phase}`] = Object.fromEntries(rows.map((r) => [r._id || "unset", r.n])); }
  }
  return out;
}
