# 2026-10-14 — Donated analysis: any reader can be a worker

Point-in-time entry. Rests on Anselm's question of this evening (the Anthropic
account is unfunded, but a Claude Code session on his Max plan has tokens to
spare; could it do analysis by hand, and could others donate compute the same
way?) and on the saltspring devlog of 2026-08-01, which first framed the
pipeline as flagged chores that any worker, local model or frontier session,
could claim.

## What was built tonight

`bin/chores.mjs` plus `deploy/tunnel.sh`. A contributor opens a tunnel to the
live database, claims documents that need the analyze phase (a six-hour
lease, labelled with the contributor's name), gets each one's text in a file
with a one-paragraph brief, writes an analysis per document in the same shape
the pipeline's own prompt produces, and submits. Submission validates against
the same zod schema, stores the analysis under the contributor's model name
and prompt version, and marks the phase done; resolution runs on the service
as for any other analysis. The record carries `contributed: true`.

First run: eight DW articles claimed from the live database and analysed by
this session reading them, 148 entities and 85 relations submitted, all eight
accepted by the schema first time. Resolution on the VM then merged the
overlapping things (Strait of Hormuz, Russia, the Houthis, Riyadh) with the
ones the paid model had already found from other articles, which was the
first real test of cross-extractor resolution.

## What it is, in the architecture

Nothing new. Analyses were already keyed by model and prompt version and
carried their extractor; provenance was already per claim. A session reading
by hand is just a slower extractor with a different label. The dirty-flag
pipeline makes this cheap because the service never needed to know who
would do a phase, only that it was done and by whom.

## Donated compute as a product idea

Anselm's larger thought: if the service accepted pre-digested entities,
prototypes and components from outside, it could become authoritative and
stable faster than one key's budget allows, and components in particular
should settle after a few thousand audited entities. What that needs beyond
tonight's tool:

1. **A public submit path** instead of a database tunnel: an HTTP endpoint
   taking the same analysis record, or a claim-and-submit pair, with the
   document text served to the claimant.
2. **Identity on contributions.** attest already issues per-site device keys
   under a passkey; a contribution signed by one is attributable, rate-limitable
   and scoreable. Anonymous submission invites poisoning.
3. **Agreement as confidence.** The saltspring re-examination asked for
   confidence from inter-model agreement rather than a decorative formula.
   With several extractors reading the same document, a claim two of them
   make outranks one; a contributor whose claims are routinely contradicted
   loses weight. This is the quality control that makes donation safe, and
   it needs the same document read more than once, which today's claim lock
   prevents; a second-opinion mode is the next step.
4. **Review before vocabulary changes.** Entities and claims can flow in
   scored; prototype merges and component proposals from outside should land
   as proposals, the way the induction pass's own do.
5. **Terms.** A contributor reads the publisher's text; the service never
   serves bodies publicly, so the claim step must stay behind an identity.

## Open

Whether hand analysis by a session is worth the human-equivalent time at all
once the account is funded: the model costs ten cents an article at Opus
rates; the session's value is adjudication (merges, hierarchy, component
proposals) more than bulk, and the induction pass is where it should be
pointed next.

Seen in the first merged data: "Russia" exists twice, once as a place
(the country) and once as an agent (the state that acts), because the
resolver only matches within a top kind. Countries, cities and companies
act as well as sit somewhere; the next resolver change should let an agent
mention link to a place entity of the same name when that place is a
polity, giving it an `agency` component rather than a second identity.
