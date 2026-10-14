// MapLibre 6.14 loads its worker from a file beside the bundle (new URL("./maplibre-gl-worker.mjs", import.meta.url)),
// which Vite does not emit. Copy it into public/ at build and point MapLibre at it (MapView calls setWorkerUrl).
import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("public/maplibre", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre/maplibre-gl-worker.mjs");
