<script>
  // The compact detail shown beside the map and the graph: what it is, where and when, what the sources said, what it relates to.
  import { rpc, day, color } from "./api.js";
  let { id, onClose = () => {}, onPick = () => {} } = $props();
  let e = $state(null), err = $state("");
  $effect(() => { e = null; err = ""; rpc("entity", { id }).then((r) => (e = r)).catch((x) => (err = x.message)); });
</script>
<div class="flex h-full flex-col text-sm">
  <div class="flex items-start justify-between gap-2 border-b border-line p-3">
    {#if e}<div class="min-w-0"><div class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full" style="background:{color(e.top)}"></span><a href={"/e/" + encodeURIComponent(e.id)} class="truncate font-semibold hover:text-brand">{e.label}</a></div><div class="text-xs text-dim">{e.prototype} · {e.top}{#if e.location} · {e.location.method === "wikidata" ? "gazetteer" : "approx."} {e.location.lat.toFixed(2)}, {e.location.lon.toFixed(2)} ±{Math.round(e.location.rad / 1000)} km{/if}</div></div>{:else}<div class="text-dim">{err || "loading"}</div>{/if}
    <button class="btn" onclick={onClose} aria-label="close">×</button>
  </div>
  {#if e}
  <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
    {#if e.description}<p class="leading-6">{e.description}</p>{/if}
    <div class="flex flex-wrap gap-1 text-[11px]"><span class="chip num">{e.mentions} mention{e.mentions === 1 ? "" : "s"}</span><span class="chip num">{day(e.firstSeen)} → {day(e.lastSeen)}</span>{#if e.identity?.wikidata}<a class="chip" href={"https://www.wikidata.org/wiki/" + e.identity.wikidata} target="_blank" rel="noopener">{e.identity.wikidata}</a>{/if}{#each e.kinds as k}<a class="chip" href={"/prototypes/" + encodeURIComponent(k.prototype)} title={"score " + k.score.toFixed(2) + " · " + k.rank}>{k.label}</a>{/each}</div>
    {#if e.relations.length}<div><h3 class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-dim">Relations</h3><ul class="space-y-1">{#each e.relations as r}<li class="text-xs"><button class="text-left hover:text-brand" onclick={() => onPick(r.from.id === e.id ? r.to.id : r.from.id)}><span class={r.from.id === e.id ? "text-dim" : ""}>{r.from?.label}</span> <span class="text-dim">{r.surface || r.predicate}</span> <span class={r.to.id === e.id ? "text-dim" : ""}>{r.to?.label}</span></button></li>{/each}</ul></div>{/if}
    {#if e.claims.length}<div><h3 class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-dim">Stated</h3><ul class="space-y-0.5">{#each e.claims.slice(0, 12) as c}<li class="text-xs"><span class="num text-dim">{c.field}</span> {c.value} <span class="num text-[10px] text-dim">{day(c.publishedAt)}</span></li>{/each}</ul></div>{/if}
    <div><h3 class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-dim">Sources</h3><ul class="space-y-1.5">{#each e.sources.slice(0, 8) as s}<li class="text-xs leading-5"><a href={s.url} target="_blank" rel="noopener" class="text-brand">{s.title}</a> <span class="num text-dim">{day(s.published)}</span>{#if s.quote}<br /><span class="text-dim">“{s.quote}”</span>{/if}</li>{/each}</ul></div>
  </div>
  {/if}
</div>
