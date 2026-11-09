#!/usr/bin/env node
// One-off: copy the usage stored on each analysis into `calls` (phase analyze), so the spend table has history from
// before 2026-11-08, when lib/analyze/llm.mjs began recording every call. Idempotent: a call row is keyed by analysis id.
import "../lib/env.mjs"; import { analyses, calls, close } from "../lib/store.mjs"; import { priced } from "../lib/analyze/llm.mjs";
const rows = await analyses.find({ usage: { $exists: true } }, { projection: { at: 1, model: 1, usage: 1 } });
const docs = rows.map((a) => ({ _id: "analysis:" + a._id, at: a.at, phase: "analyze", model: a.model, in: a.usage.in || 0, out: a.usage.out || 0, cached: a.usage.cached || 0, cost: a.usage.cost || priced(a.model, a.usage.in || 0, a.usage.out || 0), ms: null }));
const n = await calls.insertMany(docs); console.log(`${n} of ${docs.length} analyses copied into calls`); await close();
