#!/usr/bin/env node
// Put documents that failed a phase for a reason that was not theirs (no credits, rate limit, server error) back to
// pending with their attempts reset. Usage: bin/unfail.mjs <phase> [regex over the stored error, default: 402|429|5\d\d]
import "../lib/env.mjs"; import { content, close } from "../lib/store.mjs";
const phase = process.argv[2]; if (!phase) { console.error("usage: bin/unfail.mjs <phase> [error-regex]"); process.exit(1); }
const re = new RegExp(process.argv[3] || "openrouter (402|429|5\\d\\d)");
const n = await content.updateWhere({ [`phases.${phase}.status`]: "failed", [`phases.${phase}.error`]: re }, { [`phases.${phase}.status`]: "pending", [`phases.${phase}.attempt`]: 0 });
console.log(`${n} documents back to pending for ${phase}`); await close();
