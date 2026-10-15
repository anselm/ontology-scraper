#!/usr/bin/env bash
# Natural Earth boundaries (public domain) from the nvkelso GitHub mirror, into data/ne/ (not in git): countries at 50m,
# states and provinces at 10m, marine areas (oceans, seas, gulfs, straits) at 10m. Each carries a Wikidata id, which is
# how the extent phase matches them to entities. Idempotent; re-run to refresh.
set -euo pipefail
D="$(cd "$(dirname "$0")/.." && pwd)/data/ne"; mkdir -p "$D"
for f in ne_50m_admin_0_countries ne_10m_admin_1_states_provinces ne_10m_geography_marine_polys; do
  [ -s "$D/$f.geojson" ] && { echo "have $f"; continue; }
  curl -sL --fail -o "$D/$f.geojson.part" "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/$f.geojson" && mv "$D/$f.geojson.part" "$D/$f.geojson" && echo "fetched $f ($(stat -c %s "$D/$f.geojson") bytes)"
done
