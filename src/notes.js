// Reader-facing notes: dated markdown files in notes/, bundled at build time, newest first.
import { marked } from "marked";
const files = import.meta.glob("../notes/*.md", { query: "?raw", import: "default", eager: true });
export const NOTES = Object.entries(files).map(([path, src]) => { const file = path.split("/").pop(); const m = file.match(/^(\d{4})(\d{2})(\d{2})-(.+)\.md$/); const title = (src.match(/^#\s+(.+)$/m) || [])[1] || file; return { file, date: m ? `${m[1]}-${m[2]}-${m[3]}` : "", slug: m ? m[4] : file, title, html: marked.parse(src.replace(/^#\s+.+\n/, "")) }; }).sort((a, b) => b.file.localeCompare(a.file));
