# The present was starved: newest first, budget back to 400, lighter shapes

2026-10-26. Anselm: "i think the website has overflowed - like maybe there is so much data it is taking too
long to show it". Measured on the live site before changing anything.

## What it was

Not slowness. Every socket request answered in under 350 ms; the VM was idle (load 0.00, 2.5 GB free).
The map opens on the last seven days and showed "0 placed · 0 regions", because nothing published in the
last week had been analysed:

- Intake runs at about 400 documents a day (published-by-day counts from 10-14 to 10-26 were 243 to 472).
- The analysis budget was 60 a day, lowered on 2026-10-19 while console sessions worked the backlog, and
  the worker hit it within the hour every day since (60 analyses on each of 10-20 to 10-25).
- The claim took the oldest eligible document first (`findOneAndUpdate` with no sort, so natural order),
  so the 60 went to the back of a 1,194-document backlog and the newest news was never reached. The
  entity time bounds ended at 2026-10-16.

One real weight too: the 200 region shapes sent to the map were 3.6 MB of GeoJSON (Natural Earth
coastlines at full resolution; Alaska alone 447 KB, Canada 261 KB), which a phone on a slow link feels.

## What changed

- `pipeline.claim` takes a sort; analyze claims newest published first. The site stays current and the
  backlog drains behind it when there is room.
- `ANALYZE_BUDGET` back to 400 on the VM (local `.env`, pushed by `deploy/secrets.sh`). On haiku that is
  about $0.76 a day at the measured $0.0019 per document; the 60 a day was written for opus prices.
- `lib/enrich/simplify.mjs`: Douglas-Peucker on polygon rings, no dependency; `service.extents` sends
  shapes simplified at 0.05° (about 5 km) and caches them by entity id. 3.6 MB → 0.7 MB for the same 200
  shapes (0.02° gave 1.3 MB, 0.1° 0.4 MB; 0.05° still looks right at country zoom). Stored geometry is
  untouched.

## Open

- The backlog (1,194 pending) now only drains on days with fewer than 400 new documents, which at the
  current intake is never. Either accept that old news stays unread, raise the budget again, or trim the
  sources. Console sessions can still donate batches with `bin/chores.mjs`.
- The time slider's bounds come from entity first/last seen, so they lag analysis; harmless once analysis
  is current.
