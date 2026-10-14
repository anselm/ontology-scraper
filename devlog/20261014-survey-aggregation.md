# 2026-10-14 — Survey: aggregation, feeds, polling and sources

Literature and registry survey written 2026-10-14 by a research agent
(Claude) at the start of the project, before any code. Feed URLs marked
verified returned items by curl from canada1 that day; the rest are not.
Judgements are labelled. Point in time: registry versions and feed
availability will drift. The synthesis and decisions are in
`20261014-architecture.md`.


## 1. Existing aggregator stacks

| Project | Licence / stack | Notable | Reuse? |
|---|---|---|---|
| Miniflux | Apache-2.0, Go, PostgreSQL only (https://github.com/miniflux/v2) | Adaptive scheduler, HTTP cache headers, Readability scraper with CSS rules, REST API | Best poller here, but it is a reader with read-state semantics, not a corpus store |
| FreshRSS | AGPL-3.0, PHP (https://github.com/FreshRSS/FreshRSS) | WebSub receiver, basic XPath scraping | No (AGPL, PHP) |
| Huginn | MIT, Rails, maintained "in spare time" (https://github.com/huginn/huginn) | Agent graph: RSS, website-change, webhook agents | Framework-shaped; you live inside it |
| Feedbin | MIT, Rails; built as a hosted service "rather than something to self-host in production"; companion `extract` is a Node full-text service (https://github.com/feedbin/feedbin) | README says nothing about polling | No |
| NewsBlur | MIT, Django, MongoDB for stories, Celery, Node text-extraction services (https://github.com/samuelclay/NewsBlur) | Closest stack shape to yours | Too large; copy ideas |
| Tiny Tiny RSS | GPL-3.0, PHP; tt-rss.org retired 2025-11-01, development continues at a fork made 2025-10-03 (https://github.com/tt-rss/tt-rss) | Stable | No |
| GDELT | "unlimited and unrestricted use for any academic, commercial, or governmental use", redistribution allowed with citation and link (https://www.gdeltproject.org/about.html); 2.0 updates every 15 min; GKG and Global Entity Graph are derived records with 600-char snippets, not article text (https://www.gdeltproject.org/data.html) | Breadth, BigQuery | As an entity source to reconcile against, yes; as text, no |
| CC-NEWS | Daily WARCs under `crawl-data/CC-NEWS/`, crawled with StormCrawler (https://commoncrawl.org/blog/news-dataset-available); ToU: you bear copyright risk and indemnify CC for AI use (https://commoncrawl.org/terms-of-use) | Bulk history | Backfill experiments only |
| NewsAPI | Free tier 100 req/day, 24 h delay, "cannot be used in a staging or production environment (including internally)"; Business $449/month; no plan includes article content (https://newsapi.org/pricing) | — | No |
| Feedly | Basic polls "30 minutes to 1 day", Pro "15 minutes and an hour", Pro+/Enterprise "as low as 7 minutes"; PuSH sources near-real-time (https://docs.feedly.com/article/212-how-often-does-feedly-update) | Interval benchmark | Not a component |
| Superfeedr | Site still up (https://superfeedr.com/); subscriber docs footer reads 2009–2018 (https://documentation.superfeedr.com/subscribers.html) | Hosted WebSub + polling | I would not build on it |

All the self-hosted readers were pushed within the last week (GitHub API, 2026-10-14: miniflux, FreshRSS, NewsBlur 10-14; huginn 10-13; feedbin 10-12; tt-rss 10-11). None is abandoned.

### Write our own?

Against: Miniflux already holds the hard-won pieces — an adaptive scheduler with defaults (min 5 min, max 24 h, parsing-error limit 3, per-host concurrency cap, honouring `Cache-Control`/`Expires`) (https://miniflux.app/docs/configuration.html), a GUID-collision strategy whose source comment reads like a scar ("some feeds ship the same GUID for every entry"), and tombstones so archived entries are "not re-ingested" (https://github.com/miniflux/v2, `internal/reader/rss/adapter.go`, `internal/storage/entry.go`). Each is a bug you would otherwise rediscover. You could run it as a sidecar and consume its REST API.

For, which I find stronger: readers store user read-state, not a corpus, and require Postgres or MySQL beside your Mongo; you need raw body, fetch headers, hash and phase flags on each document, which a reader's API does not expose; and the fetch+normalize layer is small once the parsers (section 2) and the scheduling policy (section 3) are settled. My judgement: write the fetcher, but copy Miniflux's rules literally rather than re-derive them. If you ever start writing a reader UI, stop and run Miniflux.

## 2. Node libraries

Registry data from `registry.npmjs.org`, repo activity from the GitHub API, both 2026-10-14.

**Feed parsing**

| Package | Latest / published | Deps, engines | Notes |
|---|---|---|---|
| `rss-parser` | 3.13.0 / 2023-04-11 | `entities`, `xml2js` | Repo pushed 2026-08-25 but no release in 3.5 years |
| `feedparser` | 2.6.0 / 2026-05-18 | `sax`, `readable-stream`, `lodash.*`; node ≥10.18.1 | Streaming RSS/Atom/RDF; recently revived (changelog not fetched) |
| `@rowanmanning/feed-parser` | 2.1.5 / 2026-09-09 | `fast-xml-parser`, `html-entities`; node 20–26 | Self-described "well-tested and resilient"; 50 stars |
| `feedsmith` | 3.0.1 / 2026-09-25 | `entities`, `fast-xml-parser` | Registry data only; README not read |

Spec-level gotchas: RSS `guid` and `pubDate` are both optional and the RSS Profile gives no fallback for either (https://www.rssboard.org/rss-profile); JSON Feed says "any item without an id must be discarded" and lets readers substitute parse time for a bad date (https://www.jsonfeed.org/version/1.1/). All four parsers are thin wrappers on an XML parser; the value is in your normalizer. Substack feeds are RSS 2.0 with full `content:encoded`, `dc:creator` and an image `enclosure` (https://anselm.substack.com/feed, verified). HN's feed carries only title, link and a "Comments" link (https://news.ycombinator.com/rss, verified).

**Full-text extraction**

| Package | Latest / published | Deps | Status |
|---|---|---|---|
| `@mozilla/readability` | 0.6.0 / 2025-03-03 | none; needs a DOM | Apache-2.0; repo pushed 2026-08-04 (https://github.com/mozilla/readability) |
| `defuddle` | 0.19.5 / 2026-10-10 | `commander`, `mathml-to-latex` | MIT; "very much a work in progress"; `defuddle/node` accepts any DOM, examples use linkedom; ESM only (https://github.com/kepano/defuddle) |
| `@extractus/article-extractor` | 9.0.1 / 2026-08-20 | `@mozilla/readability`, `linkedom` | MIT, "maintained in my spare time"; per-site transforms, custom fetcher, sanitizer (https://github.com/extractus/article-extractor) |
| `@postlight/parser` | 2.2.3 / 2022-10-24 | jquery, cheerio, moment, postman-request… (17) | Repo last pushed 2024-07-10 (https://github.com/postlight/parser) |
| `jsdom` | 30.1.2 / 2026-10-04 | 20 deps; node ^22.22.2, ^24.15, ≥26 | MIT |
| `linkedom` | 0.18.13 / 2026-07-07 | htmlparser2, css-select | ISC |
| trafilatura (Python) | repo pushed 2026-10-06 | — | Apache-2.0 since 1.8.0; own extractor with jusText and readability-lxml fallbacks; feed/sitemap discovery; claims to beat other open-source extractors on its benchmark (https://trafilatura.readthedocs.io/en/latest/) |

Gotchas, sourced: Readability's `parse()` mutates the document, so use a clone or a fresh DOM; `isProbablyReaderable` yields false positives and negatives; Mozilla recommends DOMPurify on output and no script execution in jsdom (https://github.com/mozilla/readability). A vendor review (competing product, disclosed) measured sibling leakage — blocks over 80 chars with link density below 0.25 are kept, so promos leak — and `isProbablyReaderable` false for list-only content at every threshold; it quotes precision 0.914 / recall 0.982 for 0.6.0 (https://thunderbit.com/blog/mozilla-readability-review). Defuddle is "more lenient, removing fewer elements it's unsure about" (https://github.com/kepano/defuddle).

My recommendation: `@extractus/article-extractor` as default (Readability on linkedom with sanitizer and per-site hooks already wired), Defuddle as the second opinion when the result looks like boilerplate, raw HTML kept so re-extraction is free. Postlight is not worth adopting in 2026. Trafilatura is strongest on paper but costs a Python sidecar; only if a measured sample shows the Node pair failing.

## 3. Polling practice

- **Conditional GET.** RFC 9110 §13.2.2: `If-None-Match` is evaluated before `If-Modified-Since`; a false `If-None-Match` on GET yields 304 (https://www.rfc-editor.org/rfc/rfc9110.txt). Send both, store both validators per feed.
- **Backoff.** Brooker's comparison: full jitter does the least work, decorrelated finishes slightly sooner, equal jitter is weakest; AWS SDKs now default to jittered backoff (https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/). Miniflux adds a hard stop: after 3 parse errors the feed is not polled until a human acts (https://miniflux.app/docs/configuration.html). Do both.
- **Adaptive intervals.** Miniflux `entry_frequency`: interval from the feed's average update frequency over the past week, clamped 5 min–24 h (https://miniflux.app/docs/configuration.html). Feedly ties interval to "how popular the site is and how often it publishes" (https://docs.feedly.com/article/212-how-often-does-feedly-update). Theory: model each source as Poisson with rate λ, estimate λ ≈ changed observations / sum of intervals ("biased lower bound"), optimal refresh scales with λ weighted by value (https://crawl-frontier.readthedocs.io/en/opic/topics/scheduler-optimal.html). Urbansky et al., ICWSM 2011, tested learned polling on 180,000 feeds over three weeks and report much less traffic with near-real-time updates (https://ojs.aaai.org/index.php/ICWSM/article/view/14161). Practical: next = clamp(k/λ̂, 5 min, 24 h) × jitter.
- **WebSub.** W3C Recommendation dated 2026-06-02; discovery via `Link rel="hub"` and `rel="self"`; hub verifies with `hub.challenge`; leases expire, hubs "cannot issue perpetual leases"; hub POSTs full content with an HMAC `X-Hub-Signature` if you set `hub.secret` (https://www.w3.org/TR/websub/). Implement as a receiver once a fastify endpoint is public; polling stays the fallback.
- **robots.txt.** RFC 9309: 4xx means unrestricted, 5xx means "complete disallow", cache at most 24 h, parse at least 500 KiB, follow at least five redirects; it is "not a form of access authorization" and does not mention feeds (https://www.rfc-editor.org/rfc/rfc9309.html). Product tokens are letters, underscores, hyphens only, so call the UA `ontology-scraper` plus a URL or mailto. arXiv asks for one request every three seconds, one connection (https://info.arxiv.org/help/api/tou.html).
- **Dedup and dates.** Miniflux: SHA-256 of GUID; repeated GUID within a feed → GUID|URL, then GUID|position; no GUID → URL; else title+content; unique index `(feed_id, hash)`; missing `pubDate`/`dc:date` → `time.Now()`; Atom uses `id`, else the original link (https://github.com/miniflux/v2, `internal/reader/rss/adapter.go`, `internal/database/migrations.go`). Store fetch time separately from claimed date and never sort on the latter alone.
- **Gone, not deleted.** Miniflux `ArchiveEntries` "records tombstones so they are not re-ingested" (https://github.com/miniflux/v2, `internal/storage/entry.go`); Nutch marks `DB_GONE` on 404 and lets the indexer delete (https://cwiki.apache.org/confluence/display/NUTCH/NutchTutorial). A `gone` status with reason, never a row delete.

## 4. Sources

Verified feeds (item counts from today's fetch):

| Source | URL | Notes |
|---|---|---|
| BBC World, top | https://feeds.bbci.co.uk/news/world/rss.xml, https://feeds.bbci.co.uk/news/rss.xml | RSS 2.0, 28 / 31. Terms: feed may be added to a site with credit; "not allowed to pluck metadata from our content or RSS feeds"; AI training or "computer analysis" needs permission; business use of feeds needs permission, maybe a fee (https://www.bbc.co.uk/usingthebbc/terms-of-use/) |
| ABC Australia "Just In" | https://www.abc.net.au/news/feed/51120/rss.xml | RSS 2.0, 25; feed 52278 was 404 |
| NPR World, News | https://feeds.npr.org/1004/rss.xml, https://feeds.npr.org/1001/rss.xml | RSS 2.0, 10 each |
| DW top, all | https://rss.dw.com/rdf/rss-en-top, https://rss.dw.com/rdf/rss-en-all | RSS 1.0 RDF, 21 / 139 — parser must handle RDF |
| NHK (Japanese) | https://www3.nhk.or.jp/rss/news/cat0.xml | RSS 2.0, 7; `lastBuildDate` Aug 2026, possibly stale. NHK World English: unverified (timeouts, 404) |
| NYT World, Home | https://rss.nytimes.com/services/xml/rss/nyt/World.xml, …/HomePage.xml | RSS 2.0, 56 / 20. Terms: "personal use in a news reader or as part of a non-commercial blog"; commercial use needs written permission (https://www.nytimes.com/rss) |
| Al Jazeera | https://www.aljazeera.com/xml/rss/all.xml | RSS 2.0, 25; terms not fetched |
| Guardian World | https://www.theguardian.com/world/rss | RSS 2.0, 45. Open Platform developer key: non-commercial, 1 call/s, 500 calls/day, article text included; commercial key explicitly covers "text and data mining solutions" and "training models for generative artificial intelligence" (https://open-platform.theguardian.com/access/); terms page 404 |
| arXiv | https://rss.arxiv.org/rss/cs.CL (642), https://rss.arxiv.org/atom/cs.AI | Daily at midnight ET; multi-category capped at 2,000 (https://info.arxiv.org/help/rss.html). Metadata CC0; e-prints copyrighted, must not be re-served (https://info.arxiv.org/help/api/tou.html) |
| Substack | https://anselm.substack.com/feed (`<name>.substack.com/feed`) | Full `content:encoded` |
| Hacker News | https://news.ycombinator.com/rss; https://hnrss.org/frontpage (third party, 20) | API: "currently no rate limit", MIT, no article text (https://github.com/HackerNews/API) |
| Wikipedia Current events | `https://en.wikipedia.org/w/api.php?action=parse&page=Portal:Current_events/2026_October_13&prop=wikitext&format=json` | Daily subpages by category, each bullet citing press sources (https://en.wikipedia.org/wiki/Wikipedia:Current_events). No feed, but machine-readable and every bullet links its source: the best seed list I found |
| ReliefWeb | https://reliefweb.int/updates/rss.xml (20) | API v1 decommissioned (410); v2 needs a pre-approved `appname` since 2025-11-01, 1,000 calls/day (https://apidoc.reliefweb.int/) |
| UN News | https://news.un.org/feed/subscribe/en/news/all/rss.xml | RSS 2.0, 30 |
| gov.uk news | https://www.gov.uk/search/news-and-communications.atom | Atom, 20 |
| Nature | https://www.nature.com/nature.rss | RDF, 75; news-and-views feed loops through an IdP redirect |
| Science | https://www.science.org/rss/news_current.xml | RDF, 10 |
| Quanta | https://www.quantamagazine.org/feed/ | RSS 2.0, 5 |
| gCaptain | https://gcaptain.com/feed/ | RSS 2.0, 12 |
| War on the Rocks | https://warontherocks.com/feed/ | RSS 2.0, 100 |

Unavailable or unverified: **AP** — three apnews.com feed URLs returned 403 (search snippets say the feeds stopped working in 2024; not fetched). **Reuters** — `/world/rss` 401, `feeds.reuters.com` does not resolve. **CBC** — both `cbc.ca/webfeed/rss/*` URLs failed from this box (HTTP/2 error, then timeouts); cause unknown. **Lawfare** — 403 on `/feeds/all`, `/rss`, `/feed`. **Lloyd's List** — `/rss` 500, homepage mentions no feed. **Wikinews** — closed: "Wikinews has been made read-only" after the WMF decision announced March 30 (https://en.wikinews.org/wiki/Main_Page). **whitehouse.gov/feed** 404; Federal Register RSS 500.

Storing full text: BBC and NYT terms do not permit an internal corpus for machine analysis without permission; the Guardian names TDM as a commercial-key use; GDELT is unrestricted; arXiv metadata is CC0. My reading, not legal advice: store bodies privately for extraction, publish only entities, snippets and links, and keep a per-source `terms` field so a source's bodies can be purged.

## 5. Phased pipelines over a document store

This is crawler literature. Nutch: a CrawlDb with "information about every URL known to Nutch, including whether it was fetched, and, if so, when", cycle generate → fetch → parse → updatedb, `DB_GONE`, content digests for dedup (https://cwiki.apache.org/confluence/display/NUTCH/NutchTutorial). StormCrawler, which crawls CC-NEWS, is the streaming form: URLs as a Storm stream, status in OpenSearch/Solr/SQL, politeness built in (https://stormcrawler.apache.org/). Both are status-per-document with phases picking work by status — a dirty-flag design with a scheduler, not a job queue.

Event sourcing buys rebuild and temporal queries at the cost of replay speed, gateways to suppress external effects during replay, and messy bi-temporal bug fixes; Fowler says avoid it unless you need those (https://martinfowler.com/eaaDev/EventSourcing.html). Mongo change streams need a replica set, resume by token, and fail once the oplog has rolled past the token; the docs do not state delivery semantics (https://www.mongodb.com/docs/manual/changeStreams/). The transactional-outbox pattern appeared only in search snippets, unverified.

What rots — my judgement:

1. Dirty flags rot least when each document carries `phase.<name>: {status, at, attempt, error}` and workers claim with an atomic `findOneAndUpdate` lease. What rots is unbounded retry: without Miniflux's error limit and Nutch's `DB_GONE`, the same 50 broken documents are reprocessed forever.
2. Job queues rot at the join: queue and document disagree after a crash. Fine for fan-out, bad as the source of truth.
3. Event sourcing rots at replay: three years of HTML through a parser that no longer exists.
4. Change streams are a trigger, not a ledger; a consumer down past the oplog window loses events, so a periodic sweep over phase status must remain.

## Recommendations

1. Write fetch+normalize in Node; copy Miniflux's rules verbatim: hash chain, `(source, hash)` unique index, parsing-error limit 3, 5 min–24 h clamp, honour `Cache-Control`.
2. Parser: `@rowanmanning/feed-parser` (active, two deps, current Node), with RDF fixtures (DW, Nature, Science) from day one; `feedparser` 2.6.0 as fallback.
3. Extraction: `@extractus/article-extractor`, fresh linkedom document per page, sanitized output, raw HTML kept in its own collection.
4. Scheduling: Poisson estimate per source, full-jitter backoff on transport errors, hard stop on parse errors, `gone` with reason, fetch time separate from claimed date.
5. Seeds: the verified table plus Wikipedia Current events as a discovery source; AP, Reuters, Lawfare, CBC, Lloyd's are "no feed" until proven otherwise.
6. Pipeline: phase-status fields plus a sweeper; change streams only as a wake-up; no event sourcing.
