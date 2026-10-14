<script>
  // the one floating control: a top-right icon opening a small menu
  import { route } from "./router.svelte.js";
  let open = $state(false);
  const items = [["/", "map"], ["/graph", "graph"], ["/prototypes", "prototypes"], ["/components", "components"], ["/sources", "sources"], ["/pipeline", "pipeline"], ["/notes", "notes"], ["/about", "about"]];
  $effect(() => { void route.path; open = false; });
</script>
<div class="fixed top-2 right-3 z-30">
  <button class="rounded-[4px] bg-panel/90 px-2 py-1 text-sm text-ink backdrop-blur hover:text-brand" onclick={() => (open = !open)} aria-label="menu">≡</button>
  {#if open}
    <nav class="absolute right-0 mt-1 w-40 rounded-[4px] bg-panel p-1 shadow-lg ring-1 ring-line">
      {#each items as [href, label]}<a {href} class="block rounded-[3px] px-2 py-1 text-sm no-underline hover:bg-paper {route.path === href ? 'text-brand' : ''}">{label}</a>{/each}
    </nav>
  {/if}
</div>
