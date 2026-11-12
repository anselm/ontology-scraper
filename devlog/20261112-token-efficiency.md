# 2026-11-12: are we efficient with tokens?

Point-in-time note, after OpenRouter was refuelled and the first hour of recorded calls came in. Rests on the `calls`
collection (recording since 2026-11-08) and the VM worker log. Ontology room, Claude Fable 5.1, session
014JzCqjxKULY4YfJLg1UGAb. Follows `20261108-unmeasured-induction.md`.

## Measured, first hour after the refuel

| phase | model | calls | in / call | out / call | cached | $ / call |
|---|---|---|---|---|---|---|
| analyze | haiku 5.5 | 68 | 4,401 | 3,411 | 44% | 0.002 |
| analyze | sonnet 5.5 (retry) | 1 | 4,866 | 4,105 | 0% | 0.052 |
| judge | haiku 5.5 | 26 | 590 | 137 | 0% | 0.000 |
| induce | opus 5.5 | 6 | 3,379 | 5,032 | 0% | 0.115 |

The first induction run after the incremental change cost $0.69 for five hierarchy calls and one component call. Later
runs send only prototypes not yet reviewed, so they should be smaller; the cap of four runs a day bounds it at under
$3 regardless. Before 2026-11-08 the same pass ran every tick on the full lists.

## Where the waste was

1. Induction, above. Fixed on the 8th.
2. The sonnet retry. Over ten days 289 of 2,795 analyses ran on sonnet, a tenth of documents, and that tenth cost more
   than the other nine tenths on haiku ($1 a day against $0.45). The log shows why: 294 haiku answers failed schema
   validation with `invalid_value`, a predicate or stance outside the enum (OpenRouter's JSON schema does not enforce
   enums for Anthropic models; the Anthropic SDK path does). Each failure paid for the haiku call, then the sonnet one.
   Only two retries in ten days were real truncations. Fixed today: `ask()` takes a `repair` hook, and the analyze
   phase normalises an invented predicate ("works_for", "is located in") to the list or to related-to, a stance to
   neutral, a kind to thing, logging each repair so the prompt can be tightened once the values are known.
3. Output size. An analysis averages 3,400 output tokens, 80% of its cost, because every entity carries a verbatim
   span and description and every relation a verbatim quote. Those feed the document page and provenance, so they
   stay. At $0.002 a document it is not where the money is.

## Not measured

- Whether repaired relations are as good as sonnet's; related-to is a loss of meaning compared with the verb the
  model wanted. The log will show the invented values.
- The induction runs after the first, which are the ones that matter for the daily figure.
