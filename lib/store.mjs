// The data layer. Every read and write of the database goes through here; nothing else imports mongodb.
// Collections: sources (feeds and their poll state), content (one row per fetched item, raw html and text, phase flags),
// analyses (one pre-analysis per content per model and prompt version), entities (the ECS graph: instances, prototypes,
// relations and merge events, all the same shape), claims (bitemporal observations behind the entity view), components
// (the component definitions as data), geocache (gazetteer lookups), hits (page counts by day).
import { MongoClient } from "mongodb";
const URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017", DB = process.env.MONGODB_DB || "ontology";
let client, db;
async function open() { if (!db) { client = new MongoClient(URI, { serverSelectionTimeoutMS: 4000 }); await client.connect(); db = client.db(DB); await indexes(); } return db; }
export async function close() { if (client) await client.close(); client = db = null; }
async function indexes() {
  const c = (n) => db.collection(n);
  await c("sources").createIndex({ status: 1, "poll.next": 1 });
  await c("content").createIndex({ source: 1, fetched: -1 }); await c("content").createIndex({ url: 1 }); await c("content").createIndex({ published: -1 });
  for (const p of ["extract", "analyze", "resolve"]) await c("content").createIndex({ [`phases.${p}.status`]: 1, [`phases.${p}.lease`]: 1 });
  await c("analyses").createIndex({ content: 1 }); await c("analyses").createIndex({ at: -1 });
  await c("entities").createIndex({ kind: 1 }); await c("entities").createIndex({ "components.meta.key": 1 }); await c("entities").createIndex({ "components.meta.aliasKeys": 1 });
  await c("entities").createIndex({ "components.kinds.prototype": 1 }); await c("entities").createIndex({ "components.relation.subject": 1 }); await c("entities").createIndex({ "components.relation.object": 1 });
  await c("entities").createIndex({ "stats.lastSeen": -1 }); await c("entities").createIndex({ "stats.firstSeen": 1 }); await c("entities").createIndex({ "components.location.lat": 1 });
  for (const p of ["embed", "link"]) await c("entities").createIndex({ kind: 1, [`phases.${p}.status`]: 1 });
  await c("entities").createIndex({ "components.meta.label": "text", "components.meta.description": "text", "components.meta.aliases": "text" }, { name: "entity_text" });
  await c("claims").createIndex({ entity: 1, component: 1, field: 1 }); await c("claims").createIndex({ content: 1 });
  await c("hits").createIndex({ day: 1 }, { unique: true });
}
// A small repository per collection. Deliberately plain: filters are Mongo filters, but only these functions are exported,
// so the shape of every access is visible in one file and can be swapped (Postgres, an API) without touching callers.
function repo(name) {
  return {
    get: async (id, projection) => (await open()).collection(name).findOne({ _id: id }, projection ? { projection } : undefined),
    one: async (filter, projection) => (await open()).collection(name).findOne(filter, projection ? { projection } : undefined),
    find: async (filter, { sort, limit, projection, skip } = {}) => { let cur = (await open()).collection(name).find(filter, projection ? { projection } : undefined); if (sort) cur = cur.sort(sort); if (skip) cur = cur.skip(skip); if (limit) cur = cur.limit(limit); return cur.toArray(); },
    count: async (filter) => (await open()).collection(name).countDocuments(filter),
    insert: async (doc) => { await (await open()).collection(name).insertOne(doc); return doc; },
    insertMany: async (docs) => { if (!docs.length) return 0; const r = await (await open()).collection(name).insertMany(docs, { ordered: false }).catch((e) => e.result || { insertedCount: 0 }); return r.insertedCount || 0; },
    update: async (id, set = {}, unset = {}) => { const u = {}; if (Object.keys(set).length) u.$set = set; if (Object.keys(unset).length) u.$unset = unset; if (!Object.keys(u).length) return 0; return (await (await open()).collection(name).updateOne({ _id: id }, u)).matchedCount; },
    updateWhere: async (filter, set = {}, unset = {}) => { const u = {}; if (Object.keys(set).length) u.$set = set; if (Object.keys(unset).length) u.$unset = unset; return (await (await open()).collection(name).updateMany(filter, u)).modifiedCount; },
    modify: async (filter, update) => (await (await open()).collection(name).updateMany(filter, update)).modifiedCount, // raw update operators ($inc, $push, $addToSet)
    upsert: async (id, set, setOnInsert = {}) => { const r = await (await open()).collection(name).updateOne({ _id: id }, { $set: set, ...(Object.keys(setOnInsert).length ? { $setOnInsert: setOnInsert } : {}) }, { upsert: true }); return { inserted: !!r.upsertedCount }; },
    claim: async (filter, set) => (await open()).collection(name).findOneAndUpdate(filter, { $set: set }, { returnDocument: "after" }), // atomic claim-with-lease
    remove: async (filter) => (await (await open()).collection(name).deleteMany(filter)).deletedCount,
    aggregate: async (pipeline) => (await open()).collection(name).aggregate(pipeline).toArray(),
    textSearch: async (q, filter, limit, projection) => (await open()).collection(name).find({ ...filter, $text: { $search: q } }, { projection: { ...(projection || {}), score: { $meta: "textScore" } } }).sort({ score: { $meta: "textScore" } }).limit(limit).toArray(),
  };
}
export const sources = repo("sources"), content = repo("content"), analyses = repo("analyses"), entities = repo("entities"), claims = repo("claims"), components = repo("components"), geocache = repo("geocache"), hits = repo("hits"), state = repo("state");
export const store = { sources, content, analyses, entities, claims, components, geocache, hits, state, close };
export default store;
