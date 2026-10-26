#!/usr/bin/env node
// Print the service's health and, with --notify, push it over ntfy: each problem once, repeated after 12 h if it
// persists, with an all-clear when it goes away; and one digest a day, at the first run after DIGEST_HOUR UTC (default
// 16, morning in San Francisco). --force sends the digest now. Meant for an hourly systemd timer (deploy/provision.sh)
// and for a person at a console. Usage: bin/health.mjs [--notify] [--force]
import "../lib/env.mjs"; import { check } from "../lib/health.mjs"; import { notify } from "../lib/alerts.mjs"; import { state, close } from "../lib/store.mjs";
const args = new Set(process.argv.slice(2)), HOST = process.env.CANONICAL_HOST || "ontology", DIGEST_HOUR = Number(process.env.DIGEST_HOUR || 16), REPEAT_H = 12;
const h = await check();
console.log(`${h.ok ? "ok" : "PROBLEMS"}: ${h.text}`); for (const p of h.problems) console.log(`  ! ${p.key}: ${p.text}`);
if (args.has("--notify") || args.has("--force")) {
  const s = (await state.get("health")) || { sent: {}, lastDigest: null }; const now = Date.now(), click = `https://${HOST}/pipeline`;
  for (const p of h.problems) { const at = s.sent[p.key]; if (!at || now - new Date(at) > REPEAT_H * 36e5) { if (await notify({ title: `${HOST}: ${p.key}`, body: p.text, priority: "high", tags: ["warning"], click })) s.sent[p.key] = new Date(); } }
  for (const key of Object.keys(s.sent)) if (!h.problems.some((p) => p.key === key)) { await notify({ title: `${HOST}: ${key} cleared`, body: h.text, tags: ["white_check_mark"], click }); delete s.sent[key]; }
  const due = args.has("--force") || (new Date().getUTCHours() >= DIGEST_HOUR && (!s.lastDigest || now - new Date(s.lastDigest) > 20 * 36e5));
  if (due && (await notify({ title: `${HOST} daily`, body: h.text, tags: [h.ok ? "newspaper" : "warning"], click }))) s.lastDigest = new Date();
  await state.upsert("health", s);
}
await close(); process.exit(h.ok ? 0 : 1);
