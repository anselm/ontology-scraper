<script>
  import { rpc, color } from "../lib/api.js";
  let { id } = $props(); let p = $state(null), err = $state("");
  $effect(() => { rpc("prototype", { id }).then((r) => (p = r)).catch((x) => (err = x.message)); });
</script>
{#if err}<p class="text-sm text-dim">{err}</p>{:else if !p}<p class="text-sm text-dim">loading</p>{:else}
<h1 class="flex items-center gap-2 text-lg font-semibold"><span class="h-3 w-3 rounded-full" style="background:{color(p.top)}"></span>{p.label} <span class="num text-sm font-normal text-dim">{p.instances} things</span></h1>
<p class="text-sm text-dim">a kind of {#each p.broader as b, i}{i ? ", " : ""}<a href={b.id.startsWith("top:") ? "/prototypes" : "/prototypes/" + encodeURIComponent(b.id)} class="hover:text-brand">{b.id.replace(/^(top|proto):/, "").replace(/-/g, " ")}</a> <span class="num text-[10px]">{Math.round(b.confidence * 100)}%</span>{/each}{#if p.altLabel.length} · also called {p.altLabel.join(", ")}{/if}</p>
{#if p.narrower.length}<p class="mt-1 text-sm text-dim">narrower: {#each p.narrower as n, i}{i ? ", " : ""}<a href={"/prototypes/" + encodeURIComponent(n.id)} class="hover:text-brand">{n.label}</a> <span class="num text-[10px]">{n.instances}</span>{/each}</p>{/if}
<section class="mt-4"><h2 class="text-xs font-semibold uppercase tracking-wide text-dim">Normative bundle <span class="font-normal normal-case">(share of its things carrying each component)</span></h2>
  <div class="mt-1 flex flex-wrap gap-1">{#each Object.entries(p.bundle).sort((a, b) => b[1] - a[1]) as [k, v]}<span class="chip num" style="opacity:{0.4 + v * 0.6}">{k} {Math.round(v * 100)}%</span>{/each}{#each Object.entries(p.attributeKeys).sort((a, b) => b[1] - a[1]) as [k, v]}<span class="chip num" style="opacity:{0.4 + v * 0.6}">{k} {Math.round(v * 100)}%</span>{/each}{#if !Object.keys(p.bundle).length}<span class="text-xs text-dim">not yet computed; the induction pass runs as things accumulate</span>{/if}</div></section>
<section class="mt-4"><h2 class="text-xs font-semibold uppercase tracking-wide text-dim">Things</h2><ul class="mt-1 grid gap-1 sm:grid-cols-2">{#each p.examples as e}<li class="text-sm"><a href={"/e/" + encodeURIComponent(e.id)} class="hover:text-brand">{e.label}</a> <span class="num text-xs text-dim">{e.mentions}</span>{#if e.description}<div class="truncate text-xs text-dim">{e.description}</div>{/if}</li>{/each}</ul></section>
{/if}
