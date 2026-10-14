<script>
  // One document's reading: the machine's summary, the things it named with their verbatim spans, the relations it drew.
  // The article body itself is not here; the link goes to the publisher.
  import { rpc, day, color } from "../lib/api.js";
  let { id } = $props(); let a = $state(null), err = $state("");
  $effect(() => { rpc("analysis", { id }).then((r) => (a = r)).catch((x) => (err = x.message)); });
</script>
{#if err}<p class="text-sm text-dim">{err}</p>{:else if !a}<p class="text-sm text-dim">loading</p>{:else}
<h1 class="text-lg font-semibold"><a href={a.content.url} target="_blank" rel="noopener" class="hover:text-brand">{a.content.title}</a></h1>
<p class="num text-xs text-dim">{a.content.source} · {day(a.content.published)} · read by {a.model} (prompt v{a.promptVersion}{a.coverage === "partial" ? ", partial" : ""}) · tone {a.tone}{#if a.when?.begins} · about {a.when.begins}{a.when.ends ? " → " + a.when.ends : ""}{/if}</p>
<p class="mt-2 text-sm leading-6">{a.summary}</p>
<section class="mt-4"><h2 class="text-xs font-semibold uppercase tracking-wide text-dim">Things named</h2><ul class="mt-1 space-y-2">{#each a.entities as e}<li class="text-sm"><span class="mr-1 inline-block h-2 w-2 rounded-full" style="background:{color(e.kind)}"></span>{#if e.entity}<a href={"/e/" + encodeURIComponent(e.entity.id)} class="font-medium hover:text-brand">{e.name}</a>{:else}<span class="font-medium">{e.name}</span>{/if} <span class="text-xs text-dim">{e.prototype} · {e.kind}{#if e.place && e.kind !== "place"} · at {e.place}{/if}{#each e.roles as r} · {r.office}{r.in ? " of " + r.in : ""}{/each}</span><div class="text-xs text-dim">“{e.span}”</div>{#if e.attributes.length}<div class="text-[11px] text-dim">{e.attributes.map((x) => x.key + ": " + x.value).join(" · ")}</div>{/if}</li>{/each}</ul></section>
<section class="mt-4"><h2 class="text-xs font-semibold uppercase tracking-wide text-dim">Relations drawn</h2><ul class="mt-1 space-y-1 text-sm">{#each a.relations as r}<li>{r.from} <span class="text-dim">{r.surface}</span> {r.to} <span class="num text-[10px] text-dim">{r.predicate} · {r.stance}</span><div class="text-xs text-dim">“{r.quote}”</div></li>{/each}</ul></section>
{/if}
