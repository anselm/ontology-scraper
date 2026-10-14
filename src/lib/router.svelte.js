// Tiny path router: state is the pathname plus query; links call go(); the server falls back to index.html.
export const route = $state({ path: location.pathname, q: new URLSearchParams(location.search) });
function sync() { route.path = location.pathname; route.q = new URLSearchParams(location.search); }
export function go(path) { history.pushState(null, "", path); sync(); window.scrollTo(0, 0); }
export function setQuery(patch) { const q = new URLSearchParams(location.search); for (const [k, v] of Object.entries(patch)) { if (v === null || v === undefined || v === "") q.delete(k); else q.set(k, v); } history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "")); sync(); }
window.addEventListener("popstate", sync);
document.addEventListener("click", (e) => { const a = e.target.closest("a[href^='/']"); if (a && !a.target && !e.metaKey && !e.ctrlKey) { e.preventDefault(); go(a.getAttribute("href")); } });
