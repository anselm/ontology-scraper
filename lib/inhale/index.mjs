// The inhale phases. `poll` walks the sources whose next poll is due, fetches each feed once, inserts items it has not
// seen (the hash is the id, so a duplicate insert is a no-op) and writes back the poll state. `extract` claims content
// rows that have no text yet, fetches the page and extracts the body; the feed's own content is the fallback when the
// page refuses us. Bodies stay in the database and are never served.
import { sources, content } from "../store.mjs"; import { fetchFeed } from "./feed.mjs"; import { fetchPage, extract } from "./article.mjs"; import * as pipe from "../pipeline.mjs"; import * as schedule from "../sources/schedule.mjs";
export const EXTRACT_VERSION = 1;
export async function poll({ limit = 20, log = () => {} } = {}) {
  const due = await sources.find({ status: "active", "poll.next": { $lte: new Date() } }, { sort: { "poll.next": 1 }, limit });
  let added = 0;
  for (const s of due) {
    if (schedule.stopped(s.poll)) { await sources.update(s._id, { status: "paused", "poll.lastError": "stopped after 3 parse errors" }); continue; }
    try {
      const r = await fetchFeed(s);
      if (r.parseError) { await sources.update(s._id, { poll: { ...schedule.next(s, { parseError: true }), etag: r.etag, lastModified: r.lastModified, lastError: "parse: " + r.parseError, last: new Date() } }); log(`${s._id}: parse error ${r.parseError}`); continue; }
      const n = r.status === 304 ? 0 : await content.insertMany(r.items.map((it) => ({ ...it, phases: {} })));
      const dates = r.items.filter((i) => i.dateClaimed).map((i) => i.published);
      const poll = schedule.next(s, { itemDates: dates.length ? dates : [] }); poll.etag = r.etag; poll.lastModified = r.lastModified; poll.last = new Date(); poll.lastError = "";
      if (r.status === 304) poll.lambda = s.poll.lambda; // nothing new says nothing about the rate
      await sources.update(s._id, { poll, "stats.items": (s.stats?.items || 0) + n, ...(n ? { "stats.lastItemAt": new Date() } : {}), ...(r.feedTitle && !s.title ? { title: r.feedTitle } : {}) });
      added += n; log(`${s._id}: ${r.status === 304 ? "not modified" : `${r.items.length} items, ${n} new`}; next in ${Math.round(poll.interval / 60)}m`);
    } catch (e) { const poll = schedule.next(s, { failed: true }); poll.lastError = String(e.message || e).slice(0, 200); poll.last = new Date(); await sources.update(s._id, { poll }); log(`${s._id}: ${poll.lastError} (failure ${poll.failures})`); }
  }
  return { polled: due.length, added };
}
export async function extractOne(log = () => {}) {
  const doc = await pipe.claim("content", "extract", EXTRACT_VERSION, { present: true });
  if (!doc) return false;
  try {
    let html = doc.pageHtml || "", title = "";
    if (!html && doc.url) { try { ({ html } = await fetchPage(doc.url)); } catch (e) { log(`${doc._id.slice(0, 8)} ${doc.url}: ${e.message}; using feed content`); } }
    const r = await extract(html, doc.url, doc.html);
    if (!r.text || r.text.length < 200) { await pipe.skip("content", "extract", doc._id, EXTRACT_VERSION, "no usable text"); return true; }
    await pipe.done("content", "extract", doc._id, EXTRACT_VERSION, { text: r.text.slice(0, 60000), extractor: r.extractor, ...(html ? { pageHtml: html } : {}), ...(r.title && !doc.title ? { title: r.title } : {}) });
    log(`${doc._id.slice(0, 8)} extracted ${r.text.length} chars via ${r.extractor}: ${doc.title.slice(0, 60)}`);
  } catch (e) { await pipe.fail("content", "extract", doc._id, e); log(`${doc._id.slice(0, 8)} extract failed: ${e.message}`); }
  return true;
}
