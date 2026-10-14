<script>
  import { NOTES } from "../notes.js"; import { route } from "../lib/router.svelte.js";
  const open = $derived(route.q.get("n") || "");
  const shown = $derived(open ? NOTES.filter((n) => n.slug === open) : NOTES);
</script>
<h1 class="text-lg font-semibold">Notes <span class="text-sm font-normal text-dim">the thinking, as it moves</span></h1>
<p class="mt-2 text-sm leading-6 text-dim">Dated, newest first, written for a reader who did not watch. The working log behind them, with the surveys and every decision, is the <a href="https://github.com/anselm/ontology-scraper/tree/main/devlog" class="text-brand">devlog in the repository</a>.</p>
{#if open}<p class="mt-2 text-xs"><a href="/notes" class="text-brand">all notes</a></p>{/if}
{#each shown as n}
  <article class="prose-notes mt-6 border-t border-line pt-4"><div class="num text-xs text-dim">{n.date}</div><h2 class="!mt-1 text-base font-semibold"><a href={"/notes?n=" + n.slug} class="hover:text-brand">{n.title}</a></h2>{@html n.html}</article>
{/each}
