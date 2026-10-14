#!/usr/bin/env bash
# Provision the ontology VM: Node 22, MongoDB 7 in Docker (local only, persistent volume), two systemd units
# (server on :8100, worker). Secrets live in /etc/ontology.env on the VM (deploy/secrets.sh), never in git.
# Usage: deploy/provision.sh [vm]     (default vm: ontology-monster)
set -euo pipefail
VM="${1:-${VM:-ontology-monster}}"; HOST="$VM.exe.xyz"; DEST="exedev@$HOST"
SSH="ssh -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o ServerAliveInterval=5 -o ServerAliveCountMax=3"
echo "› node 22 + rsync"
$SSH "$DEST" 'node -e "process.exit(+process.versions.node.split(\".\")[0] >= 20 ? 0 : 1)" 2>/dev/null || { curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs; }; sudo apt-get install -y -q rsync >/dev/null'
echo "› mongodb 7 (docker, local only, persistent volume)"
$SSH "$DEST" 'docker inspect ontology-mongo >/dev/null 2>&1 || docker run -d --name ontology-mongo --restart unless-stopped -p 127.0.0.1:27017:27017 -v ontology-mongo-data:/data/db mongo:7 >/dev/null; docker start ontology-mongo >/dev/null'
echo "› dirs"
$SSH "$DEST" 'sudo mkdir -p /srv/ontology && sudo chown -R exedev:exedev /srv'
echo "› systemd units"
for unit in server worker; do
  if [ "$unit" = server ]; then EXEC="/usr/bin/node /srv/ontology/server/index.mjs"; DESC="ontology — socket.io server + static build"; else EXEC="/usr/bin/node /srv/ontology/bin/worker.mjs"; DESC="ontology — pipeline worker (inhale, analyze, resolve, induce)"; fi
  $SSH "$DEST" "sudo tee /etc/systemd/system/ontology-$unit.service >/dev/null" <<UNIT
[Unit]
Description=$DESC
After=network-online.target docker.service

[Service]
User=exedev
WorkingDirectory=/srv/ontology
EnvironmentFile=/etc/ontology.env
Environment=PORT=8100
Environment=HOST=0.0.0.0
ExecStart=$EXEC
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
done
$SSH "$DEST" 'sudo touch /etc/ontology.env && sudo chown exedev:exedev /etc/ontology.env && sudo chmod 600 /etc/ontology.env && sudo systemctl daemon-reload && sudo systemctl enable ontology-server ontology-worker >/dev/null 2>&1'
echo "✓ provisioned $HOST. Next: deploy/secrets.sh, deploy/deploy.sh, then: ssh exe.dev share port $VM 8100 && ssh exe.dev share set-public $VM"
