#!/bin/bash
# Verifies the contracts of deployments/8453.json on Basescan through the Etherscan v2 API (chainid 8453) with
# standard-JSON input. Run from the contracts directory of the release commit, with an Etherscan API key in
# ETHERSCAN_API_KEY and an RPC URL in RPC_URL (used only to read nothing: constructor arguments come from the
# broadcast file). Usage: ETHERSCAN_API_KEY=... bash ../ops/verify-basescan.sh [ContractName ...]
#
# Why not `forge verify-contract --verifier etherscan`: since Etherscan moved Base out of its free API tier the
# forge flow stops with "Free API access is not supported for this chain", but the verifysourcecode and
# checkverifystatus endpoints themselves still accept a free key, so this script calls them directly.
set -u
KEY=${ETHERSCAN_API_KEY:?set ETHERSCAN_API_KEY}
API="https://api.etherscan.io/v2/api?chainid=8453"
J=deployments/8453.json
RL=broadcast/Deploy.s.sol/8453/run-latest.json
[ -f "$J" ] && [ -f "$RL" ] || { echo "run from the contracts directory ($J and $RL needed)"; exit 1; }
export PATH="$HOME/.foundry/bin:$PATH"
declare -A P=(
  [PortraitBase]=src/art/PortraitBase.sol [PortraitBody]=src/art/PortraitBody.sol [PortraitFace]=src/art/PortraitFace.sol
  [PortraitItems]=src/art/PortraitItems.sol [PortraitArms]=src/art/PortraitArms.sol [CharacterPortrait]=src/CharacterPortrait.sol
  [TLToken]=src/TLToken.sol [LaunchPool]=src/LaunchPool.sol [CharacterFactory]=src/CharacterFactory.sol
  [ControllerNFT]=src/ControllerNFT.sol [CreatorVesting]=src/CreatorVesting.sol [RewardPool]=src/RewardPool.sol
  [StakingVault]=src/StakingVault.sol [Rating]=src/Rating.sol [MatchManager]=src/MatchManager.sol
  [Tournament]=src/Tournament.sol [AmmFactory]=src/AmmFactory.sol
)
ORDER="PortraitBase PortraitBody PortraitFace PortraitItems PortraitArms CharacterPortrait TLToken LaunchPool CharacterFactory ControllerNFT CreatorVesting RewardPool StakingVault Rating MatchManager Tournament AmmFactory"
[ $# -gt 0 ] && ORDER="$*"
W=$(mktemp -d)
# Constructor arguments = creation transaction input minus the compiled creation bytecode.
ctor_args() {
  local name=$1 path=$2
  local input bytecode
  input=$(jq -r --arg n "$name" '.transactions[] | select(.transactionType=="CREATE" and .contractName==$n) | .transaction.input' "$RL")
  bytecode=$(forge inspect "$path:$name" bytecode 2>/dev/null)
  case "$input" in "$bytecode"*) echo "${input#"$bytecode"}";; *) echo "BYTECODE_MISMATCH";; esac
}
exact_match() {
  curl -s -m 25 "$API&module=contract&action=getsourcecode&address=$1&apikey=$KEY" |
    python3 -c 'import sys,json
d=json.load(sys.stdin); r=d["result"][0] if d.get("status")=="1" else {}
sys.exit(0 if r.get("SourceCode") and not r.get("SimilarMatch") else 1)'
}
for c in $ORDER; do
  addr=$(jq -r ".$c" "$J"); path=${P[$c]}
  if exact_match "$addr"; then echo "$c $addr already verified"; continue; fi
  args=$(ctor_args "$c" "$path")
  [ "$args" = "BYTECODE_MISMATCH" ] && { echo "$c: compiled bytecode is not a prefix of the creation input (wrong commit?)"; continue; }
  forge verify-contract --show-standard-json-input "$addr" "$path:$c" > "$W/$c.json" || { echo "$c: standard JSON failed"; continue; }
  resp=$(curl -s -m 60 -X POST "$API" \
    --data-urlencode "apikey=$KEY" --data-urlencode "module=contract" --data-urlencode "action=verifysourcecode" \
    --data-urlencode "codeformat=solidity-standard-json-input" --data-urlencode "contractaddress=$addr" \
    --data-urlencode "contractname=$path:$c" --data-urlencode "compilerversion=v0.8.26+commit.8a97fa7a" \
    --data-urlencode "constructorArguements=$args" --data-urlencode "licenseType=3" \
    --data-urlencode "sourceCode@$W/$c.json")
  echo "$(date -u +%H:%M:%S) $c $addr submit: $resp"
  guid=$(echo "$resp" | python3 -c 'import sys,json
d=json.load(sys.stdin); print(d["result"] if d.get("status")=="1" else "")' 2>/dev/null)
  [ -z "$guid" ] && { sleep 2; continue; }
  for _ in $(seq 1 18); do
    sleep 10
    st=$(curl -s -m 20 "$API&module=contract&action=checkverifystatus&guid=$guid&apikey=$KEY")
    echo "  $st"
    echo "$st" | grep -q 'Pending' || break
  done
  sleep 2
done
rm -rf "$W"
echo "--- status"
for c in $ORDER; do
  addr=$(jq -r ".$c" "$J")
  if exact_match "$addr"; then echo "$c verified (exact match)"; else echo "$c NOT verified"; fi
  sleep 0.3
done
