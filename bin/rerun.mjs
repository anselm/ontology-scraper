#!/usr/bin/env node
// Mark a phase dirty so the worker chews back through it: bin/rerun.mjs <extract|analyze|resolve|link|embed|extent> [--all]
// By default only done/failed/skipped rows are reset. Resetting `resolve` does not undo entities already written; that is
// a later tool. Use after a prompt or scheme change when the version bump alone is not wanted.
import "../lib/env.mjs"; import * as pipe from "../lib/pipeline.mjs"; import { close } from "../lib/store.mjs";
const phase = process.argv[2]; const repo = ["extract", "analyze", "resolve"].includes(phase) ? "content" : ["link", "embed", "extent"].includes(phase) ? "entities" : null;
if (!repo) { console.error("usage: bin/rerun.mjs <extract|analyze|resolve|link|embed|extent>"); process.exit(1); }
console.log(`${phase}: ${await pipe.rerun(repo, phase)} rows marked pending`); await close();
