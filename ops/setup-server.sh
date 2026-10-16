#!/bin/bash
# Sets up (or re-applies) the indexer server on Ubuntu 24.04. Idempotent: safe to re-run after an upgrade of the
# machine or of this directory. Run as a sudo-capable user from the ops/ directory of a checkout.
#
#   INDEXER_HOST=1-2-3-4.sslip.io PREVIEW_HOST=preview.1-2-3-4.sslip.io CHAIN_ID=84532 START_BLOCK=48061726 ./setup-server.sh
#
# Optional: RPC_URL (default: the public Base RPC for CHAIN_ID), SCHEMA (default tl_<CHAIN_ID>),
# MEM_MAX / MEM_HIGH for the Ponder cgroup (default: half of RAM / 90 % of that), KUBO_GOMEMLIMIT (default 220MiB).
set -euo pipefail

: "${INDEXER_HOST:?set INDEXER_HOST}"; : "${PREVIEW_HOST:?set PREVIEW_HOST}"
: "${CHAIN_ID:?set CHAIN_ID}"; : "${START_BLOCK:?set START_BLOCK}"
OPS=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$OPS/.." && pwd)
USER_NAME=$(id -un)
NODE_VERSION=22.12.0
NODE_SHA256=22982235e1b71fa8850f82edd09cdae7e3f32df1764a9ec298c72d25ef2c164f   # https://nodejs.org/dist/v22.12.0/SHASUMS256.txt (linux-x64)
KUBO_VERSION=0.43.1
PNPM_VERSION=12
case "$CHAIN_ID" in
  8453) DEFAULT_RPC=https://mainnet.base.org ;;
  84532) DEFAULT_RPC=https://sepolia.base.org ;;
  *) DEFAULT_RPC=http://127.0.0.1:8545 ;;
esac
RPC_URL=${RPC_URL:-$DEFAULT_RPC}
SCHEMA=${SCHEMA:-tl_$CHAIN_ID}
RAM_MB=$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)
MEM_MAX=${MEM_MAX:-$((RAM_MB / 2))M}
MEM_HIGH=${MEM_HIGH:-$((RAM_MB * 45 / 100))M}
KUBO_GOMEMLIMIT=${KUBO_GOMEMLIMIT:-220MiB}
log() { printf '\n== %s\n' "$*"; }

log "packages"
sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl git ufw fail2ban unattended-upgrades \
  debian-keyring debian-archive-keyring apt-transport-https ca-certificates python3 >/dev/null

log "sshd: keys only, no root"
sudo install -m 644 /dev/stdin /etc/ssh/sshd_config.d/10-hardening.conf <<'EOF'
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
EOF
sudo systemctl reload ssh 2>/dev/null || sudo systemctl reload sshd

log "firewall"
sudo ufw --force reset >/dev/null
sudo ufw default deny incoming >/dev/null; sudo ufw default allow outgoing >/dev/null
for p in 22/tcp 80/tcp 443/tcp 4001/tcp 4001/udp; do sudo ufw allow "$p" >/dev/null; done
sudo ufw --force enable >/dev/null; sudo ufw status | head -1

log "fail2ban + unattended upgrades"
sudo systemctl enable --now fail2ban >/dev/null
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades >/dev/null

log "node $NODE_VERSION + pnpm $PNPM_VERSION"
if [ ! -x /opt/node22/bin/node ] || [ "$(/opt/node22/bin/node --version)" != "v$NODE_VERSION" ]; then
  tmp=$(mktemp -d)
  curl -fsSL -o "$tmp/node.tar.xz" "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz"
  echo "$NODE_SHA256  $tmp/node.tar.xz" | sha256sum -c - >/dev/null || { echo "node checksum mismatch; update NODE_SHA256 from SHASUMS256.txt"; exit 1; }
  sudo rm -rf /opt/node22 && sudo mkdir -p /opt/node22 && sudo tar xJf "$tmp/node.tar.xz" -C /opt/node22 --strip-components=1
  rm -rf "$tmp"
fi
export PATH=/opt/node22/bin:$PATH
sudo /opt/node22/bin/corepack enable >/dev/null 2>&1 || true
sudo /opt/node22/bin/npm install -g "pnpm@$PNPM_VERSION" >/dev/null 2>&1
node --version; pnpm --version

log "caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg --yes
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq caddy >/dev/null
fi
sed -e "s/__INDEXER_HOST__/$INDEXER_HOST/" -e "s/__PREVIEW_HOST__/$PREVIEW_HOST/" "$OPS/Caddyfile" | sudo tee /etc/caddy/Caddyfile >/dev/null
sudo mkdir -p /var/www/preview && sudo chown "$USER_NAME" /var/www/preview
sudo systemctl enable --now caddy >/dev/null; sudo systemctl reload caddy

log "nginx cache"
if ! command -v nginx >/dev/null; then
  printf '#!/bin/sh\nexit 101\n' | sudo tee /usr/sbin/policy-rc.d >/dev/null; sudo chmod +x /usr/sbin/policy-rc.d   # no auto-start on :80
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx-light >/dev/null
  sudo rm -f /usr/sbin/policy-rc.d
