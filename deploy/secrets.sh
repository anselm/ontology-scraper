#!/usr/bin/env bash
# Upload /etc/ontology.env to the VM from the local .env (ANTHROPIC_API_KEY and/or OPENROUTER_API_KEY), plus the mongo settings.
# Usage: deploy/secrets.sh [vm]
set -euo pipefail
VM="${1:-${VM:-ontology-monster}}"; HOST="$VM.exe.xyz"; DEST="exedev@$HOST"; ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH="ssh -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o ServerAliveInterval=5"
val() { grep -E "^$1=" "$ROOT/.env" 2>/dev/null | cut -d= -f2- || true; }
A="$(val ANTHROPIC_API_KEY)"; O="$(val OPENROUTER_API_KEY)"; [ -n "$A$O" ] || { echo "no ANTHROPIC_API_KEY or OPENROUTER_API_KEY in .env"; exit 1; }
# optional tuning, copied through when set locally: per-phase models and the daily analysis budget
EXTRA=""; for k in OPENROUTER_MODEL OPENROUTER_MODEL_ANALYZE OPENROUTER_MODEL_JUDGE OPENROUTER_MODEL_ANALYZE_FALLBACK OPENROUTER_MODEL_INDUCE MODEL_ANALYZE MODEL_JUDGE MODEL_INDUCE ANALYZE_BUDGET; do v="$(val $k)"; [ -n "$v" ] && EXTRA="$EXTRA$k=$v\n"; done
printf "ANTHROPIC_API_KEY=%s\nOPENROUTER_API_KEY=%s\nMONGODB_URI=mongodb://127.0.0.1:27017\nMONGODB_DB=ontology\nCANONICAL_HOST=ontology.monster\n$EXTRA" "$A" "$O" | $SSH "$DEST" 'cat > /etc/ontology.env && chmod 600 /etc/ontology.env'
echo "  models: ${EXTRA:-defaults}"
echo "✓ secrets on $HOST (/etc/ontology.env)"
