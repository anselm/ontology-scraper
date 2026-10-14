// Load .env (KEY=value lines) into process.env without overriding what is already set. No dependency.
import { readFileSync } from "node:fs"; import { join, dirname } from "node:path"; import { fileURLToPath } from "node:url";
try { for (const line of readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", ".env"), "utf8").split("\n")) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const USER_AGENT = process.env.USER_AGENT || "ontology-scraper/0.1 (+https://ontology.monster; anselm@gmail.com)";
