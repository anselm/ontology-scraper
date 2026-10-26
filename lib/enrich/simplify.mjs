// Geometry simplification for shapes sent to the browser: Douglas-Peucker on every ring of a GeoJSON Polygon or
// MultiPolygon, tolerance in degrees. Rings that collapse below four points are dropped; a polygon with no outer ring
// left is dropped; a point or line is returned untouched. No dependency.
const dist2 = (p, a, b) => { let x = a[0], y = a[1], dx = b[0] - x, dy = b[1] - y; if (dx || dy) { const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy); if (t > 1) { x = b[0]; y = b[1]; } else if (t > 0) { x += dx * t; y += dy * t; } } dx = p[0] - x; dy = p[1] - y; return dx * dx + dy * dy; };
function dp(pts, tol2) {
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const stack = [[0, pts.length - 1]];
  while (stack.length) { const [a, b] = stack.pop(); let max = tol2, idx = -1; for (let i = a + 1; i < b; i++) { const d = dist2(pts[i], pts[a], pts[b]); if (d > max) { max = d; idx = i; } } if (idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); } }
  return pts.filter((_, i) => keep[i]);
}
const ring = (r, tol2) => { const s = dp(r, tol2); return s.length >= 4 ? s : null; };
const poly = (rings, tol2) => { const out = []; for (let i = 0; i < rings.length; i++) { const r = ring(rings[i], tol2); if (r) out.push(r); else if (i === 0) return null; } return out; };
export function simplify(g, tol = 0.02) {
  if (!g) return g; const tol2 = tol * tol;
  if (g.type === "Polygon") { const p = poly(g.coordinates, tol2); return p ? { type: "Polygon", coordinates: p } : g; }
  if (g.type === "MultiPolygon") { const ps = g.coordinates.map((c) => poly(c, tol2)).filter(Boolean); return ps.length ? { type: "MultiPolygon", coordinates: ps } : g; }
  return g;
}
