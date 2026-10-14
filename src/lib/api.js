// Client–server: one socket.io connection; every request is {name, payload} with an ack.
import { io } from "socket.io-client";
export const socket = io({ transports: ["websocket", "polling"] });
export function rpc(name, payload = {}) { return new Promise((resolve, reject) => socket.timeout(30000).emit("rpc", { name, payload }, (err, res) => { if (err) return reject(new Error("no reply from server")); res?.ok ? resolve(res.data) : reject(new Error(res?.error || "request failed")); })); }
export const fire = (name, payload = {}) => rpc(name, payload).catch(() => {});
export const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
export const ago = (iso) => { if (!iso) return ""; const h = Math.round((Date.now() - new Date(iso)) / 36e5); return h < 1 ? "now" : h < 48 ? h + "h" : Math.round(h / 24) + "d"; };
export const TOP = { agent: "agent", place: "place", thing: "thing", event: "event", work: "work" };
// one colour per top kind; the brand colour is for selection and chrome, not data
export const COLORS = { agent: "#d2691e", place: "#3a7bd5", thing: "#7b61ff", event: "#c0392b", work: "#6c8e3a" };
export const color = (top) => COLORS[top] || "#7c92a8";
