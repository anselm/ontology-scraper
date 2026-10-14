<script>
  // A window onto time: a width (1 day to everything) and a position for its end. Deep-linkable through the query string.
  import { day } from "./api.js";
  let { bounds, from = $bindable(), to = $bindable() } = $props();
  const WIDTHS = [["1d", 1], ["3d", 3], ["7d", 7], ["30d", 30], ["90d", 90], ["all", 0]];
  let width = $state(7);
  const lo = $derived(bounds?.from ? new Date(bounds.from).getTime() : Date.now() - 30 * 864e5), hi = $derived(bounds?.to ? Math.max(new Date(bounds.to).getTime(), Date.now()) : Date.now());
  let pos = $state(1); // 0..1 across [lo, hi] for the window's end
  function apply() { const end = width ? lo + pos * (hi - lo) : hi; to = new Date(end).toISOString(); from = width ? new Date(end - width * 864e5).toISOString() : new Date(lo).toISOString(); }
  $effect(() => { void lo; void hi; apply(); });
</script>
<div class="flex flex-wrap items-center gap-2 text-xs">
  <div class="flex gap-1">{#each WIDTHS as [label, d]}<button class="chip {width === d ? 'on' : ''}" onclick={() => { width = d; apply(); }}>{label}</button>{/each}</div>
  <input type="range" min="0" max="1" step="0.001" bind:value={pos} oninput={apply} disabled={!width} class="h-1 w-40 accent-brand sm:w-64" aria-label="window end" />
  <span class="num text-dim">{day(from)} → {day(to)}</span>
</div>
