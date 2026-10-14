#!/usr/bin/env node
// The loop. Each tick: poll due sources, extract bodies, analyze (within the daily budget), resolve, link, embed, and
// run induction when enough has accumulated. Phases claim their own work from the database, so several workers can run.
// Usage: bin/worker.mjs [--once] [--interval-s 60] [--budget 150]
import "../lib/env.mjs"; import { seedAll } from "../lib/sources/seed.mjs"; import * as inhale from "../lib/inhale/index.mjs"; import { analyzeOne } from "../lib/analyze/extract.mjs"; import { resolveOne } from "../lib/resolve/index.mjs"; import { linkOne } from "../lib/enrich/link.mjs"; import { embedBatch } from "../lib/enrich/embed.mjs"; import * as induce from "../lib/ontology/induce.mjs"; import { analyses, close } from "../lib/store.mjs";
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; }; const once = process.argv.includes("--once");
const INTERVAL = Number(arg("--interval-s", process.env.WORKER_INTERVAL_S || 60)), BUDGET = Number(arg("--budget", process.env.ANALYZE_BUDGET || 100));
const log = (s) => console.log(new Date().toISOString().slice(11, 19), s);
async function analyzedToday() { return analyses.count({ at: { $gte: new Date(Date.now() - 864e5) } }); }
async function tick() {
  const t0 = Date.now(); const r = await inhale.poll({ log }); if (r.polled) log(`polled ${r.polled} sources, ${r.added} new items`);
  let n = 0; while (n < 40 && (await inhale.extractOne(log))) n++;
  // resolve follows each analysis at once, so entities appear on the site within a minute of a read rather than after a batch;
  // the per-tick cap keeps link, embed and induction getting their turn while analysis (about 40 s each) is the slow step
  let used = await analyzedToday(), a = 0, rs = 0; while (rs < 60 && (await resolveOne(log))) rs++;
  while (used + a < BUDGET && a < 8 && (await analyzeOne(log))) { a++; while (await resolveOne(log)) rs++; } if (used + a >= BUDGET) log(`analysis budget reached (${BUDGET}/day)`);
  let l = 0; while (l < 30 && (await linkOne(log))) l++;
  let e = 0; while (e < 4 && (await embedBatch(32, log))) e++;
  const ind = await induce.maybeRun(log);
  log(`tick: ${n} extracted, ${a} analyzed, ${rs} resolved, ${l} linked${ind ? ", induced" : ""} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
const seeded = await seedAll(); if (seeded) log(`seeded ${seeded} sources`);
if (once) { await tick(); await close(); process.exit(0); }
for (;;) { try { await tick(); } catch (e) { log("tick failed: " + (e.stack || e)); } await new Promise((r) => setTimeout(r, INTERVAL * 1000)); }
