#!/usr/bin/env bash
# Deploy ontology to its exe.dev VM: rsync the repo (no node_modules/dist/.env), npm ci, vite build, restart units.
# Manual deploy: push ≠ deploy. Usage: deploy/deploy.sh [vm]
set -euo pipefail
VM="${1:-${VM:-ontology-monster}}"; HOST="$VM.exe.xyz"; DEST="exedev@$HOST"; ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH="ssh -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o ServerAliveInterval=5 -o ServerAliveCountMax=3"
echo "› sync → $HOST:/srv/ontology"
rsync -ah --delete -e "$SSH" --exclude '.git' --exclude 'node_modules' --exclude 'dist' --exclude '.env' --exclude 'deploy' "$ROOT/" "$DEST:/srv/ontology/"
echo "› npm ci + build"
# The build must succeed or nothing restarts: a failed build must never leave a stale bundle stamped with a new sha.
$SSH "$DEST" 'set -o pipefail; cd /srv/ontology && scripts/fetch-ne.sh | tail -1 && npm ci --no-audit --no-fund --silent 2>&1 | tail -1; npm run build > /tmp/build.log 2>&1 || { echo "BUILD FAILED"; grep -iE "error|unexpected" /tmp/build.log | head -5; exit 1; }; grep -E "built in" /tmp/build.log' || { echo "✗ build failed on $HOST; not restarting"; exit 1; }
VERSION="$(node -p "require('$ROOT/package.json').version")"; SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo manual)"; git -C "$ROOT" diff --quiet 2>/dev/null || SHA="$SHA-dirty"
$SSH "$DEST" "printf '{\"version\":\"%s\",\"sha\":\"%s\",\"branch\":\"main\",\"at\":\"%s\"}\n' '$VERSION' '$SHA' \"\$(date -u +%Y-%m-%dT%H:%MZ)\" > /srv/ontology/dist/version.json; sudo systemctl restart ontology-server ontology-worker; sleep 2; systemctl is-active ontology-server ontology-worker | tr '\n' ' '"; echo
echo "✓ deployed $SHA → https://$HOST"
