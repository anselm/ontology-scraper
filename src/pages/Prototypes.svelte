<script>
  // The vocabulary of kinds: five rigid top kinds, under each the soft prototypes the machine has proposed, with counts
  // and the typical components of each. Merged and role-like ones are shown struck or flagged, never hidden.
  import { rpc, color } from "../lib/api.js";
  let d = $state(null); rpc("prototypes").then((r) => (d = r));
  const under = (top) => d.prototypes.filter((p) => p.top === top && p.status !== "merged" && p.status !== "top");
  const merged = $derived(d ? d.prototypes.filter((p) => p.status === "merged") : []);
  const bundle = (b) => Object.entries(b).filter(([, v]) => v >= 0.3).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(" · ");
</script>
<h1 class="text-lg font-semibold">Prototypes <span class="text-sm font-normal text-dim">the kinds of things, as proposed by the machine</span></h1>
<p class="mt-2 text-sm leading-6 text-dim">Five top kinds are fixed. Everything below them is a prototype the extractor named while reading; the induction pass merges synonyms, proposes broader kinds and flags labels that are really roles. Each prototype shows how many things it holds and which components its things typically carry.</p>
{#if d}
  {#each Object.entries(d.top) as [top, doc]}
    <section class="mt-5"><h2 class="flex items-center gap-2 text-base font-semibold"><span class="h-3 w-3 rounded-full" style="background:{color(top)}"></span>{top} <span class="text-xs font-normal text-dim">{doc}</span></h2>
      <ul class="mt-2 grid gap-1 sm:grid-cols-2">{#each under(top) as p}<li class="rounded-[4px] bg-panel px-2 py-1 text-sm"><a href={"/prototypes/" + encodeURIComponent(p.id)} class="font-medium hover:text-brand">{p.label}</a> <span class="num text-xs text-dim">{p.instances}</span>{#if p.roleLike}<span class="chip ml-1">role?</span>{/if}{#if p.status === "intermediate"}<span class="chip ml-1">proposed</span>{/if}{#if p.broader?.[0] && !p.broader[0].id.startsWith("top:")}<span class="text-xs text-dim"> ⊂ {p.broader[0].id.replace("proto:", "").replace(/-/g, " ")}</span>{/if}{#if Object.keys(p.bundle).length}<div class="text-[11px] text-dim">{bundle(p.bundle)}</div>{/if}</li>{/each}</ul>
    </section>
  {/each}
  {#if merged.length}<section class="mt-6"><h2 class="text-sm font-semibold text-dim">Merged away</h2><p class="text-xs text-dim">{#each merged as p, i}{i ? ", " : ""}<s>{p.label}</s> → {p.mergedInto.replace("proto:", "").replace(/-/g, " ")}{/each}</p></section>{/if}
{:else}<p class="mt-4 text-sm text-dim">loading</p>{/if}
