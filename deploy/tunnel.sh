#!/usr/bin/env bash
# Open an SSH tunnel to the VM's mongo (bound to localhost there) on local port 27018, in the background. A contributor on
# canada1 then runs the chores tool with MONGODB_URI=mongodb://127.0.0.1:27018. Usage: deploy/tunnel.sh [vm]
set -euo pipefail
VM="${1:-${VM:-ontology-monster}}"; HOST="$VM.exe.xyz"
if ss -ltn | grep -q ':27018 '; then echo "tunnel already up on :27018"; exit 0; fi
ssh -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o ServerAliveInterval=5 -f -N -L 127.0.0.1:27018:127.0.0.1:27017 "exedev@$HOST"
echo "tunnel up: mongodb://127.0.0.1:27018 → $HOST"
