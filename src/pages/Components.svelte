<script>
  // The components: the reusable parts a thing can have. Seeded ones first, with how many things carry each; then the
  // machine's proposals from recurring attribute keys, awaiting a human; then the raw keys themselves.
  import { rpc } from "../lib/api.js";
  let d = $state(null); rpc("components").then((r) => (d = r));
</script>
<h1 class="text-lg font-semibold">Components <span class="text-sm font-normal text-dim">the parts a thing can have</span></h1>
<p class="mt-2 text-sm leading-6 text-dim">An entity is a bare id decorated with components. A component is a normative bundle: the properties a person expects a thing of some sort to have. The seed set is below; the machine proposes new ones from the attribute keys it keeps producing, or proposes fields that an existing one should absorb, and those wait here until accepted.</p>
{#if d}
  {#each [["seed", "Seeded"], ["proposed", "Proposed by the machine"], ["accepted", "Accepted"], ["retired", "Retired"]] as [status, title]}{@const rows = d.components.filter((c) => c.status === status)}{#if rows.length}
    <section class="mt-5"><h2 class="text-base font-semibold">{title}</h2>
      <div class="mt-2 grid gap-2 sm:grid-cols-2">{#each rows as c}<div class="rounded-[4px] bg-panel p-2"><div class="flex items-baseline justify-between"><span class="num font-semibold">{#if c.extends}{c.extends} <span class="font-normal text-dim">+ fields</span>{:else}{c._id}{/if}</span>{#if status === "seed"}<span class="num text-xs text-dim">{c.entities} things</span>{/if}</div><p class="text-xs leading-5 text-dim">{c.doc}</p><dl class="mt-1 text-[11px]">{#each Object.entries(c.fields || {}) as [f, t]}<div><dt class="num inline text-ink">{f}</dt> <dd class="inline text-dim">{t}</dd></div>{/each}</dl>{#if c.prototypes?.length}<p class="mt-1 text-[11px] text-dim">typical of: {c.prototypes.join(", ")}</p>{/if}</div>{/each}</div>
    </section>
  {/if}{/each}
  <section class="mt-6"><h2 class="text-sm font-semibold">Attribute keys the extractor has produced</h2><p class="text-xs text-dim">The raw material for new components: open key/value facts stated about things, counted across all claims.</p><div class="mt-1 flex flex-wrap gap-1">{#each d.attributeKeys as k}<span class="chip num">{k.key} {k.n}</span>{/each}</div></section>
{:else}<p class="mt-4 text-sm text-dim">loading</p>{/if}