fi
sudo rm -f /etc/nginx/sites-enabled/default
sudo install -m 644 "$OPS/nginx-indexer-cache.conf" /etc/nginx/conf.d/indexer-cache.conf
sudo sed -i 's/worker_connections [0-9]*;/worker_connections 4096;/' /etc/nginx/nginx.conf
grep -q worker_rlimit_nofile /etc/nginx/nginx.conf || sudo sed -i 's/^worker_processes.*/&\nworker_rlimit_nofile 16384;/' /etc/nginx/nginx.conf
sudo mkdir -p /var/cache/nginx/indexer && sudo chown www-data:www-data /var/cache/nginx/indexer
sudo nginx -t 2>&1 | tail -1
sudo systemctl enable --now nginx >/dev/null; sudo systemctl reload nginx

log "kubo $KUBO_VERSION"
if ! id ipfs >/dev/null 2>&1; then sudo useradd --system --home /var/lib/ipfs --shell /usr/sbin/nologin ipfs; fi
sudo mkdir -p /var/lib/ipfs && sudo chown ipfs:ipfs /var/lib/ipfs
if [ ! -x /usr/local/bin/ipfs ] || ! /usr/local/bin/ipfs version | grep -q "$KUBO_VERSION"; then
  tmp=$(mktemp -d)
  curl -fsSL -o "$tmp/kubo.tgz" "https://github.com/ipfs/kubo/releases/download/v$KUBO_VERSION/kubo_v${KUBO_VERSION}_linux-amd64.tar.gz"
  curl -fsSL -o "$tmp/kubo.sha512" "https://github.com/ipfs/kubo/releases/download/v$KUBO_VERSION/kubo_v${KUBO_VERSION}_linux-amd64.tar.gz.sha512"
  (cd "$tmp" && sha512sum -c kubo.sha512 >/dev/null 2>&1 || { echo "kubo checksum mismatch"; exit 1; })
  tar xzf "$tmp/kubo.tgz" -C "$tmp" && sudo install -m 755 "$tmp/kubo/ipfs" /usr/local/bin/ipfs
  rm -rf "$tmp"
fi
K="sudo -u ipfs env IPFS_PATH=/var/lib/ipfs /usr/local/bin/ipfs"
sudo systemctl stop ipfs 2>/dev/null || true          # `ipfs config` refuses to run while the daemon is up
sudo test -f /var/lib/ipfs/config || $K init --profile server >/dev/null   # the directory is 700 ipfs:ipfs
$K config Addresses.Gateway --json '[]' >/dev/null
$K config Addresses.API /ip4/127.0.0.1/tcp/5001 >/dev/null
$K config Routing.Type dhtclient >/dev/null
$K config Provide.Strategy pinned >/dev/null 2>&1 || true
$K config Swarm.ConnMgr.LowWater --json 40 >/dev/null
$K config Swarm.ConnMgr.HighWater --json 120 >/dev/null
$K config Swarm.ResourceMgr.MaxMemory '"256MB"' --json >/dev/null
sed -e "s/__GOMEMLIMIT__/$KUBO_GOMEMLIMIT/" "$OPS/ipfs.service" | sudo tee /etc/systemd/system/ipfs.service >/dev/null
sudo rm -rf /etc/systemd/system/ipfs.service.d
sudo systemctl daemon-reload; sudo systemctl enable --now ipfs >/dev/null; sudo systemctl restart ipfs

log "indexer"
cat > "$REPO/indexer/.env.local" <<EOF
CHAIN_ID=$CHAIN_ID
PONDER_RPC_URL_$CHAIN_ID=$RPC_URL
START_BLOCK=$START_BLOCK
EOF
(cd "$REPO" && pnpm install --frozen-lockfile --filter @traitleague/indexer... >/dev/null 2>&1 || true)
[ -x "$REPO/indexer/node_modules/.bin/ponder" ] || { echo "ponder binary missing after install"; exit 1; }
sed -e "s#__USER__#$USER_NAME#" -e "s#__REPO__#$REPO#g" -e "s#__SCHEMA__#$SCHEMA#" \
    -e "s#__MEM_HIGH__#$MEM_HIGH#" -e "s#__MEM_MAX__#$MEM_MAX#" "$OPS/ponder.service" | sudo tee /etc/systemd/system/ponder.service >/dev/null
sudo rm -rf /etc/systemd/system/ponder.service.d
sudo systemctl daemon-reload; sudo systemctl enable --now ponder >/dev/null; sudo systemctl restart ponder

log "health check cron"
sudo install -m 755 "$OPS/healthcheck.sh" /usr/local/bin/indexer-healthcheck
echo '* * * * * root /usr/local/bin/indexer-healthcheck' | sudo tee /etc/cron.d/indexer-healthcheck >/dev/null
sudo touch /var/log/indexer-healthcheck.log

log "done: ponder $MEM_HIGH/$MEM_MAX, schema $SCHEMA, chain $CHAIN_ID from block $START_BLOCK"
sleep 15
curl -s -o /dev/null -w "health=%{http_code}\n" http://127.0.0.1:8080/health || true
systemctl is-active caddy nginx ipfs ponder fail2ban | tr '\n' ' '; echo
