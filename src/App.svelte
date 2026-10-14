<script>
  import { route } from "./lib/router.svelte.js"; import { fire } from "./lib/api.js";
  import Menu from "./lib/Menu.svelte";
  import MapPage from "./pages/Map.svelte"; import Graph from "./pages/Graph.svelte"; import Entity from "./pages/Entity.svelte"; import Prototypes from "./pages/Prototypes.svelte"; import Prototype from "./pages/Prototype.svelte"; import Components from "./pages/Components.svelte"; import Sources from "./pages/Sources.svelte"; import Pipeline from "./pages/Pipeline.svelte"; import Doc from "./pages/Doc.svelte"; import Notes from "./pages/Notes.svelte"; import About from "./pages/About.svelte";
  let v = $state(null); fetch("/version.json").then((r) => (r.ok ? r.json() : null)).then((j) => (v = j)).catch(() => {});
  $effect(() => { fire("hit", { page: route.path.replace(/\/e\/.*/, "/e/").replace(/\/doc\/.*/, "/doc/").replace(/\/prototypes\/.*/, "/prototypes/") }); });
  const page = $derived.by(() => { const p = route.path;
    if (p === "/") return { c: MapPage, full: true }; if (p === "/graph") return { c: Graph, full: true };
    if (p.startsWith("/e/")) return { c: Entity, props: { id: decodeURIComponent(p.slice(3)) } };
    if (p === "/prototypes") return { c: Prototypes }; if (p.startsWith("/prototypes/")) return { c: Prototype, props: { id: decodeURIComponent(p.slice(12)) } };
    if (p === "/components") return { c: Components }; if (p === "/sources") return { c: Sources }; if (p === "/pipeline") return { c: Pipeline };
    if (p.startsWith("/doc/")) return { c: Doc, props: { id: decodeURIComponent(p.slice(5)) } };
    if (p === "/notes") return { c: Notes }; if (p === "/about") return { c: About }; return { c: MapPage, full: true }; });
</script>
<div class="fixed top-3 left-4 z-30 flex items-baseline gap-2"><a href="/" class="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-brand no-underline"><img src="/mark.svg" alt="" width="18" height="18" class="-mt-px" />ontology.monster</a>{#if v}<span class="num text-[10px] text-dim" title={"built from " + v.sha + (v.at ? " · " + v.at : "")}>v{v.version}</span>{/if}</div>
<Menu />
{#if page.full}
  <page.c {...(page.props || {})} />
{:else}
  <main class="mx-auto max-w-3xl px-4 pt-12 pb-24">{#key route.path}<page.c {...(page.props || {})} />{/key}</main>
{/if}
