#!/bin/bash
# Post-deploy checks (DEPLOY.md 6.3) against Base mainnet; run as the VM user `user`.
export PATH="$HOME/.foundry/bin:$PATH"
RPC=$(grep -o 'https://base-mainnet.g.alchemy.com/v2/[A-Za-z0-9_-]*' "$HOME/Desktop/alchemy.txt" | head -1)
cd "$HOME/trenchampionship/contracts"
D=0x74B762a3f0e953501111657804D52081b1189Dc7
J=deployments/8453.json
echo "--- $J"; cat "$J"
g() { jq -r ".$1" "$J"; }
LP=$(g LaunchPool); TL=$(g TLToken); RP=$(g RewardPool); CF=$(g CharacterFactory); NFT=$(g ControllerNFT)
MM=$(g MatchManager); RT=$(g Rating); TO=$(g Tournament); VS=$(g CreatorVesting); ART=$(g CharacterPortrait)
c() { cast call "$1" "$2" "${@:3}" --rpc-url "$RPC"; }
echo "--- state"
echo "realReserve          $(c $LP 'realReserve()(uint256)')   (expect 285714285714285714)"
echo "RewardPool TRCH      $(c $TL 'balanceOf(address)(uint256)' $RP)   (expect 100000000e18)"
echo "deployer TRCH        $(c $TL 'balanceOf(address)(uint256)' $D)   (expect ~2e26)"
echo "LaunchPool TRCH      $(c $TL 'balanceOf(address)(uint256)' $LP)"
echo "GUARDIAN             $(c $CF 'GUARDIAN()(address)')"
echo "TREASURY             $(c $CF 'TREASURY()(address)')"
echo "DEPLOY_TIME          $(c $CF 'DEPLOY_TIME()(uint256)')"
echo "--- wiring (each must equal the address in $J)"
echo "factory.nft          $(c $CF 'nft()(address)')  vs $NFT"
echo "factory.vesting      $(c $CF 'vesting()(address)')  vs $VS"
echo "nft.ART              $(c $NFT 'ART()(address)')  vs $ART"
echo "nft.RATING           $(c $NFT 'RATING()(address)')  vs $RT"
echo "nft.MATCH_MANAGER    $(c $NFT 'MATCH_MANAGER()(address)')  vs $MM"
echo "nft.TOURNAMENT       $(c $NFT 'TOURNAMENT()(address)')  vs $TO"
echo "rp.MATCH_MANAGER     $(c $RP 'MATCH_MANAGER()(address)')  vs $MM"
echo "rp.RATING            $(c $RP 'RATING()(address)')  vs $RT"
echo "mm.TOURNAMENT        $(c $MM 'TOURNAMENT()(address)')  vs $TO"
echo "--- deployer"
echo "ETH $(cast balance $D --rpc-url "$RPC" -e)  nonce $(cast nonce $D --rpc-url "$RPC")"
echo "--- broadcast"
echo "tx hashes: $(grep -c '"hash"' broadcast/Deploy.s.sol/8453/run-latest.json)"
echo "first block: $(jq -r '.receipts[0].blockNumber' broadcast/Deploy.s.sol/8453/run-latest.json) ($(( $(jq -r '.receipts[0].blockNumber' broadcast/Deploy.s.sol/8453/run-latest.json) )))"
echo "--- verification status"
for n in PortraitBase PortraitBody PortraitFace PortraitItems PortraitArms CharacterPortrait TLToken LaunchPool CharacterFactory ControllerNFT CreatorVesting RewardPool StakingVault Rating MatchManager Tournament AmmFactory; do
  a=$(g $n); v=$(curl -s --max-time 20 -A "Mozilla/5.0" "https://base.blockscout.com/api/v2/smart-contracts/$a" | python3 -c 'import sys,json
try:
  d=json.load(sys.stdin); print(d.get("is_verified"))
except Exception: print("?")')
  printf "%-18s %s %s\n" "$n" "$a" "$v"
done
