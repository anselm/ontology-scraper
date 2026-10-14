<script>
  // Force-directed graph of entities and the relations among them. d3-force for layout, SVG for crisp text and hit
  // testing; positions survive rebuilds; pan with drag, zoom with the wheel or pinch.
  import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force"; import { color } from "./api.js"; import { untrack } from "svelte";
  let { nodes: inNodes = [], edges: inEdges = [], selected = null, onSelect = () => {} } = $props();
  let svg = $state(null), sizeW = $state(900), sizeH = $state(600), nodes = $state.raw([]), links = $state.raw([]), sim = null, t = $state({ k: 1, x: 0, y: 0 }), hover = $state(null);
  function build(inNodes, inEdges) { const prev = new Map(nodes.map((n) => [n.id, n])); const ids = new Set(inNodes.map((n) => n.id)); const W = sizeW, H = sizeH;
    nodes = inNodes.map((n) => { const p = prev.get(n.id); return { ...n, r: 4 + Math.sqrt((n.degree || 0) + (n.mentions || 0)) * 2, x: p?.x ?? W / 2 + (Math.random() - 0.5) * 200, y: p?.y ?? H / 2 + (Math.random() - 0.5) * 200, vx: p?.vx || 0, vy: p?.vy || 0 }; });
    links = inEdges.filter((e) => ids.has(e.from) && ids.has(e.to)).map((e) => ({ ...e, source: e.from, target: e.to }));
    sim?.stop(); sim = forceSimulation(nodes).force("link", forceLink(links).id((d) => d.id).distance(90).strength(0.3)).force("charge", forceManyBody().strength(-260).distanceMax(500)).force("center", forceCenter(W / 2, H / 2)).force("collide", forceCollide().radius((d) => d.r + 12))
      .on("tick", () => { nodes = [...nodes]; links = [...links]; });
    sim.alpha(1).stop(); for (let i = 0; i < 200; i++) sim.tick(); nodes = [...nodes]; links = [...links]; sim.alpha(0.08).restart(); }
  $effect(() => { if (!svg) return; const ro = new ResizeObserver((es) => { const r = es[0].contentRect; if (r.width > 20) { sizeW = r.width; sizeH = r.height; } }); ro.observe(svg); return () => ro.disconnect(); });
  // the build writes nodes and links and then reads them to seed the simulation; untrack so the effect depends only on its inputs
  $effect(() => { const N = inNodes, E = inEdges; if (svg) untrack(() => build(N, E)); });
  let drag = null, pan = null;
  function down(e, n) { if (n) { drag = n; n.fx = n.x; n.fy = n.y; sim?.alphaTarget(0.3).restart(); } else pan = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y }; e.currentTarget.setPointerCapture?.(e.pointerId); }
  function move(e) { if (drag) { const r = svg.getBoundingClientRect(); drag.fx = (e.clientX - r.left - t.x) / t.k; drag.fy = (e.clientY - r.top - t.y) / t.k; } else if (pan) t = { ...t, x: pan.tx + e.clientX - pan.x, y: pan.ty + e.clientY - pan.y }; }
  function up() { if (drag) { drag.fx = drag.fy = null; sim?.alphaTarget(0); drag = null; } pan = null; }
  function wheel(e) { e.preventDefault(); const k = Math.max(0.2, Math.min(5, t.k * (e.deltaY < 0 ? 1.1 : 0.9))); const r = svg.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top; t = { k, x: mx - ((mx - t.x) * k) / t.k, y: my - ((my - t.y) * k) / t.k }; }
  const byId = $derived(new Map(nodes.map((n) => [n.id, n])));
</script>
<svg bind:this={svg} class="h-full w-full touch-none select-none" onpointerdown={(e) => down(e, null)} onpointermove={move} onpointerup={up} onpointercancel={up} onwheel={wheel} role="img" aria-label="relationship graph">
  <g transform="translate({t.x},{t.y}) scale({t.k})">
    {#each links as l (l.id)}{@const s = typeof l.source === "object" ? l.source : byId.get(l.source)}{@const d = typeof l.target === "object" ? l.target : byId.get(l.target)}{#if s && d}
      <line x1={s.x} y1={s.y} x2={d.x} y2={d.y} stroke={l.stance === "opposes" ? "#c0392b" : l.stance === "supports" ? "#2f7a6b" : "currentColor"} stroke-opacity={hover === l.id ? 0.9 : 0.25} stroke-width={1 + Math.min(3, l.mentions / 2)} onpointerenter={() => (hover = l.id)} onpointerleave={() => (hover = null)} />
      {#if hover === l.id || t.k > 1.6}<text x={(s.x + d.x) / 2} y={(s.y + d.y) / 2 - 3} text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">{l.surface || l.predicate}</text>{/if}
    {/if}{/each}
    {#each nodes as n (n.id)}
      <g transform="translate({n.x},{n.y})" onpointerdown={(e) => { e.stopPropagation(); down(e, n); }} onclick={() => onSelect(n.id)} style="cursor:pointer" role="button" tabindex="-1">
        <circle r={n.r} fill={color(n.top)} fill-opacity="0.85" stroke={n.id === selected ? "#fff" : "rgba(0,0,0,.4)"} stroke-width={n.id === selected ? 2.5 : 0.8} />
        <text y={n.r + 10} text-anchor="middle" font-size={n.id === selected ? 12 : 10} fill="currentColor" font-weight={n.id === selected ? 600 : 400}>{n.label.length > 28 ? n.label.slice(0, 26) + "…" : n.label}</text>
      </g>
    {/each}
  </g>
</svg>
