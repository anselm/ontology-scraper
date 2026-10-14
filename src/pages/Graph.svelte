<script>
  import { rpc, color, TOP } from "../lib/api.js"; import { route, setQuery } from "../lib/router.svelte.js"; import GraphView from "../lib/GraphView.svelte"; import TimeSlider from "../lib/TimeSlider.svelte"; import EntityCard from "../lib/EntityCard.svelte";
  let bounds = $state(null), from = $state(""), to = $state(""), top = $state(route.q.get("top") || ""), g = $state({ nodes: [], edges: [] }), selected = $state(route.q.get("e") || null), limit = $state(120);
  rpc("bounds").then((b) => (bounds = b));
  async function load() { if (!from || !to) return; g = await rpc("graph", { from, to, top: top || undefined, limit, id: selected || undefined }); }
  $effect(() => { void from; void to; void top; void limit; load(); setQuery({ top: top || null }); });
  function pick(id) { selected = id; setQuery({ e: id }); if (!g.nodes.some((n) => n.id === id)) load(); }
</script>
<div class="fixed inset-0 pt-10"><GraphView nodes={g.nodes} edges={g.edges} {selected} onSelect={pick} /></div>
<div class="fixed bottom-3 left-3 right-3 z-20 flex flex-col gap-2 sm:right-auto sm:max-w-2xl">
  <div class="rounded-[4px] bg-paper/90 p-2 backdrop-blur ring-1 ring-line"><TimeSlider {bounds} bind:from bind:to /></div>
  <div class="flex flex-wrap items-center gap-1 rounded-[4px] bg-paper/90 p-2 text-xs backdrop-blur ring-1 ring-line">
    <button class="chip {top === '' ? 'on' : ''}" onclick={() => (top = "")}>all</button>{#each Object.keys(TOP) as k}<button class="chip {top === k ? 'on' : ''}" onclick={() => (top = k)}><span class="mr-1 inline-block h-2 w-2 rounded-full align-middle" style="background:{color(k)}"></span>{k}</button>{/each}
    <span class="num ml-1 text-dim">{g.nodes.length} things · {g.edges.length} relations</span>
    <select class="ml-auto rounded-[3px] bg-panel px-1 py-0.5 text-xs" bind:value={limit}><option value={60}>60</option><option value={120}>120</option><option value={250}>250</option><option value={500}>500</option></select>
  </div>
</div>
{#if selected}<aside class="fixed top-12 right-3 z-20 max-h-[60vh] w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-[4px] bg-paper/95 shadow-lg ring-1 ring-line backdrop-blur sm:top-3 sm:right-12 sm:max-h-[80vh]"><EntityCard id={selected} onClose={() => { selected = null; setQuery({ e: null }); }} onPick={pick} /></aside>{/if}
