import {
  AmmFactoryAbi,
  AmmPairAbi,
  CharacterFactoryAbi,
  CharacterPoolAbi,
  CharacterTokenAbi,
  ControllerNFTAbi,
  CreatorVestingAbi,
  LaunchPoolAbi,
  MatchManagerAbi,
  RatingAbi,
  RewardPoolAbi,
  StakingVaultAbi,
  TLTokenAbi,
  TournamentAbi,
} from "@/abis";
import { addresses } from "./config";

/** Typed (address, abi) pairs for wagmi hooks. Pool and token addresses come from the indexer per character. */
export function contracts() {
  const a = addresses();
  return {
    tl: { address: a.TLToken, abi: TLTokenAbi },
    launchPool: { address: a.LaunchPool, abi: LaunchPoolAbi },
    factory: { address: a.CharacterFactory, abi: CharacterFactoryAbi },
    nft: { address: a.ControllerNFT, abi: ControllerNFTAbi },
    vesting: { address: a.CreatorVesting, abi: CreatorVestingAbi },
    rewardPool: { address: a.RewardPool, abi: RewardPoolAbi },
    vault: { address: a.StakingVault, abi: StakingVaultAbi },
    rating: { address: a.Rating, abi: RatingAbi },
    matchManager: { address: a.MatchManager, abi: MatchManagerAbi },
    tournament: { address: a.Tournament, abi: TournamentAbi },
    /** WP11; `address` is undefined on deployments that predate the AMM (the UI hides it then). */
    amm: { address: a.AmmFactory, abi: AmmFactoryAbi },
  } as const;
}

export const poolAbi = CharacterPoolAbi;
export const characterTokenAbi = CharacterTokenAbi;
export const ammPairAbi = AmmPairAbi;
