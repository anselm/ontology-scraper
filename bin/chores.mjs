#!/usr/bin/env node
// Donated analysis. A contributor (a Claude Code session on a Max plan, a person, another model) claims documents that
// need the analyze phase, reads them, writes an analysis per document in the same shape the pipeline's own prompt
// produces, and submits them. The record is labelled with the contributor's model name, so provenance and later
// agreement scoring treat it like any other extractor. Resolution happens on the service as usual.
//   bin/chores.mjs claim [n] [dir]   claim n documents (default 5) and write <dir>/<id>.txt with the text to read
//   bin/chores.mjs submit <dir>      validate every <dir>/<id>.json against the schema, store, mark done
//   bin/chores.mjs release <dir>     hand claimed documents back (status pending)
//   bin/chores.mjs schema            print the JSON schema an analysis must match
// Point MONGODB_URI at the live database (deploy/tunnel.sh gives mongodb://127.0.0.1:27018). CONTRIBUTOR names the model.
import "../lib/env.mjs"; import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs"; import { join } from "node:path"; import { z } from "zod";
import { content, analyses, close } from "../lib/store.mjs"; import * as pipe from "../lib/pipeline.mjs"; import { Analysis, PROMPT_VERSION, PHASE, PREDICATES } from "../lib/analyze/extract.mjs"; import { TOP_KINDS } from "../lib/ontology/components.mjs";
const [cmd, a1, a2] = process.argv.slice(2); const MODEL = process.env.CONTRIBUTOR || "claude-code:claude-fable-5-1"; const LEASE_H = 6;
const brief = () => `Record the real things this text is about. Top kinds: ${Object.entries(TOP_KINDS).map(([k, v]) => `${k} (${v})`).join("; ")}. Predicates: ${PREDICATES.join(", ")}. Every entity needs a verbatim span; every relation a verbatim quote. Roles (minister, captain) go under roles on the person, never as the prototype. Prototype is the basic-level kind, lowercase singular. Places get approx {lat, lon, radiusKm} or null. 4 to 25 entities, 2 to 20 relations.`;
if (cmd === "schema") { console.log(JSON.stringify(z.toJSONSchema(Analysis), null, 1)); await close(); process.exit(0); }
if (cmd === "claim") {
  const n = Number(a1 || 5), dir = a2 || "chores"; mkdirSync(dir, { recursive: true }); const ids = [];
  for (let i = 0; i < n; i++) { const doc = await pipe.claim("content", PHASE, PROMPT_VERSION, { "phases.extract.status": "done", text: { $exists: true } }); if (!doc) break;
    await content.update(doc._id, { [`phases.${PHASE}.lease`]: new Date(Date.now() + LEASE_H * 3600e3), [`phases.${PHASE}.claimedBy`]: MODEL });
    writeFileSync(join(dir, doc._id + ".txt"), `ID: ${doc._id}\nTITLE: ${doc.title}\nPUBLISHED: ${doc.published?.toISOString?.() || ""}\nSOURCE: ${doc.source}\nURL: ${doc.url}\n\n${doc.text}\n`); ids.push(doc._id); console.log(`${doc._id.slice(0, 12)}  ${doc.title.slice(0, 80)}`); }
  writeFileSync(join(dir, "BRIEF.txt"), brief() + "\n\nWrite <id>.json beside each <id>.txt, matching `bin/chores.mjs schema`.\n"); console.log(`${ids.length} claimed into ${dir}/ (lease ${LEASE_H} h); brief in ${dir}/BRIEF.txt`);
} else if (cmd === "submit") {
  const dir = a1 || "chores"; let ok = 0, bad = 0;
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) { const id = f.slice(0, -5); const doc = await content.get(id, { title: 1, source: 1, published: 1, text: 1 }); if (!doc) { console.error(`${f}: no such document`); bad++; continue; }
    let data; try { data = Analysis.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))); } catch (e) { console.error(`${f}: ${e.message.split("\n")[0]}`); bad++; continue; }
    const aid = `${id}:${MODEL}:${PROMPT_VERSION}`; await analyses.upsert(aid, { content: id, source: doc.source, published: doc.published, model: MODEL, promptVersion: PROMPT_VERSION, at: new Date(), usage: { in: 0, out: 0 }, coverage: "full", ...data, status: "done", contributed: true });
    await pipe.done("content", PHASE, id, PROMPT_VERSION, { analysis: aid }); ok++; console.log(`${id.slice(0, 12)}  ${data.entities.length} entities, ${data.relations.length} relations  ${doc.title.slice(0, 60)}`); }
  console.log(`${ok} submitted, ${bad} rejected`);
} else if (cmd === "release") {
  const dir = a1 || "chores"; let n = 0; for (const f of readdirSync(dir).filter((f) => f.endsWith(".txt") && f !== "BRIEF.txt")) { const id = f.slice(0, -4); if (existsSync(join(dir, id + ".json"))) continue; n += await content.update(id, { [`phases.${PHASE}.status`]: "pending", [`phases.${PHASE}.attempt`]: 0 }); } console.log(`${n} released`);
} else { console.error("usage: bin/chores.mjs claim [n] [dir] | submit <dir> | release <dir> | schema"); }
await close();
