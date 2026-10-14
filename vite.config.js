import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  server: { host: true, port: 5174, proxy: { "/api": "http://127.0.0.1:8100", "/socket.io": { target: "http://127.0.0.1:8100", ws: true } } },
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 1500 },
});
