#!/bin/bash
# Writes the plain-number supply files that price trackers read (CoinGecko and CoinMarketCap ask for an endpoint that
# returns a bare number): /var/www/api/total-supply and /var/www/api/circulating-supply, in whole TRCH.
# Circulating = total supply minus the unsold tokens still on the LaunchPool curve minus the RewardPool seed.
# Runs from cron every 5 minutes on the server; Caddy serves /var/www/api under /api/ (see Caddyfile).
set -u
RPC=${RPC:-https://base-rpc.publicnode.com}
TL=0x32602ce776A045145e94507030E0C0cA8E92BD18
LP=0x6C58A3ac191fE0f257a9864Ac880527842519d60
RP=0xC682820c5C4266A2DED2CD2f9ac089A3b118900c
OUT=${OUT:-/var/www/api}
call() { # contract, calldata -> decimal
  local r
  r=$(curl -s -m 15 -X POST "$RPC" -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",\"params\":[{\"to\":\"$1\",\"data\":\"$2\"},\"latest\"]}" |
    python3 -c 'import sys,json; d=json.load(sys.stdin); r=d.get("result"); print(int(r,16) if r and r!="0x" else "")')
  [ -n "$r" ] || exit 1
  echo "$r"
}
pad() { printf '%064s' "${1#0x}" | tr ' ' 0; }
total=$(call $TL 0x18160ddd) || exit 1                                   # totalSupply()
onCurve=$(call $TL "0x70a08231$(pad $LP)") || exit 1                   # balanceOf(LaunchPool)
seed=$(call $TL "0x70a08231$(pad $RP)") || exit 1                      # balanceOf(RewardPool)
python3 - "$total" "$onCurve" "$seed" "$OUT" <<'EOF'
import sys, os, tempfile
total, on_curve, seed, out = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
circ = max(total - on_curve - seed, 0)
os.makedirs(out, exist_ok=True)
for name, wei in (("total-supply", total), ("circulating-supply", circ)):
    tmp = tempfile.NamedTemporaryFile("w", dir=out, delete=False)
    tmp.write(str(wei // 10**18)); tmp.close()
    os.chmod(tmp.name, 0o644); os.replace(tmp.name, os.path.join(out, name))
EOF
