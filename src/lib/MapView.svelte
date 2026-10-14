<script>
  // The world, with the located entities alive in the window as circles sized by mentions and coloured by top kind.
  // MapLibre over OpenStreetMap raster tiles, darkened by CSS in dark mode. Click selects; the page shows the detail.
  import { color } from "./api.js";
  let { features = [], selected = null, onSelect = () => {} } = $props();
  let el = $state(null), map = null, ready = $state(false), err = $state(""), ml = null;
  async function ensure() { if (map || !el) return; try { ml = await import("maplibre-gl"); await import("maplibre-gl/dist/maplibre-gl.css"); ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs"); } catch { err = "map library did not load"; return; }
    try { map = new ml.Map({ container: el, attributionControl: { compact: true }, style: { version: 8, sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] }, center: [20, 25], zoom: 1.6, minZoom: 0.8 }); } catch { err = "this browser cannot draw the map (WebGL2 is required)"; return; }
    map.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right"); window.__map = map;
    map.on("load", () => {
      map.addSource("e", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "halo", type: "circle", source: "e", paint: { "circle-color": ["get", "color"], "circle-opacity": 0.12, "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, ["*", ["get", "r"], 1.8], 8, ["*", ["get", "r"], 4]] } });
      map.addLayer({ id: "pts", type: "circle", source: "e", paint: { "circle-color": ["get", "color"], "circle-radius": ["get", "r"], "circle-opacity": 0.85, "circle-stroke-width": ["case", ["get", "sel"], 2.5, 0.8], "circle-stroke-color": ["case", ["get", "sel"], "#ffffff", "rgba(0,0,0,0.5)"] } });
      map.on("click", "pts", (e) => onSelect(e.features[0].properties.id)); map.on("mouseenter", "pts", () => (map.getCanvas().style.cursor = "pointer")); map.on("mouseleave", "pts", () => (map.getCanvas().style.cursor = ""));
      let popup = null; map.on("mouseenter", "pts", (e) => { const p = e.features[0].properties; popup = new ml.Popup({ closeButton: false, offset: 8 }).setLngLat(e.features[0].geometry.coordinates).setText(`${p.label} · ${p.prototype}`).addTo(map); }); map.on("mouseleave", "pts", () => { popup?.remove(); popup = null; });
      ready = true; draw();
    });
  }
  function draw() { if (!ready) return; map.getSource("e")?.setData({ type: "FeatureCollection", features: features.map((f) => ({ ...f, properties: { ...f.properties, color: color(f.properties.top), r: 4 + Math.min(14, Math.sqrt(f.properties.mentions || 1) * 2.2), sel: f.properties.id === selected } })) }); }
  $effect(() => { if (el) ensure(); }); $effect(() => { void features; void selected; draw(); });
  export function flyTo(lon, lat) { map?.easeTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 4) }); }
</script>
<div bind:this={el} class="map h-full w-full bg-panel"></div>
{#if err}<div class="absolute inset-x-0 top-20 mx-auto w-fit rounded-[4px] bg-panel px-3 py-1 text-xs text-red-500">{err}</div>{/if}
<style>
  @media (prefers-color-scheme: dark) { .map :global(.maplibregl-canvas) { filter: invert(0.92) hue-rotate(180deg) saturate(0.5) brightness(0.85); } }
  .map :global(.maplibregl-ctrl-attrib) { font-size: 10px; }
</style>
