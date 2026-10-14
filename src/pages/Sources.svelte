<script>
  import { rpc, ago, day } from "../lib/api.js";
  let rows = $state(null); rpc("sources").then((r) => (rows = r));
</script>
<h1 class="text-lg font-semibold">Sources <span class="text-sm font-normal text-dim">what is read, and how it is going</span></h1>
<p class="mt-2 text-sm leading-6 text-dim">Feeds from public broadcasters, institutions, science journals and a few specialist outlets. Each is polled at a rate learned from how often it posts, backed off on failure, stopped after three unparseable fetches. Sources whose terms forbid machine reading are listed under review and not polled. Article bodies are kept privately for extraction and never shown here; readers get short quotes and links.</p>
{#if rows}
<table class="mt-4 w-full text-xs"><thead><tr class="text-left text-dim"><th class="pr-2">source</th><th class="pr-2">status</th><th class="num pr-2">items</th><th class="pr-2">last</th><th class="pr-2">next</th><th>note</th></tr></thead><tbody>
{#each rows as s}<tr class="border-t border-line align-top {s.status !== 'active' ? 'opacity-60' : ''}"><td class="py-1 pr-2"><a href={s.url} target="_blank" rel="noopener" class="hover:text-brand">{s.title}</a><div class="text-dim">{s.publisher}{#if s.tags?.length} · {s.tags.join(", ")}{/if}</div></td><td class="pr-2">{s.status}{#if s.poll?.failures}<span class="text-red-500"> ×{s.poll.failures}</span>{/if}</td><td class="num pr-2">{s.stats?.items || 0}</td><td class="num pr-2">{ago(s.poll?.last)}</td><td class="num pr-2">{s.status === "active" ? (s.poll?.next ? Math.max(0, Math.round((new Date(s.poll.next) - Date.now()) / 60000)) + "m" : "") : ""}</td><td class="text-dim">{s.poll?.lastError || s.terms || s.note}</td></tr>{/each}
</tbody></table>
{:else}<p class="mt-4 text-sm text-dim">loading</p>{/if}
