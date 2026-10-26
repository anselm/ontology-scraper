// The model layer. Tier one is the Anthropic API with structured outputs; tier two is OpenRouter (OpenAI-shaped chat
// completions with a JSON schema; the same model family is available there and Anselm's key is funded); tier three is
// local ollama with a JSON schema; tier four is nothing (the phase waits). A billing error on tier one retires it for
// the session so the worker does not pay a round trip per document; a billing or rate error on tier two pauses it for a
// while and is reported as `unavailable`, so a phase releases its claim instead of burning a retry (2026-10-18: a run
// out of credits marked 1,474 documents failed for good). Every answer is labelled with the model that gave it and
// carries the tokens and, from OpenRouter, the dollar cost. The per-phase model is an environment variable
// (MODEL_<PHASE> for Anthropic, OPENROUTER_MODEL_<PHASE> for OpenRouter) so the bulk pass can be moved to a cheaper
// tier without touching code. The system prompt is marked cacheable (Anthropic models through OpenRouter honour it),
// and the JSON schema goes once, as the response format, not also in the prompt. Schemas are zod objects; the API
// enforces the structure and we validate the values.
import Anthropic from "@anthropic-ai/sdk"; import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"; import { z } from "zod";
import { notify } from "../alerts.mjs";
const KEY = process.env.ANTHROPIC_API_KEY || ""; const OLLAMA = process.env.OLLAMA_URL || "http://127.0.0.1:11434"; const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gpt-oss:20b";
const client = KEY ? new Anthropic({ apiKey: KEY, maxRetries: 2, timeout: 180000 }) : null; let anthropicDead = false;
const OR_KEY = process.env.OPENROUTER_API_KEY || ""; const OR_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-opus-5.5";
let orPausedUntil = 0; const PAUSE_BILLING_MS = 15 * 60e3, PAUSE_RATE_MS = 60e3;
export const modelFor = (phase) => process.env[`MODEL_${phase.toUpperCase()}`] || process.env.MODEL || "claude-opus-5-5";
export const orModelFor = (phase) => process.env[`OPENROUTER_MODEL_${phase.toUpperCase()}`] || OR_MODEL;
export const available = () => (!!client && !anthropicDead) || (!!OR_KEY && Date.now() >= orPausedUntil) || !!process.env.OLLAMA_MODEL;
export const paused = () => (OR_KEY && Date.now() < orPausedUntil ? Math.ceil((orPausedUntil - Date.now()) / 1000) : 0);
const stripFence = (t) => { const s = t.indexOf("{"), e = t.lastIndexOf("}"); return s >= 0 && e > s ? t.slice(s, e + 1) : t; };
let ollamaOk = null; // probed once
async function ollamaUp() { if (ollamaOk !== null) return ollamaOk; try { const r = await fetch(OLLAMA + "/api/tags", { signal: AbortSignal.timeout(3000) }); ollamaOk = r.ok; } catch { ollamaOk = false; } return ollamaOk; }
// ask(phase, system, user, schema, opts) → { data, model, usage: {in, out, cached, cost} } or throws. `opts.model` overrides the
// phase's model for one call (evaluation). An error with `unavailable: true` means no tier could answer right now, not
// that the document is bad: the caller should release its claim and try later.
export async function ask(phase, system, user, schema, { effort = "low", maxTokens = 8192, model: override = null } = {}) {
  const local = override && override.startsWith("ollama:"); if (local) override = override.slice(7);
  if (client && !anthropicDead && !local && !(override && override.includes("/"))) {
    const model = override || modelFor(phase);
    try {
    const res = await client.messages.create({ model, max_tokens: maxTokens, system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: user }], output_config: { effort, format: zodOutputFormat(schema) } });
    if (res.stop_reason === "refusal") throw Object.assign(new Error("refused: " + (res.stop_details?.category || "")), { refusal: true });
    if (res.stop_reason === "max_tokens") throw new Error("truncated at max_tokens");
    const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const data = schema.parse(JSON.parse(text));
    return { data, model, usage: { in: res.usage?.input_tokens || 0, out: res.usage?.output_tokens || 0, cached: res.usage?.cache_read_input_tokens || 0 } };
    } catch (e) { if (e instanceof Anthropic.BadRequestError && /credit balance/i.test(e.message) || e instanceof Anthropic.AuthenticationError) { anthropicDead = true; console.error("anthropic tier retired for this session:", e.message.slice(0, 120)); } else throw e; }
  }
  if (OR_KEY && !local) {
    if (Date.now() < orPausedUntil) throw Object.assign(new Error(`openrouter paused for ${paused()}s after a billing or rate error`), { unavailable: true });
    const model = override || orModelFor(phase); const json_schema = z.toJSONSchema(schema);
    const sys = model.startsWith("anthropic/") ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }] : system;
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${OR_KEY}`, "content-type": "application/json", "HTTP-Referer": "https://ontology.monster", "X-Title": "ontology-scraper" },
      body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0, usage: { include: true }, response_format: { type: "json_schema", json_schema: { name: "answer", strict: true, schema: json_schema } }, messages: [{ role: "system", content: sys }, { role: "user", content: user + "\n\nAnswer with one JSON object matching the required schema and nothing else." }] }), signal: AbortSignal.timeout(300000) });
    if (r.status === 402 || r.status === 429 || r.status >= 500) {
      const body = (await r.text()).slice(0, 200); orPausedUntil = Date.now() + (r.status === 402 ? PAUSE_BILLING_MS : PAUSE_RATE_MS); if (r.status === 402) notify({ title: `${process.env.CANONICAL_HOST || "ontology"}: openrouter billing`, body: `402 on ${model}; paused 15 min. ${body.slice(0, 120)}`, priority: "high", tags: ["warning"] });
      throw Object.assign(new Error(`openrouter ${r.status} ${body}`), { unavailable: true });
    }
    if (!r.ok) throw new Error(`openrouter ${r.status} ${(await r.text()).slice(0, 200)}`); const j = await r.json(); if (j.error) throw new Error("openrouter " + JSON.stringify(j.error).slice(0, 200));
    const text = j.choices?.[0]?.message?.content || ""; if (j.choices?.[0]?.finish_reason === "length") throw new Error("truncated at max_tokens");
    const u = j.usage || {};
    return { data: schema.parse(JSON.parse(stripFence(text))), model: "openrouter:" + (j.model || model), usage: { in: u.prompt_tokens || 0, out: u.completion_tokens || 0, cached: u.prompt_tokens_details?.cached_tokens || 0, cost: u.cost || 0 } };
  }
  if (await ollamaUp()) {
    const format = z.toJSONSchema(schema); const model = override || OLLAMA_MODEL;
    const r = await fetch(OLLAMA + "/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, stream: false, format, options: { temperature: 0, num_ctx: 16384 }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }), signal: AbortSignal.timeout(600000) });
    if (!r.ok) throw new Error("ollama " + r.status); const j = await r.json();
    return { data: schema.parse(JSON.parse(j.message?.content || "{}")), model: "ollama:" + model, usage: { in: j.prompt_eval_count || 0, out: j.eval_count || 0, cost: 0 } };
  }
  throw Object.assign(new Error("no model available (set ANTHROPIC_API_KEY or run ollama)"), { unavailable: true });
}
// embeddings via ollama only (nomic-embed-text with the clustering prefix); null when ollama is not there
export async function embed(texts) {
  if (!(await ollamaUp())) return null;
  const r = await fetch(OLLAMA + "/api/embed", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: process.env.EMBED_MODEL || "nomic-embed-text", input: texts.map((t) => "clustering: " + t) }), signal: AbortSignal.timeout(120000) });
  if (!r.ok) return null; return (await r.json()).embeddings;
}
