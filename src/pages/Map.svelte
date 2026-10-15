<script>
  import { rpc, color, TOP } from "../lib/api.js"; import { route, setQuery } from "../lib/router.svelte.js"; import MapView from "../lib/MapView.svelte"; import TimeSlider from "../lib/TimeSlider.svelte"; import EntityCard from "../lib/EntityCard.svelte";
  let bounds = $state(null), from = $state(""), to = $state(""), top = $state(route.q.get("top") || ""), features = $state([]), shapes = $state([]), lines = $state([]), selected = $state(route.q.get("e") || null), n = $state(0), q = $state(""), hits = $state([]), mapRef = $state(null);
  rpc("bounds").then((b) => (bounds = b));
  async function load() { if (!from || !to) return; const [r, sh] = await Promise.all([rpc("located", { from, to, top: top || undefined }), rpc("extents", { from, to, top: top || undefined })]); features = r.features; shapes = sh.features; n = r.features.length; }
  // the selected thing's relations to other placed things, as lines
  $effect(() => { if (!selected) { lines = []; return; } rpc("lines", { id: selected }).then((r) => (lines = r.features)).catch(() => (lines = [])); });
  $effect(() => { void from; void to; void top; load(); setQuery({ top: top || null }); });
  $effect(() => { setQuery({ e: selected || null }); });
  function pick(id) { selected = id; const f = features.find((x) => x.properties.id === id); if (f) mapRef?.flyTo(...f.geometry.coordinates); }
  let timer; function search() { clearTimeout(timer); timer = setTimeout(async () => (hits = q.trim() ? await rpc("search", { q }) : []), 250); }
</script>
<div class="fixed inset-0"><MapView bind:this={mapRef} {features} {shapes} {lines} {selected} onSelect={pick} /></div>
<div class="fixed bottom-3 left-3 right-3 z-20 flex flex-col gap-2 sm:right-auto sm:max-w-2xl">
  <div class="rounded-[4px] bg-paper/90 p-2 backdrop-blur ring-1 ring-line"><TimeSlider {bounds} bind:from bind:to /></div>
  <div class="flex flex-wrap items-center gap-1 rounded-[4px] bg-paper/90 p-2 text-xs backdrop-blur ring-1 ring-line">
    <button class="chip {top === '' ? 'on' : ''}" onclick={() => (top = "")}>all</button>{#each Object.keys(TOP) as k}<button class="chip {top === k ? 'on' : ''}" onclick={() => (top = k)}><span class="mr-1 inline-block h-2 w-2 rounded-full align-middle" style="background:{color(k)}"></span>{k}</button>{/each}
    <span class="num ml-1 text-dim">{n} placed · {shapes.length} regions{#if lines.length} · {lines.length} relations drawn{/if}</span>
    <input class="ml-auto w-40 rounded-[3px] bg-panel px-2 py-0.5 text-xs" placeholder="find a thing" bind:value={q} oninput={search} />
  </div>
  {#if hits.length}<ul class="max-h-48 overflow-y-auto rounded-[4px] bg-paper/95 p-1 text-xs ring-1 ring-line">{#each hits as h}<li><button class="block w-full rounded-[3px] px-2 py-1 text-left hover:bg-panel" onclick={() => { hits = []; q = ""; if (h.location) pick(h.id); else selected = h.id; }}><span class="mr-1 inline-block h-2 w-2 rounded-full" style="background:{color(h.top)}"></span>{h.label} <span class="text-dim">{h.prototype}{h.location ? "" : " · not placed"}</span></button></li>{/each}</ul>{/if}
</div>
{#if selected}<aside class="fixed top-12 right-3 z-20 max-h-[60vh] w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-[4px] bg-paper/95 shadow-lg ring-1 ring-line backdrop-blur sm:top-3 sm:right-12 sm:max-h-[80vh]"><EntityCard id={selected} onClose={() => (selected = null)} onPick={pick} /></aside>{/if}
