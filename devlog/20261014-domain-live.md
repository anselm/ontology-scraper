# 2026-10-14: ontology.monster live

Resolves the DNS item under "Pending Anselm" in `20261014-first-build.md`.

## What was done

- **Cause.** `~/.config/cf/token` on canada1 was a zone-scoped DNS token that
  expired 2026-09-30 (Cloudflare's `/user/tokens/verify` said so explicitly).
  It no longer appeared in the dashboard's token list. The wrangler OAuth
  login in `~/.config/.wrangler` had also expired (2026-09-25), and its
  scopes stop at `zone:read`, so it was never a route to DNS edits.
- **New token**, created in the dashboard from the "Edit zone DNS" template:
  "amdgpu DNS edit (all zones) 2026-10", Zone:DNS:Edit + Zone:Zone:Read on
  all zones, no TTL. Written to `~/.config/cf/token` (mode 600). All zones and
  no expiry are deliberate: binding a newly bought domain should need no
  dashboard visit, and the old token's expiry is what broke this.
- **`~/projects/2027/harness/bin/exe-domain <vm> <domain> [--no-www] [--dry-run]`** on
  canada1 (outside this repo; it serves every exe.dev project). It finds the
  zone, replaces any A/AAAA/CNAME on the apex and `www` with grey-cloud
  CNAMEs to `<vm>.exe.xyz`, then runs `ssh exe.dev domain add` for each name.
  Idempotent.
- **Ran it**: `exe-domain ontology-monster ontology.monster`. Two CNAMEs
  created, nothing deleted (the zone had no records).

## What was established

- The first entry's "`ssh exe.dev domain add` done" had not taken: before
  today `exe.dev domain ls ontology-monster` listed nothing. exe.dev refuses
  the add until public DNS points at the VM, so an add made before DNS fails.
- After creating the records, `domain add` failed its DNS check for about a
  minute. `www` passed on the second try (~30 s), the apex on the third
  (~60 s). TLS was issued immediately on both.
- https://ontology.monster and https://www.ontology.monster return 200 from
  canada1. From the Mac the apex failed for a few minutes on a cached empty
  answer; `curl --resolve ontology.monster:443:161.210.93.130` returned 200.
- No canonical redirect: the apex, `www` and `ontology-monster.exe.xyz` all
  serve the site with 200. `deploy/secrets.sh` writes `CANONICAL_HOST` into
  `/etc/ontology.env`, but nothing in the code reads it yet.

## Not proven

- How exe.dev renews the certificates: not observed, assumed automatic.

## Likely to rot

- Cloudflare dashboard layout and template names (2026-10).
- exe.dev's `domain add` wording and its DNS precheck behaviour.
- The VM's IP (161.210.93.130); the CNAME does not depend on it.

## Still open

- The wrangler OAuth login on canada1 is expired; Cloudflare Pages deploys
  (prismatic.blue, futuresdesk.ai) need the headless re-login described in
  the harness memory `cloudflare-pages-from-canada1` before their next deploy.
