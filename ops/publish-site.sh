#!/bin/bash
# Server side of a site release: unpacks /home/admin/site.tgz (web/out plus launch-ui/index.html as launch-ui/) into the
# preview directory and the IPFS node, publishes the new CID under the IPNS key "site" and unpins the previous one.
# Build machine: NEXT_PUBLIC_CHAIN_ID=8453 NEXT_PUBLIC_INDEXER_URL=<indexer> pnpm build; tar czf site.tgz -C web/out .
set -e
cd /home/admin
test -f site.tgz
mkdir -p /var/www/preview.new && tar xzf site.tgz -C /var/www/preview.new
rm -rf /var/www/preview.old && mv /var/www/preview /var/www/preview.old && mv /var/www/preview.new /var/www/preview && rm -rf /var/www/preview.old
echo "preview updated"
OLD=$(sudo -u ipfs IPFS_PATH=/var/lib/ipfs ipfs name resolve /ipns/k51qzi5uqu5dh5hl92drldnpnrz9mvm4kunxtil96oyi2ksur2rrd3bi2lmvss 2>/dev/null | sed 's#/ipfs/##' || true)
echo "previous IPNS target: $OLD"
sudo rm -rf /var/lib/ipfs/site && sudo mkdir /var/lib/ipfs/site && sudo tar xzf site.tgz -C /var/lib/ipfs/site && sudo chown -R ipfs:ipfs /var/lib/ipfs/site
CID=$(sudo -u ipfs IPFS_PATH=/var/lib/ipfs ipfs add -r -Q --cid-version 1 /var/lib/ipfs/site)
echo "CID $CID"
sudo -u ipfs IPFS_PATH=/var/lib/ipfs ipfs name publish --key=site --allow-offline --lifetime=168h "/ipfs/$CID"
if [ -n "$OLD" ] && [ "$OLD" != "$CID" ]; then sudo -u ipfs IPFS_PATH=/var/lib/ipfs ipfs pin rm "$OLD" >/dev/null 2>&1 && echo "unpinned $OLD" || true; fi
setsid nohup sudo -u ipfs IPFS_PATH=/var/lib/ipfs ipfs routing provide -r "$CID" >/dev/null 2>&1 < /dev/null &
rm -f site.tgz
echo "IPNS now: $(sudo -u ipfs IPFS_PATH=/var/lib/ipfs ipfs name resolve /ipns/k51qzi5uqu5dh5hl92drldnpnrz9mvm4kunxtil96oyi2ksur2rrd3bi2lmvss 2>/dev/null)"
for p in / /launch-ui/ /transparency/; do printf "preview %s " "$p"; curl -s -o /dev/null -w "%{http_code}\n" --max-time 20 "https://preview.45-142-142-2.sslip.io$p"; done
