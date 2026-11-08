# 2026-11-07: the menu starts open; the Anthropic key is back

Point-in-time note. Rests on Anselm's two remarks of 2026-10-27 and 2026-11-07 in the ontology room (Claude Fable 5.1,
session 014JzCqjxKULY4YfJLg1UGAb). Follows `20261026-alerts.md`.

## Menu

Anselm: "I notice that the hamburger tends to confuse people - maybe it should start open." The one floating control was
a bare `≡` top right; first-time readers did not find the other pages. Now `src/lib/Menu.svelte` opens on first load and
stays open across pages; the button shows `×` while open; closing it is remembered in sessionStorage for the tab, so it
does not spring back on every navigation. Verified by screenshot in light, dark and at 390 px: the list sits top right,
clear of the map's floating panels. Not changed: the eight items or their order.

## Models

On 2026-10-27 Anselm asked whether the service was spending Anthropic credits or OpenRouter money. It was all OpenRouter:
the Anthropic key on the VM answered "credit balance too low" and the worker retired that tier at every start. The
OpenRouter key is shared with matchmaker and had about $21 left of $210. He supplied a funded Anthropic key
(sk-ant-usr-…, the one in `.env` and `/etc/ontology.env` now); the tier order already tried Anthropic first, so only the
per-phase model names needed setting (`MODEL_ANALYZE`, `MODEL_JUDGE` haiku 5.5; `MODEL_ANALYZE_FALLBACK` sonnet 5.5;
`MODEL_INDUCE` opus 5.5). Commit 8688e19 added the Anthropic-side fallback and taught the spend table to price dashed
Anthropic ids. The worker log showed `claude-haiku-5-5` analyses within two minutes of the deploy.

Recommendation given (not yet acted on): keep haiku for bulk reading, spend the headroom on volume (raise
`ANALYZE_BUDGET` to 800 for a week to drain the backlog), not on a bigger model; sonnet on every document would cost
about twice the monthly credit at 400 documents a day (figures in `20261019-cost-pass.md`).

## Open

- The health line can print a negative age ("newest read -550 min old") when a feed stamps a future time; clamp it.
- Induction on opus does not record its cost; 20 to 76 calls a day, unmeasured.
