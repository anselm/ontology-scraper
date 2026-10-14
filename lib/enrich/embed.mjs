// Embeddings for instances (label plus description) via ollama's nomic-embed-text when it is reachable; used by
// induction and future blocking. Nothing depends on it; where ollama is absent the phase simply does not run.
import { entities } from "../store.mjs"; import * as pipe from "../pipeline.mjs"; import { embed } from "../analyze/llm.mjs";
export const EMBED_VERSION = 1, PHASE = "embed";
export async function embedBatch(n = 32, log = () => {}) {
  const docs = []; for (let i = 0; i < n; i++) { const d = await pipe.claim("entities", PHASE, EMBED_VERSION, { kind: "instance" }); if (!d) break; docs.push(d); }
  if (!docs.length) return false;
  const vecs = await embed(docs.map((d) => `${d.components.meta.label}: ${d.components.meta.description || ""}`));
  if (!vecs) { for (const d of docs) await entities.update(d._id, { "phases.embed.status": "pending" }); return false; }
  for (let i = 0; i < docs.length; i++) await pipe.done("entities", PHASE, docs[i]._id, EMBED_VERSION, { vector: vecs[i] });
  log(`embedded ${docs.length}`); return true;
}
