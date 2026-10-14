<script>
  // The operator view, public: how much sits at each phase and what was read last.
  import { rpc, day } from "../lib/api.js";
  let d = $state(null); const load = () => rpc("pipeline").then((r) => (d = r)); load(); const t = setInterval(load, 20000); $effect(() => () => clearInterval(t));
  const order = ["unset", "pending", "running", "done", "skipped", "failed"];
</script>
<h1 class="text-lg font-semibold">Pipeline <span class="text-sm font-normal text-dim">phases over a document store, picked by status</span></h1>
<p class="mt-2 text-sm leading-6 text-dim">Nothing is a queue. Every document carries a status per phase; a worker claims one, does the phase, writes the result. Fetch → extract → analyze → resolve, then link and embed on entities, and an induction pass over the whole vocabulary when enough has accumulated. Changing a phase's version marks everything dirty for that phase alone.</p>
{#if d}
  <div class="mt-4 flex flex-wrap gap-1 text-[11px]">{#each Object.entries(d.counts) as [k, v]}<span class="chip num">{k} {v}</span>{/each}</div>
  <table class="mt-3 text-xs"><thead><tr class="text-left text-dim"><th class="pr-3">phase</th>{#each order as s}<th class="num pr-3">{s}</th>{/each}</tr></thead><tbody>{#each Object.entries(d.phases) as [phase, counts]}<tr class="border-t border-line"><td class="num py-1 pr-3">{phase}</td>{#each order as s}<td class="num pr-3 {s === 'failed' && counts[s] ? 'text-red-500' : ''}">{counts[s] || ""}</td>{/each}</tr>{/each}</tbody></table>
  <h2 class="mt-5 text-sm font-semibold">Read most recently</h2>
  <ul class="mt-1 space-y-1 text-sm">{#each d.latest as c}<li><a href={"/doc/" + c.id} class="hover:text-brand">{c.title}</a> <span class="num text-xs text-dim">{c.source} · {day(c.published)} · {c.entities} things</span></li>{/each}</ul>
{:else}<p class="mt-4 text-sm text-dim">loading</p>{/if}
