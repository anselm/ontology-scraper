// Fetch an item's page and extract its body text. Readability on linkedom via @extractus/article-extractor, with the
// raw html kept so re-extraction never needs the network again. Polite: one request at a time per host is the worker's
// job; this module only fetches and extracts. Returns {html, text, title, extractor, lang} or throws.
import { extractFromHtml } from "@extractus/article-extractor"; import { USER_AGENT } from "../env.mjs";
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<\/(p|div|br|li|h\d|tr)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
export async function fetchPage(url) {
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "accept-encoding": "gzip, br" }, redirect: "follow", signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") || ""; if (!/html|xml/.test(type)) throw new Error(`not html: ${type}`);
  return { html: (await res.text()).slice(0, 2_000_000), finalUrl: res.url };
}
export async function extract(html, url, fallbackHtml = "") {
  let art = null; try { art = await extractFromHtml(html, url); } catch {}
  if (art?.content) { const text = strip(art.content); if (text.length > 400) return { text, title: art.title || "", extractor: "article-extractor", lang: art.ttr ? "" : "" }; }
  const text = strip(fallbackHtml || ""); return { text, title: "", extractor: fallbackHtml ? "feed-content" : "none", lang: "" };
}
