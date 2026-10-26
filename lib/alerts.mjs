// Push notifications over ntfy (https://ntfy.sh): one POST per message, no dependency. Topic from NTFY_TOPIC, server
// from NTFY_URL (default ntfy.sh). Without a topic this is a no-op that logs, so dev boxes never page anyone.
const URL = (process.env.NTFY_URL || "https://ntfy.sh").replace(/\/$/, ""), TOPIC = process.env.NTFY_TOPIC || "";
export const configured = () => !!TOPIC;
export async function notify({ title, body, priority = "default", tags = [], click = "" }, log = console.log) {
  if (!TOPIC) { log(`(no NTFY_TOPIC) ${title}: ${body}`); return false; }
  const headers = { Title: title, Priority: priority, "Content-Type": "text/plain; charset=utf-8" }; if (tags.length) headers.Tags = tags.join(","); if (click) headers.Click = click;
  try { const r = await fetch(`${URL}/${TOPIC}`, { method: "POST", headers, body, signal: AbortSignal.timeout(10000) }); if (!r.ok) log(`ntfy ${r.status}: ${(await r.text()).slice(0, 120)}`); return r.ok; }
  catch (e) { log(`ntfy failed: ${e.message}`); return false; }
}
