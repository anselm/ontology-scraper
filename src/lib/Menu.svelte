<script>
  // the one floating control: a top-right menu. It starts open and stays open across pages, because a bare
  // hamburger confused first-time readers (Anselm, 2026-11-07); closing it is remembered for the session.
  import { route } from "./router.svelte.js";
  const remembered = () => { try { return sessionStorage.getItem("menu") !== "closed"; } catch { return true; } };
  let open = $state(remembered());
  const toggle = () => { open = !open; try { sessionStorage.setItem("menu", open ? "open" : "closed"); } catch {} };
  const items = [["/", "map"], ["/graph", "graph"], ["/prototypes", "prototypes"], ["/components", "components"], ["/sources", "sources"], ["/pipeline", "pipeline"], ["/notes", "notes"], ["/about", "about"]];
</script>
<div class="fixed top-2 right-3 z-30">
  <button class="ml-auto block rounded-[4px] bg-panel/90 px-2 py-1 text-sm text-ink backdrop-blur hover:text-brand" onclick={toggle} aria-label={open ? "close menu" : "menu"} aria-expanded={open}>{open ? "×" : "≡"}</button>
  {#if open}
    <nav class="absolute right-0 mt-1 w-40 rounded-[4px] bg-panel p-1 shadow-lg ring-1 ring-line">
      {#each items as [href, label]}<a {href} class="block rounded-[3px] px-2 py-1 text-sm no-underline hover:bg-paper {route.path === href ? 'text-brand' : ''}">{label}</a>{/each}
    </nav>
  {/if}
</div>
