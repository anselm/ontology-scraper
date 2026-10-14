// Fetch and normalise one feed. Conditional GET with both validators; parse RSS 2.0, RSS 1.0 RDF, Atom and JSON Feed via
// @rowanmanning/feed-parser; each item gets an id from Miniflux's hash chain (guid, guid+url, guid+position, url, else
// title+content) so the same item seen twice is the same row. Missing dates become fetch time, kept apart from the
// claimed date. Returns {status, items, etag, lastModified, parseError}.
import { createHash } from "node:crypto"; import { parseFeed } from "@rowanmanning/feed-parser"; import { USER_AGENT } from "../env.mjs";
const sha = (s) => createHash("sha256").update(s).digest("hex");
export async function fetchFeed(source) {
  const headers = { "user-agent": USER_AGENT, accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, application/feed+json;q=0.9, */*;q=0.5", "accept-encoding": "gzip, br" };
  if (source.poll?.etag) headers["if-none-match"] = source.poll.etag; if (source.poll?.lastModified) headers["if-modified-since"] = source.poll.lastModified;
  const res = await fetch(source.url, { headers, redirect: "follow", signal: AbortSignal.timeout(30000) });
  if (res.status === 304) return { status: 304, items: [], etag: source.poll.etag, lastModified: source.poll.lastModified };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.text();
  let feed; try { feed = parseFeed(body); } catch (e) { return { status: res.status, items: [], parseError: e.message, etag: res.headers.get("etag") || "", lastModified: res.headers.get("last-modified") || "" }; }
  const now = new Date(), seen = new Set(), items = [];
  (feed.items || []).forEach((it, i) => {
    const url = it.url || "", title = (it.title || "").trim(), guid = it.id || "";
    let key = guid; if (!key || seen.has(key)) key = guid ? guid + "|" + url : url; if (!key || seen.has(key)) key = guid ? guid + "|" + i : title + "|" + (it.content || it.description || "").slice(0, 200);
    if (!key || seen.has(key)) return; seen.add(key);
    const published = it.published || it.updated || null;
    items.push({ _id: sha(source._id + ":" + key), source: source._id, url, title, author: (it.authors || []).map((a) => a.name).filter(Boolean).join(", "), published: published ? new Date(published) : now, dateClaimed: !!published, summary: (it.description || "").slice(0, 2000), html: it.content || "", fetched: now, present: true, gone: false, feedKey: key });
  });
  return { status: res.status, items, etag: res.headers.get("etag") || "", lastModified: res.headers.get("last-modified") || "", feedTitle: feed.title };
}
