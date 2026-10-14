#!/usr/bin/env node
// Seed sources, component definitions and the top kinds; safe to re-run.
import "../lib/env.mjs"; import { seedAll } from "../lib/sources/seed.mjs"; import { close } from "../lib/store.mjs";
console.log(`seeded; ${await seedAll()} new sources`); await close();
