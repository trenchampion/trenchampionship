#!/bin/bash
# Verifies the contracts of deployments/8453.json on Base mainnet Blockscout via the v2 standard-input endpoint.
# Cloudflare in front of base.blockscout.com rejects non-browser user agents, so every request carries a browser UA.
# Needs 8453.json and stdjson-<Name>.json (forge verify-contract --show-standard-json-input <addr> src/X.sol:X) next to it.
cd /home/admin/verify8453
UA="Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"
HOST=https://base.blockscout.com
declare -A A
while IFS= read -r line; do n=$(echo "$line" | sed -n 's/.*"\([A-Za-z]*\)": *"\(0x[0-9a-fA-F]*\)".*/\1 \2/p'); [ -n "$n" ] && A[${n% *}]=${n#* }; done < 8453.json
declare -A P=(
  [TLToken]=src/TLToken.sol [LaunchPool]=src/LaunchPool.sol [CharacterFactory]=src/CharacterFactory.sol
  [ControllerNFT]=src/ControllerNFT.sol [CreatorVesting]=src/CreatorVesting.sol [RewardPool]=src/RewardPool.sol
  [StakingVault]=src/StakingVault.sol [Rating]=src/Rating.sol [MatchManager]=src/MatchManager.sol
  [Tournament]=src/Tournament.sol [AmmFactory]=src/AmmFactory.sol [CharacterPortrait]=src/CharacterPortrait.sol
  [PortraitBase]=src/art/PortraitBase.sol [PortraitBody]=src/art/PortraitBody.sol [PortraitFace]=src/art/PortraitFace.sol
  [PortraitItems]=src/art/PortraitItems.sol [PortraitArms]=src/art/PortraitArms.sol
)
verified() { curl -s -m 20 -A "$UA" -H "Accept: application/json" "$HOST/api/v2/smart-contracts/$1" | grep -q '"is_verified":true'; }
for c in PortraitBase PortraitBody PortraitFace PortraitItems PortraitArms CharacterPortrait TLToken LaunchPool CharacterFactory ControllerNFT CreatorVesting RewardPool StakingVault Rating MatchManager Tournament AmmFactory; do
  addr=${A[$c]}; [ -z "$addr" ] && { echo "$c: no address"; continue; }
  if verified "$addr"; then echo "$c already verified"; continue; fi
  for try in $(seq 1 14); do
    code=$(curl -s -m 90 -A "$UA" -o resp.txt -w '%{http_code}' -X POST "$HOST/api/v2/smart-contracts/$addr/verification/via/standard-input" -F "compiler_version=v0.8.26+commit.8a97fa7a" -F "contract_name=${P[$c]}:$c" -F "autodetect_constructor_args=true" -F "license_type=mit" -F "files[0]=@stdjson-$c.json;type=application/json")
    echo "$(date -u +%H:%M) $c try $try: HTTP $code $(head -c 80 resp.txt | tr -d '\n')"
    if [ "$code" = "200" ]; then
      for w in $(seq 1 12); do sleep 10; verified "$addr" && { echo "$c VERIFIED"; break; }; done
      sleep 60; break
    fi
    sleep 300
  done
done
echo "LOOP DONE $(date -u)"
