#!/usr/bin/env node
// Compare extraction models on documents that already have a reference analysis, without writing to the database.
// The reference is either an existing analysis by a given model (default: Opus) or the hand-written contributed ones.
// For each candidate model the script runs the production prompt on each document and scores the result against
// the reference: entity precision and recall (names matched by key or alias), agreement on top kind and prototype for
// matched entities, recall of the reference's relations (subject, predicate, object over matched entities), tokens
// and dollar cost. Raw outputs are saved so the disagreements can be read.
// Usage: bin/eval-models.mjs --set opus|hand [--n 30] [--models anthropic/claude-haiku-5.5,ollama:gpt-oss:120b] [--out file.json] [--concurrency 4]
import "../lib/env.mjs"; import { writeFileSync } from "node:fs"; import { content, analyses, close } from "../lib/store.mjs"; import { ask } from "../lib/analyze/llm.mjs"; import { SYSTEM, userFor, Analysis } from "../lib/analyze/extract.mjs"; import { key } from "../lib/resolve/match.mjs";
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SET = arg("--set", "opus"), N = Number(arg("--n", 30)), MODELS = arg("--models", "anthropic/claude-haiku-5.5").split(","), OUT = arg("--out", `eval-${SET}-${Date.now()}.json`), CONC = Number(arg("--concurrency", 4));
const refs = SET === "hand" ? await analyses.find({ contributed: true }, { limit: N }) : await analyses.find({ model: new RegExp(SET, "i"), contributed: { $ne: true } }, { sort: { at: -1 }, limit: N });
const docs = []; for (const r of refs) { const d = await content.get(r.content, { title: 1, text: 1, published: 1, source: 1 }); if (d?.text) docs.push({ doc: d, ref: r }); }
console.error(`${docs.length} documents with a ${SET} reference; models: ${MODELS.join(", ")}`);
const keys = (e) => [key(e.name), ...(e.aliases || []).map(key)].filter(Boolean);
function match(cands, refEnts) { // greedy: each candidate to the first unmatched reference sharing a key
  const used = new Set(), pairs = [];
  for (const c of cands) { const ck = new Set(keys(c)); const r = refEnts.find((x, i) => !used.has(i) && keys(x).some((k) => ck.has(k))); if (r) { used.add(refEnts.indexOf(r)); pairs.push([c, r]); } }
  return pairs;
}
function score(cand, ref) {
  const pairs = match(cand.entities, ref.entities); const byCand = new Map(pairs.map(([c, r]) => [c.name, r.name]));
  const kind = pairs.filter(([c, r]) => c.kind === r.kind).length, proto = pairs.filter(([c, r]) => key(c.prototype) === key(r.prototype)).length;
  const refRels = new Set(ref.relations.map((x) => [key(x.from), x.predicate, key(x.to)].join("|")));
  const candRels = cand.relations.map((x) => [key(byCand.get(x.from) || x.from), x.predicate, key(byCand.get(x.to) || x.to)].join("|"));
  const relHit = candRels.filter((x) => refRels.has(x)).length;
  // looser: same pair of things related at all, any predicate
  const refPairs = new Set(ref.relations.map((x) => [key(x.from), key(x.to)].sort().join("|"))); const pairHit = candRels.filter((x) => { const [a, , b] = x.split("|"); return refPairs.has([a, b].sort().join("|")); }).length;
  return { nCand: cand.entities.length, nRef: ref.entities.length, matched: pairs.length, kind, proto, nCandRel: cand.relations.length, nRefRel: ref.relations.length, relHit, pairHit };
}
const results = [];
async function runModel(model) {
  const queue = docs.slice(); const conc = model.startsWith("ollama:") ? 1 : CONC; const rows = [];
  await Promise.all(Array.from({ length: conc }, async () => { for (;;) { const item = queue.shift(); if (!item) return; const t0 = Date.now();
    try { const { data, usage, model: m } = await ask("analyze", SYSTEM, userFor(item.doc), Analysis, { model }); rows.push({ model, got: m, content: item.doc._id, title: item.doc.title, ms: Date.now() - t0, usage, out: data, ...score(data, item.ref) }); process.stderr.write("."); }
    catch (e) { rows.push({ model, content: item.doc._id, title: item.doc.title, ms: Date.now() - t0, error: e.message.slice(0, 200) }); process.stderr.write("x"); } } }));
  process.stderr.write("\n"); results.push(...rows); return rows;
}
const sum = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0), pct = (a, b) => (b ? (100 * a / b).toFixed(0) + "%" : "-");
console.log(`set=${SET} docs=${docs.length} reference=${SET === "hand" ? "hand-written" : refs[0]?.model}`);
console.log("model | ok | ents/doc (ref) | precision | recall | kind agree | proto agree | rel exact | rel pair | rels/doc (ref) | in+out tok | cached | $/doc | s/doc");
for (const model of MODELS) {
  const rows = (await runModel(model)).filter((r) => !r.error), errs = results.filter((r) => r.model === model && r.error).length;
  const m = sum(rows, (r) => r.matched), nc = sum(rows, (r) => r.nCand), nr = sum(rows, (r) => r.nRef);
  console.log([model, `${rows.length}/${rows.length + errs}`, `${(nc / rows.length).toFixed(1)} (${(nr / rows.length).toFixed(1)})`, pct(m, nc), pct(m, nr), pct(sum(rows, (r) => r.kind), m), pct(sum(rows, (r) => r.proto), m), pct(sum(rows, (r) => r.relHit), sum(rows, (r) => r.nRefRel)), pct(sum(rows, (r) => r.pairHit), sum(rows, (r) => r.nRefRel)), `${(sum(rows, (r) => r.nCandRel) / rows.length).toFixed(1)} (${(sum(rows, (r) => r.nRefRel) / rows.length).toFixed(1)})`, `${(sum(rows, (r) => r.usage.in) / rows.length).toFixed(0)}+${(sum(rows, (r) => r.usage.out) / rows.length).toFixed(0)}`, (sum(rows, (r) => r.usage.cached) / rows.length).toFixed(0), "$" + (sum(rows, (r) => r.usage.cost) / rows.length).toFixed(4), (sum(rows, (r) => r.ms) / rows.length / 1000).toFixed(0)].join(" | "));
  for (const r of results.filter((r) => r.model === model && r.error)) console.log(`  error ${r.content.slice(0, 8)}: ${r.error}`);
}
writeFileSync(OUT, JSON.stringify({ set: SET, refs: docs.map((d) => ({ content: d.doc._id, title: d.doc.title, ref: d.ref })), results }, null, 1)); console.error(`raw results in ${OUT}`);
await close();
