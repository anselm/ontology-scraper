// Screenshot a page of this app with headless Chrome over CDP, waiting real time for the socket round trip.
// Plain `chromium --screenshot` (virtual-time or --timeout) fires before socket.io answers and shows "loading…".
//   node scripts/shot.mjs <url> <out.png> [width] [height] [dark]
import WebSocket from "ws"; import { spawn } from "node:child_process"; import { existsSync, readdirSync } from "node:fs"; import { homedir } from "node:os";
// Prefer Playwright's Chrome when present: the snap chromium on this box has failed with "cannot exec … gpu-2404-wrapper: input/output error".
const pwDir = `${homedir()}/.cache/ms-playwright`; const pw = existsSync(pwDir) ? readdirSync(pwDir).filter((d) => d.startsWith("chromium-")).sort().map((d) => `${pwDir}/${d}/chrome-linux64/chrome`).filter(existsSync).pop() : null; const CHROME = process.env.CHROME || pw || "chromium"; import { writeFileSync } from "node:fs";
const [url, out, w = "1280", h = "1400", dark] = process.argv.slice(2); const port = 9333 + Math.floor(Math.random() * 100);
// WebGL via SwiftShader/ANGLE so MapLibre renders headlessly (per the screenshot-verify skill); --disable-gpu would kill it.
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", `--remote-debugging-port=${port}`, `--window-size=${w},${h}`, ...(dark ? ["--force-dark-mode"] : []), ...((process.env.CHROME_FLAGS || "").split(" ").filter(Boolean)), "about:blank"], { stdio: "ignore" });
// wait for the debug port rather than a fixed sleep (chromium can take a few seconds when several instances linger)
for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await new Promise((r) => setTimeout(r, 250)); } }
const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => ws.on("open", r)); let id = 0;
const send = (method, params = {}) => new Promise((res) => { const i = ++id; const hnd = (m) => { const j = JSON.parse(m); if (j.id === i) { ws.off("message", hnd); res(j.result); } }; ws.on("message", hnd); ws.send(JSON.stringify({ id: i, method, params })); });
ws.on("message", (m) => { const j = JSON.parse(m); if (j.method === "Runtime.exceptionThrown") console.error("EXCEPTION", j.params.exceptionDetails.exception?.description || j.params.exceptionDetails.text); if (j.method === "Runtime.consoleAPICalled" && (j.params.type === "error" || j.params.type === "warning")) console.error("CONSOLE." + j.params.type, j.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300)); });
await send("Runtime.enable"); await send("Page.enable"); if (dark) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
await send("Page.navigate", { url }); await new Promise((r) => setTimeout(r, Number(process.env.WAIT_MS || 7000)));
const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); writeFileSync(out, Buffer.from(data, "base64")); console.log("wrote", out);
ws.close(); chrome.kill();
