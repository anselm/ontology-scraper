# 2026-10-14 — Regions, placement, and relations on the map

Point-in-time entry, late on the first day. Rests on Anselm's two remarks
this evening: the map should have real region boundaries, and it showed only
places, no events or anything else.

## Boundaries: Natural Earth, not OpenStreetMap

The island projects (saltspring, cortes) fetched one perimeter from
OpenStreetMap through Overpass with mirror rotation and backoff, and through
Nominatim's polygon output, which is rate-limited to one request a second
and forbids bulk use. For a world of regions that is the wrong tool. Natural
Earth is public domain, ships as GeoJSON on a GitHub mirror, and every
country, state, province and marine area carries a Wikidata id, which our
linker already produces. Three files (countries at 50m, admin-1 at 10m,
marine polygons at 10m; 45 MB) are fetched by `scripts/fetch-ne.sh` into
`data/ne/` on deploy, not into git.

The new `extent` phase runs over place entities. A match by Wikidata id is
taken outright. A match by name is taken only when the model's approximate
point falls inside the shape's bounding box (padded 50 km), so the two
Georgias stay apart, and a city never takes a province's shape on a name
alone. The point becomes the box centre and the radius half its diagonal.
First run over the live data: 52 of 138 places got a shape (Australia and
its states, the Black and Baltic Seas, Saxony-Anhalt, Turkey, Ukraine...).

OSM remains the right source for a single city or island outline on demand;
that can be a later, cached, one-at-a-time enrichment.

## Placement: everything at its named place

The extractor already gave every agent, thing, event and work the place it
was at in the text. Resolution now uses it: the entity is placed at that
place's point with `method: "via"` and the place's id, and an event's
`occurrence.place` is set. A backfill over the existing analyses placed 252
of 309 unplaced entities that had a hint. The map's kind filters now mean
something: 45 events placed in the window tonight.

## Relations on the map

The graph page and the detail card already showed relations. The map now
draws the selected thing's relations as dashed lines to its related placed
things, green for supports, red for opposes, the predicate on hover.
Regions draw as a faint fill and outline in the kind's colour, selected
one darker, and clicking a region selects it.

## Two bugs found by looking

- `key()` stripped leading articles in several languages, so "Las Vegas"
  became "vegas" and matched nothing sensible; "La Paz", "Los Angeles" and
  "Der Spiegel" would have gone the same way. English articles only now;
  keys recomputed on the live data.
- Extracted aliases are noisy ("Nevada" as an alias of Las Vegas) and were
  feeding name matching for shapes. Shapes match the label only.

## Open

Countries that act ("Russia" the place and "Russia" the agent) are still two
entities; see the donated-analysis entry. Region fills at world zoom pile
up where a country and its provinces are all mentioned; a zoom-dependent
rule (countries only below zoom 4) is the obvious next step.
