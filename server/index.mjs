#!/usr/bin/env node
// Transport only. One socket per client; {name, payload} requests switched here to the service. HTTP serves the static
// build and a plain rendering of entity pages for crawlers and link unfurls. No accounts, no cookies.
import "../lib/env.mjs"; import Fastify from "fastify"; import fstatic from "@fastify/static"; import { Server } from "socket.io";
import { join } from "node:path"; import { existsSync, readFileSync } from "node:fs"; import { ROOT } from "../lib/env.mjs"; import * as svc from "../lib/service.mjs";
const PORT = Number(process.env.PORT || 8100), HOST = process.env.HOST || "0.0.0.0";
const app = Fastify({ logger: false, bodyLimit: 64 * 1024 });
const H = {
  "stats": () => svc.stats(), "bounds": () => svc.bounds(), "located": (p) => svc.located(p), "graph": (p) => svc.graph(p), "entity": (p) => svc.get(p), "search": (p) => svc.search(p), "recent": (p) => svc.recent(p),
  "prototypes": () => svc.prototypes(), "prototype": (p) => svc.prototype(p), "components": () => svc.componentList(),
  "sources": () => svc.sourceList(), "pipeline": () => svc.pipeline(), "analysis": (p) => svc.analysis(p),
  "hit": (p) => svc.hit(p?.page || ""),
};
const dist = join(ROOT, "dist"); const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
if (existsSync(dist)) {
  await app.register(fstatic, { root: dist, prefix: "/", preCompressed: true, index: false });
  const shell = readFileSync(join(dist, "index.html"), "utf8");
  const page = (meta, body) => shell.replace(/<title>.*?<\/title>/, `<title>${esc(meta.title)} · ontology.monster</title>`).replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(meta.description)}"`).replace("<!--prerender-->", body);
  app.get("/", async (req, rep) => rep.type("text/html").send(shell));
  app.get("/e/:id", async (req, rep) => { try { const e = await svc.get({ id: req.params.id }); return rep.type("text/html").send(page({ title: e.label, description: e.description }, `<main style="max-width:40rem;margin:3rem auto;padding:0 1rem;font-family:system-ui"><h1>${esc(e.label)}</h1><p>${esc(e.prototype)} · ${esc(e.top)}</p><p>${esc(e.description)}</p><ul>${e.sources.map((s) => `<li><a href="${esc(s.url)}">${esc(s.title)}</a>: ${esc(s.quote)}</li>`).join("")}</ul></main>`)); } catch (e) { return rep.code(e.code || 500).type("text/html").send(shell); } });
  app.setNotFoundHandler(async (req, rep) => { if (req.method !== "GET" || /\.[a-z0-9]{2,5}$/i.test(req.url.split("?")[0])) return rep.code(404).send({ error: "not found" }); return rep.type("text/html").send(shell); });
}
app.addHook("onSend", (req, reply, payload, done) => { if (req.url.startsWith("/assets/")) reply.header("cache-control", "public, max-age=31536000, immutable"); else if (!req.url.startsWith("/socket.io")) reply.header("cache-control", "no-cache"); done(); });
app.get("/api/health", async () => ({ ok: true, ...(await svc.stats()) }));
await app.ready(); const io = new Server(app.server, { serveClient: false, maxHttpBufferSize: 64 * 1024 });
io.on("connection", (sock) => { sock.on("rpc", async (req, ack) => { const { name, payload = {} } = req || {}; const fn = H[name];
  try { if (!fn) throw new svc.Fail(404, `no such request: ${name}`); ack({ ok: true, data: await fn(payload, sock) }); }
  catch (e) { ack({ ok: false, code: e.code || 500, error: e.message }); if (!e.code) console.error(name, e); } }); });
await app.listen({ port: PORT, host: HOST }); console.log(`ontology listening on http://${HOST}:${PORT}`);
