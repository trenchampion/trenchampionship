# ops — the indexer server, reproducibly

One small Linux machine runs everything the site needs besides the chain: the Ponder indexer (GraphQL for the
web app), an nginx micro-cache in front of it, Caddy for TLS, and a kubo IPFS node that pins the site. Nothing
here holds keys or funds; if the machine disappears, the contracts and the IPFS content stay reachable and a new
machine is set up with the script below in about fifteen minutes.

Tested on Ubuntu 24.04 (Njalla VPS; an INCUS container, so no swap). Sizing measured in `docs/DEPLOY.md` section 8:
1 vCPU / 1.5 GB is the floor and thrashes without the memory caps; 2 vCPU / 3 GB is comfortable.

## Files

| File | Installed as | Purpose |
| --- | --- | --- |
| `setup-server.sh` | run once as a sudo user | installs and configures everything below; idempotent |
| `Caddyfile` | `/etc/caddy/Caddyfile` | TLS, gzip; `INDEXER_HOST` -> nginx cache, `PREVIEW_HOST` -> static preview |
| `nginx-indexer-cache.conf` | `/etc/nginx/conf.d/indexer-cache.conf` | 5 s cache of GraphQL answers, request collapsing, stale on error, per-IP rate limit |
| `ponder.service` | `/etc/systemd/system/ponder.service` | indexer on 127.0.0.1:42069 with a memory cap and automatic restart |
| `ipfs.service` | `/etc/systemd/system/ipfs.service` | kubo with a Go memory limit |
| `healthcheck.sh` | `/usr/local/bin/indexer-healthcheck`, cron every minute | restarts Ponder after three failed `/health` probes; logs to `/var/log/indexer-healthcheck.log` |

## Fresh machine

```bash
# as the sudo user created by the provider (root login and passwords get disabled by the script)
sudo apt-get update && sudo apt-get install -y git
git clone <bundle or repository> ~/traitleague          # the private repo; a git bundle works offline
cd ~/traitleague/ops
INDEXER_HOST=<ip-with-dashes>.sslip.io PREVIEW_HOST=preview.<ip-with-dashes>.sslip.io \
CHAIN_ID=84532 START_BLOCK=<deploy block> ./setup-server.sh
```

The script asks nothing. It: hardens sshd (keys only, no root), enables ufw (22, 80, 443, 4001), fail2ban and
unattended upgrades; installs Node 22, pnpm, Caddy, nginx-light and kubo (pinned versions, checksums from the
upstream release); creates the `ipfs` system user and `/var/lib/ipfs` with the server profile, gateway off, API on
loopback, DHT client only, connection manager 40/120, resource manager 256 MB; writes the indexer `.env.local`
from `CHAIN_ID`, `START_BLOCK` and the public RPC; installs the dependencies of the indexer; installs and starts the
three services and the health-check cron.

After it finishes: `curl https://$INDEXER_HOST/health` is 200 within a minute and `/ready` once the sync has caught
up (minutes on testnet from the deploy block, longer on mainnet later in its life). The web build for that server
uses `NEXT_PUBLIC_INDEXER_URL=https://$INDEXER_HOST`.

## Publishing a site build

```bash
# on the build machine: web/out plus launch-ui/index.html as web/out/launch-ui/index.html
tar czf site.tgz -C web/out .
# on the server
mkdir -p /var/www/preview.new && tar xzf site.tgz -C /var/www/preview.new && rm -rf /var/www/preview && mv /var/www/preview.new /var/www/preview
sudo rm -rf /var/lib/ipfs/site && sudo mkdir /var/lib/ipfs/site && sudo tar xzf site.tgz -C /var/lib/ipfs/site && sudo chown -R ipfs:ipfs /var/lib/ipfs/site
sudo -u ipfs IPFS_PATH=/var/lib/ipfs ipfs add -r -Q --cid-version 1 /var/lib/ipfs/site      # prints the CID
sudo -u ipfs IPFS_PATH=/var/lib/ipfs ipfs routing provide -r <cid>                           # announce (minutes)
```

The CID goes into `docs/DEPLOY.md` and, by the founder, into the ENS content hash. Old CIDs are unpinned
(`ipfs pin rm`) once ENS points at the new one.

## Updating the indexer code

```bash
cd ~/traitleague && git fetch <bundle> main && git reset --hard FETCH_HEAD     # history was rewritten once; ff-only may fail
sudo systemctl restart ponder            # a schema change needs a new --schema name in ponder.service (see DEPLOY.md)
```

## Switching the indexed chain (testnet -> mainnet)

`indexer/.env.local`: `CHAIN_ID=8453`, `PONDER_RPC_URL_8453=https://mainnet.base.org`, `START_BLOCK=<deploy block>`;
`ponder.service`: `--schema tl_8453`; `sudo systemctl daemon-reload && sudo systemctl restart ponder`. The testnet
schema stays in the PGlite directory until `indexer/.ponder` is cleaned.

## What to watch

- `systemctl status ponder ipfs nginx caddy`, `free -m`, `cat /proc/loadavg`: load above the core count or free
  memory near zero for minutes means the box is too small for the current Ponder working set.
- `/var/log/indexer-healthcheck.log`: every forced restart is logged; more than a few per day is a capacity signal.
- `sudo journalctl -u ponder | grep -i "failed"`: public RPC rate limits show up here first; a private free-tier RPC
  URL in `.env.local` is the fix.
- Disk: PGlite grows with the chain history (49 MB after a day of testnet); 30 GB lasts years.

## Releasing the site (mainnet, since 2026-10-19)

1. Build: `NEXT_PUBLIC_CHAIN_ID=8453 NEXT_PUBLIC_INDEXER_URL=https://45-142-142-2.sslip.io pnpm build` in `web/`, then
   `cp launch-ui/index.html web/out/launch-ui/index.html` and `tar czf site.tgz -C web/out .`.
2. Copy `site.tgz` and `ops/publish-site.sh` to the server as `/home/admin/site.tgz` and run `bash publish-site.sh`:
   it updates the preview directory, adds the directory to the IPFS node, publishes the CID under the IPNS key `site`
   (the ENS content hash points at that IPNS name, so no ENS transaction is needed) and unpins the previous CID.
3. Pin the new CID on the second node as well (`ipfs pin add <cid>`, then `ipfs pin rm <old>`). eth.limo refreshes its
   IPNS cache within about an hour.

`ops/verify-blockscout.sh` is the Blockscout verification loop for mainnet (run on the server, see its header),
`ops/verify-basescan.sh` verifies the same contracts on Basescan through the Etherscan v2 API (run from the contracts
directory of the release commit with `ETHERSCAN_API_KEY` set; see its header for why the forge verifier is not used),
and `ops/post-deploy-check.sh` reads back the deployment (DEPLOY.md 6.3) from `deployments/8453.json`.
