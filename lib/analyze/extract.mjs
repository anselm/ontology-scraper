// Pre-analysis: one document in, one analysis record out. The model names the things the text is about, each with a
// verbatim span, a top kind, the basic-level prototype it most resembles, aliases as written, a time and place hint and an
// open bag of attributes (the raw material for component induction); then the relations between the things it named,
// with the predicate snapped to a small spine and the surface verb kept as evidence, plus stance and a supporting quote.
// Flat schema, small enums, verbatim spans: the shape the survey found small and large models both manage. The record is
// cached by model and prompt version; bumping PROMPT_VERSION marks every document dirty for this phase.
import { z } from "zod"; import { content, analyses } from "../store.mjs"; import * as pipe from "../pipeline.mjs"; import { ask, available } from "./llm.mjs"; import { TOP_KINDS } from "../ontology/components.mjs";
export const PROMPT_VERSION = 1, PHASE = "analyze";
export const PREDICATES = ["part-of", "member-of", "located-in", "owns", "controls", "leads", "works-for", "represents", "attacks", "supports", "opposes", "funds", "produces", "transports", "travels-through", "meets", "announces", "causes", "affects", "participates-in", "related-to"];
const Kind = z.enum(Object.keys(TOP_KINDS));
const Entity = z.object({
  name: z.string().describe("the specific proper name or clear noun phrase, as it would be written in a reference work"),
  span: z.string().describe("a verbatim fragment of the text (under 160 characters) that mentions it"),
  kind: Kind.describe("the rigid top kind"),
  prototype: z.string().describe("the basic-level kind it most resembles, lowercase, singular, e.g. 'container ship', 'strait', 'prime minister' is wrong (that is a role), say 'person'"),
  description: z.string().describe("one sentence grounded in the text"),
  aliases: z.array(z.string()).describe("other names used for it in the text"),
  place: z.string().nullable().describe("for a place: its own name; for anything else: the place it is at in this text, or null"),
  approx: z.object({ lat: z.number(), lon: z.number(), radiusKm: z.number() }).nullable().describe("for a place only: your best estimate of its centre and a radius covering it; null if not a place or unsure"),
  when: z.object({ begins: z.string().nullable(), ends: z.string().nullable() }).nullable().describe("ISO dates or years, for an event's time or a thing's lifespan if stated; null otherwise"),
  roles: z.array(z.object({ office: z.string(), in: z.string().nullable() })).describe("offices or positions this agent holds, e.g. {office:'foreign minister', in:'Iran'}"),
  attributes: z.array(z.object({ key: z.string(), value: z.string() })).describe("other stated facts as key/value, lowercase keys, e.g. flag: panama, tonnage: 200000, status: closed"),
});
const Relation = z.object({
  from: z.string().describe("entity name, exactly as listed"), predicate: z.enum(PREDICATES), to: z.string().describe("entity name, exactly as listed"),
  surface: z.string().describe("the verb phrase as written"), stance: z.enum(["supports", "opposes", "neutral"]), quote: z.string().describe("verbatim sentence asserting it, under 240 characters"),
  when: z.string().nullable().describe("ISO date or year if the text gives one"),
});
export const Analysis = z.object({
  summary: z.string().describe("one plain sentence saying what happened"),
  tone: z.enum(["negative", "neutral", "positive"]),
  when: z.object({ begins: z.string().nullable(), ends: z.string().nullable() }).nullable().describe("when the events described took place, if stated"),
  entities: z.array(Entity), relations: z.array(Relation),
});
const SYSTEM = `You read a news article or essay and record the real things it is about, for a knowledge graph of the world over time.
Top kinds (choose one per entity): ${Object.entries(TOP_KINDS).map(([k, v]) => `${k}: ${v}`).join("; ")}.
Rules: prefer specific named instances (a named ship, person, strait, law, storm); also record the generic kinds only when the text is about them as such. One entry per real thing. A role such as minister or captain goes under roles on the person, never as the prototype. Every entity and relation must be supported by a verbatim span or quote from the text; invent nothing. Relations connect entities you listed. 4 to 25 entities, 2 to 20 relations. Predicates come from the fixed list; keep the written verb phrase in surface.`;
export async function analyzeOne(log = () => {}) {
  if (!available()) return false;
  const doc = await pipe.claim("content", PHASE, PROMPT_VERSION, { "phases.extract.status": "done", text: { $exists: true } });
  if (!doc) return false;
  try {
    const text = doc.text.length > 14000 ? doc.text.slice(0, 14000) + "\n[truncated]" : doc.text;
    const user = `TITLE: ${doc.title}\nPUBLISHED: ${doc.published?.toISOString?.() || ""}\nSOURCE: ${doc.source}\n\n${text}`;
    const { data, model, usage } = await ask(PHASE, SYSTEM, user, Analysis);
    const id = `${doc._id}:${model}:${PROMPT_VERSION}`;
    await analyses.upsert(id, { content: doc._id, source: doc.source, published: doc.published, model, promptVersion: PROMPT_VERSION, at: new Date(), usage, coverage: doc.text.length > 14000 ? "partial" : "full", ...data, status: "done" });
    await pipe.done("content", PHASE, doc._id, PROMPT_VERSION, { analysis: id });
    log(`${doc._id.slice(0, 8)} analyzed: ${data.entities.length} entities, ${data.relations.length} relations (${model}, ${usage.in}+${usage.out} tok): ${doc.title.slice(0, 50)}`);
  } catch (e) { if (e.refusal) await pipe.skip("content", PHASE, doc._id, PROMPT_VERSION, e.message); else await pipe.fail("content", PHASE, doc._id, e); log(`${doc._id.slice(0, 8)} analyze failed: ${e.message}`); if (e.unavailable) return false; }
  return true;
}
