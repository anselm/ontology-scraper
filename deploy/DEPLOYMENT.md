# Deployment: ontology-monster

The path that worked, as of 2026-10-14. House-wide exe.dev quirks live in
`intotheblue/deploy/DEPLOYMENT.md` on the Mac; this file only records what is
specific here.

- **VM**: `ontology-monster` (exe.dev), https://ontology-monster.exe.xyz.
- **Domain**: https://ontology.monster and `www`, both grey-cloud CNAMEs at
  Cloudflare to `ontology-monster.exe.xyz`, registered with `exe.dev domain
  add`. Done with `~/projects/2027/harness/bin/exe-domain ontology-monster ontology.monster`
  on canada1 (token `~/.config/cf/token`). See
  `devlog/20261014-domain-live.md`.
- **First time**: `deploy/provision.sh`, then `deploy/secrets.sh` (writes
  `/etc/ontology.env` from the local `.env`), then `deploy/deploy.sh`.
- **Each change**: `deploy/deploy.sh`. Push is not deploy.
- **Units on the VM**: `ontology-server` (:8100) and `ontology-worker`;
  docker mongo bound to localhost. The server caches `dist/index.html` at
  start, so restart it after a build (deploy.sh does).
- **Mongo from canada1**: `deploy/tunnel.sh`.

Traps seen here: `exe.dev domain add` fails until public DNS points at the
VM, so create the records first and rerun after a minute. Orange-cloud
(proxied) records give 421 from exe.dev.
