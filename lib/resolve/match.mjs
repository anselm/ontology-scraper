// Name normalisation and similarity for resolution. Keys strip case, diacritics, punctuation and a leading English article so
// "The Strait of Hormuz" and "strait of hormuz" meet (other languages' articles stay: Las Vegas, La Paz, Der Spiegel); similarity is a token Jaccard with a bonus for a shared head
// noun, cheap enough to run over a block of candidates. No threshold here is calibrated on labelled pairs yet.
export const key = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^(the|a|an)\s+/, "").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
export const tokens = (s) => key(s).split(" ").filter((t) => t.length > 1);
export function similarity(a, b) {
  const ta = new Set(tokens(a)), tb = new Set(tokens(b)); if (!ta.size || !tb.size) return 0;
  let inter = 0; for (const t of ta) if (tb.has(t)) inter++;
  const j = inter / (ta.size + tb.size - inter); const la = [...ta].at(-1), lb = [...tb].at(-1);
  return Math.min(1, j + (la === lb ? 0.15 : 0));
}
export const cosine = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return d / (Math.sqrt(na) * Math.sqrt(nb) || 1); };
