// When to poll a source next. Rules copied from Miniflux and the crawler literature (survey 2026-10-14): an adaptive
// interval from the source's observed posting rate (Poisson estimate over the last week), clamped between 5 minutes and
// 24 hours; full-jitter exponential backoff on transport failures with a cap; three consecutive parse errors stop the
// source until a human resets it. Pure functions; the caller writes the result.
export const MIN = 5 * 60, MAX = 24 * 3600;
const clamp = (s) => Math.min(MAX, Math.max(MIN, s));
// lambda is items per second seen over the window; aim to poll about twice per expected item, never outside the clamp
export function intervalFor(lambda) { if (!lambda || lambda <= 0) return 3600; return clamp(0.5 / lambda); }
export function estimateLambda(itemDates, now = Date.now()) { const week = now - 7 * 864e5; const n = itemDates.filter((d) => d && d.getTime() > week).length; return n / (7 * 86400); }
export function backoff(failures) { const base = Math.min(MAX, MIN * 2 ** Math.min(failures, 8)); return Math.round(Math.random() * base); } // full jitter: uniform in [0, base]
export function next(source, { itemDates = [], failed = false, parseError = false } = {}) {
  const poll = { ...source.poll };
  if (parseError) { poll.parseErrors = (poll.parseErrors || 0) + 1; } else poll.parseErrors = 0;
  if (failed) { poll.failures = (poll.failures || 0) + 1; poll.next = new Date(Date.now() + backoff(poll.failures) * 1000); return poll; }
  poll.failures = 0;
  if (itemDates.length) poll.lambda = estimateLambda(itemDates);
  poll.interval = intervalFor(poll.lambda);
  poll.next = new Date(Date.now() + poll.interval * 1000 * (0.9 + Math.random() * 0.2));
  return poll;
}
export const stopped = (poll) => (poll.parseErrors || 0) >= 3;
