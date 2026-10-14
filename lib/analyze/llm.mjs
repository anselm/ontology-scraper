// The model layer. Tier one is the Anthropic API with structured outputs; tier two is OpenRouter (OpenAI-shaped chat
// completions with a JSON schema; the same model family is available there and Anselm's key is funded); tier three is
// local ollama with a JSON schema; tier four is nothing (the phase waits). A billing error on tier one retires it for
// the session so the worker does not pay a round trip per document. Every answer is labelled with the model that gave it. The per-phase model is
// an environment variable (MODEL_ANALYZE, MODEL_JUDGE, MODEL_INDUCE) so the bulk pass can be moved to a cheaper tier
// without touching code; the default is claude-opus-5-5 at low effort. Schemas are zod objects; the API enforces the
// structure and we validate the values.
import Anthropic from "@anthropic-ai/sdk"; import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"; import { z } from "zod";
const KEY = process.env.ANTHROPIC_API_KEY || ""; const OLLAMA = process.env.OLLAMA_URL || "http://127.0.0.1:11434"; const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gpt-oss:20b";
const client = KEY ? new Anthropic({ apiKey: KEY, maxRetries: 2, timeout: 180000 }) : null; let anthropicDead = false;
const OR_KEY = process.env.OPENROUTER_API_KEY || ""; const OR_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-opus-5.5";
export const modelFor = (phase) => process.env[`MODEL_${phase.toUpperCase()}`] || process.env.MODEL || "claude-opus-5-5";
export const available = () => (!!client && !anthropicDead) || !!OR_KEY || !!process.env.OLLAMA_MODEL;
const stripFence = (t) => { const s = t.indexOf("{"), e = t.lastIndexOf("}"); return s >= 0 && e > s ? t.slice(s, e + 1) : t; };
let ollamaOk = null; // probed once
async function ollamaUp() { if (ollamaOk !== null) return ollamaOk; try { const r = await fetch(OLLAMA + "/api/tags", { signal: AbortSignal.timeout(3000) }); ollamaOk = r.ok; } catch { ollamaOk = false; } return ollamaOk; }
// ask(phase, system, user, schema) → { data, model, usage } or throws. Structured outputs: the schema is sent; the text is parsed and validated.
export async function ask(phase, system, user, schema, { effort = "low", maxTokens = 16000 } = {}) {
  if (client && !anthropicDead) {
    const model = modelFor(phase);
    try {
    const res = await client.messages.create({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }], output_config: { effort, format: zodOutputFormat(schema) } });
    if (res.stop_reason === "refusal") throw Object.assign(new Error("refused: " + (res.stop_details?.category || "")), { refusal: true });
    if (res.stop_reason === "max_tokens") throw new Error("truncated at max_tokens");
    const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const data = schema.parse(JSON.parse(text));
    return { data, model, usage: { in: res.usage?.input_tokens || 0, out: res.usage?.output_tokens || 0 } };
    } catch (e) { if (e instanceof Anthropic.BadRequestError && /credit balance/i.test(e.message) || e instanceof Anthropic.AuthenticationError) { anthropicDead = true; console.error("anthropic tier retired for this session:", e.message.slice(0, 120)); } else throw e; }
  }
  if (OR_KEY) {
    const model = process.env[`OPENROUTER_MODEL_${phase.toUpperCase()}`] || OR_MODEL; const json_schema = z.toJSONSchema(schema);
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${OR_KEY}`, "content-type": "application/json", "HTTP-Referer": "https://ontology.monster", "X-Title": "ontology-scraper" },
      body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0, response_format: { type: "json_schema", json_schema: { name: "answer", strict: true, schema: json_schema } }, messages: [{ role: "system", content: system + "\nAnswer with one JSON object matching this schema and nothing else:\n" + JSON.stringify(json_schema) }, { role: "user", content: user }] }), signal: AbortSignal.timeout(300000) });
    if (!r.ok) throw new Error(`openrouter ${r.status} ${(await r.text()).slice(0, 200)}`); const j = await r.json(); if (j.error) throw new Error("openrouter " + JSON.stringify(j.error).slice(0, 200));
    const text = j.choices?.[0]?.message?.content || ""; if (j.choices?.[0]?.finish_reason === "length") throw new Error("truncated at max_tokens");
    return { data: schema.parse(JSON.parse(stripFence(text))), model: "openrouter:" + (j.model || model), usage: { in: j.usage?.prompt_tokens || 0, out: j.usage?.completion_tokens || 0 } };
  }
  if (await ollamaUp()) {
    const format = z.toJSONSchema(schema);
    const r = await fetch(OLLAMA + "/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, format, options: { temperature: 0, num_ctx: 16384 }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }), signal: AbortSignal.timeout(600000) });
    if (!r.ok) throw new Error("ollama " + r.status); const j = await r.json();
    return { data: schema.parse(JSON.parse(j.message?.content || "{}")), model: "ollama:" + OLLAMA_MODEL, usage: { in: j.prompt_eval_count || 0, out: j.eval_count || 0 } };
  }
  throw Object.assign(new Error("no model available (set ANTHROPIC_API_KEY or run ollama)"), { unavailable: true });
}
// embeddings via ollama only (nomic-embed-text with the clustering prefix); null when ollama is not there
export async function embed(texts) {
  if (!(await ollamaUp())) return null;
  const r = await fetch(OLLAMA + "/api/embed", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: process.env.EMBED_MODEL || "nomic-embed-text", input: texts.map((t) => "clustering: " + t) }), signal: AbortSignal.timeout(120000) });
  if (!r.ok) return null; return (await r.json()).embeddings;
}
