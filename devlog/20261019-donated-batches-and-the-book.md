# 2026-10-19: three donated batches, the book on the About page

Point-in-time. Follows `20261019-cost-pass.md` (the model switch) and `20261019-monster-icon.md`.

## Donated analysis from the console

Anselm, after the cost pass: "while we are in interactive mode on the console here we should grab and
perform as much work as we can - so we don't spend credits on openrouter - i have a very high interactive
token count for interactive tokens." Then: "right now we are running the most expensive model (fable 5.1)
but i can shift to something cheaper locally."

So this session did the reading itself through `bin/chores.mjs`: three batches of 30, claimed over the
tunnel against the live database, analysed by hand against the v2 prompt (the brief now carries the same
`SYSTEM` text the worker uses, so a human or another model follows the same kind conventions), validated
against the zod schema, submitted. 90 documents, 1,247 entities, 603 relations, zero rejected, no credits
spent. The paid worker read 59 documents on haiku in the same hours for $0.11 (one fell through to sonnet,
$0.05). Live now: 4,635 instances, 1,109 prototypes, 3,650 relations; 1,321 documents still pending.

What the batches were: the first two mostly War on the Rocks essays (long, dense in named organisations
and people; a dozen were members-only stubs that still yield the author, outlet and the one event named),
the third mostly ABC, Guardian Australia, Al Jazeera and DW news of 2026-10-15 (short, dense in places).

Changes made for this: `bin/chores.mjs submit` now puts the resolve phase back to pending, as the worker
does for its own re-runs, so a donated analysis of an already-resolved document gets resolved again; the
worker's daily budget counts only paid analyses (`contributed: {$ne: true}`), so donated work does not
starve the paid pass of fresh news; and the VM budget was lowered to 60 a day while a console session is
doing the backlog (`ANALYZE_BUDGET=60` in `.env`, uploaded by `deploy/secrets.sh`). A duplicate story that
arrives from a sibling feed (DW top and all) was handled by copying the analysis; the worker skips those by
title, chores does not yet.

On the model for this work: the cost pass measured sonnet 5.5 at opus quality on this extraction, so a
sonnet session would do the chores loop as well as this one and far cheaper in plan tokens; haiku would
lose recall. The claimed batch directories carry everything a switched session needs.

## The book on the About page

Anselm: "can you link or cite this book somewhere maybe in an about or wherever you think is best - it is
a guiding light for us: https://www.ontologypipeline.com/ ... add book jacket art if possible by the way
when citing it."

The About page now has a "Guiding light" section with the jacket and a citation: Jessica Talisman,
*Ontology Pipeline: A framework for building knowledge infrastructures*, Technics Publications. The
subtitle is read off the cover on the publisher's page (the survey of 2026-10-14 had "A Framework for
Knowledge Engineering" from the publisher's text; the cover wins). The jacket image is the publisher's
270x350 product image, copied to `public/ontology-pipeline-cover.jpg` with a credit line, linked to
ontologypipeline.com. The section also says how the six stages map onto this project's phases; the
fuller mapping is in `20261014-survey-ontology.md`. README's "Reading further" leads with the book.

Not verified: publication date and ISBN (neither page shows them); the site says only "Buy the Book".
