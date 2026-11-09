# 2026-11-08: the unmeasured induction bill

Point-in-time note. Rests on two screenshots Anselm sent on 2026-11-08 (ntfy alerts; the Claude Console billing
page) and the VM worker log. Written in the ontology room (Claude Fable 5.1, session 014JzCqjxKULY4YfJLg1UGAb).
Follows `20261107-menu-starts-open.md`.

## What he saw

The Claude Console: organisation credits -$0.32, "spend this month $135.23 of $200 limit", no credit grant shown.
ntfy: four OpenRouter 402s in an hour on opus, after a "billing cleared". Both keys are empty at once.

## What happened

Since the Anthropic key went in on 2026-10-27, the daily digest said about $1 a day. That number came from the
`analyses` collection, which stores usage only for the analyze phase. Induction on opus 5.5 stored nothing. The worker
log counts 17 to 50 induction calls a day since the switch: `maybeRun` fired whenever ten new prototypes existed, and
with roughly 200 new a day that was every tick. Each run re-sent the 300 most populated prototypes of each of the five
top kinds and asked for merges, broader links and roles over all of them, at medium effort, so the output included a
long think. Nothing in the service measured it. I estimate, and this is an estimate until the recorded calls show
otherwise, that induction was about $10 a day and is most of the $135. The analyze phase over the same days is about
$16 by the digest's own count.

Anselm: "I didn't think I had much else running at this level of intensity. Hmm. I must have some other services
running also." Possibly, but this one suffices; the Console's usage page split by API key is the way to settle it.

## Changes

- `lib/analyze/llm.mjs` records every call in a new `calls` collection: phase, model, tokens in, out, cached, dollars
  (billed when OpenRouter reports it, list price otherwise; the list table moved here), and milliseconds. `spentToday()`
  sums the day. The 402 push now repeats at most every 6 hours instead of every pause.
- `lib/service.mjs` `spend()` reads `calls`, grouped by day, phase and model; the pipeline page shows the phase.
  `bin/backfill-calls.mjs` copies the usage already on each analysis into `calls` so the history is not lost.
- `lib/ontology/induce.mjs`: a run needs `INDUCE_EVERY_H` hours (default 6) since the last one as well as new material,
  and does not start once the day's spend across all phases is at `SPEND_CAP_USD` (default 5). The hierarchy pass is
  incremental: only prototypes not yet reviewed at the current INDUCE_VERSION go to the model, newest and most populated
  first, up to 150 per top kind, with up to 120 established kinds listed as merge and broader targets; the reviewed ones
  are marked `concept.reviewed` and not re-sent. The first run after deploy reviews the top 150 of each kind; later runs
  send only what is new.
- `lib/health.mjs`: the digest's dollar figure now covers every phase and names the phases; a new `spend` problem fires
  at the cap; ages are clamped at zero (the "-550 min old" line came from a feed stamping the future).

## Not done

- Tokens the `calls` rows will show are the first real measurement; the $10 a day figure above should be checked
  against them after a day on a funded key.
- Neither key is funded as of this entry. The worker idles correctly; the health timer will send the all-clear when a
  key works again.
