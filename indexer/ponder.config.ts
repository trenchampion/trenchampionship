import { createConfig, factory } from "ponder";
import { getAbiItem, http } from "viem";
import { readFileSync } from "node:fs";

import { AmmFactoryAbi } from "./abis/AmmFactory";
import { AmmPairAbi } from "./abis/AmmPair";
import { CharacterFactoryAbi } from "./abis/CharacterFactory";
import { CharacterPoolAbi } from "./abis/CharacterPool";
import { ControllerNFTAbi } from "./abis/ControllerNFT";
import { CreatorVestingAbi } from "./abis/CreatorVesting";
import { LaunchPoolAbi } from "./abis/LaunchPool";
import { MatchManagerAbi } from "./abis/MatchManager";
import { RatingAbi } from "./abis/Rating";
import { RewardPoolAbi } from "./abis/RewardPool";
import { StakingVaultAbi } from "./abis/StakingVault";
import { TournamentAbi } from "./abis/Tournament";

/**
 * One deployment per process: CHAIN_ID selects ../contracts/deployments/<id>.json, which the
 * deploy script writes. RPC comes from PONDER_RPC_URL_<id>: one URL, or several separated by commas,
 * in which case Ponder spreads the requests over them and skips one that fails (keyless public endpoints
 * are enough for realtime sync). POLLING_INTERVAL_MS (default 2000, the Base block time) sets how often
 * the head is polled; every poll costs a block and a log request.
 */
const chainId = Number(process.env.CHAIN_ID ?? "31337");
const startBlock = Number(process.env.START_BLOCK ?? "0");
const deployment = JSON.parse(
  readFileSync(new URL(`../contracts/deployments/${chainId}.json`, import.meta.url), "utf8"),
) as Record<string, `0x${string}`>;
const addr = (name: string): `0x${string}` => {
  const a = deployment[name];
  if (!a) throw new Error(`missing ${name} in deployments/${chainId}.json`);
  return a;
};

const chainName = { 31337: "anvil", 84532: "baseSepolia", 8453: "base" }[chainId] ?? `chain${chainId}`;
const rpcUrls = (process.env[`PONDER_RPC_URL_${chainId}`] ?? "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);
if (rpcUrls.length === 0) throw new Error(`PONDER_RPC_URL_${chainId} is not set`);
const pollingInterval = Number(process.env.POLLING_INTERVAL_MS ?? "2000");

// WP11: deployments made before the AMM existed have no AmmFactory; the zero address never emits,
// so the AMM handlers simply stay idle until the next deploy writes the address.
const ZERO = "0x0000000000000000000000000000000000000000" as const;
const ammFactory = deployment.AmmFactory ?? ZERO;
if (ammFactory === ZERO) console.warn(`deployments/${chainId}.json has no AmmFactory: AMM indexing disabled`);

export default createConfig({
  chains: {
    [chainName]: {
      id: chainId,
      rpc: rpcUrls.length === 1 ? http(rpcUrls[0]) : rpcUrls,
      pollingInterval,
    },
  },
  contracts: {
    LaunchPool: { abi: LaunchPoolAbi, chain: chainName, address: addr("LaunchPool"), startBlock },
    CharacterFactory: {
      abi: CharacterFactoryAbi,
      chain: chainName,
      address: addr("CharacterFactory"),
      startBlock,
    },
    CharacterPool: {
      abi: CharacterPoolAbi,
      chain: chainName,
      address: factory({
        address: addr("CharacterFactory"),
        event: getAbiItem({ abi: CharacterFactoryAbi, name: "CharacterCreated" }),
        parameter: "pool",
      }),
      startBlock,
    },
    ControllerNFT: { abi: ControllerNFTAbi, chain: chainName, address: addr("ControllerNFT"), startBlock },
    CreatorVesting: { abi: CreatorVestingAbi, chain: chainName, address: addr("CreatorVesting"), startBlock },
    RewardPool: { abi: RewardPoolAbi, chain: chainName, address: addr("RewardPool"), startBlock },
    StakingVault: { abi: StakingVaultAbi, chain: chainName, address: addr("StakingVault"), startBlock },
    Rating: { abi: RatingAbi, chain: chainName, address: addr("Rating"), startBlock },
    MatchManager: { abi: MatchManagerAbi, chain: chainName, address: addr("MatchManager"), startBlock },
    Tournament: { abi: TournamentAbi, chain: chainName, address: addr("Tournament"), startBlock },
    AmmFactory: { abi: AmmFactoryAbi, chain: chainName, address: ammFactory, startBlock },
    AmmPair: {
      abi: AmmPairAbi,
      chain: chainName,
      address: factory({
        address: ammFactory,
        event: getAbiItem({ abi: AmmFactoryAbi, name: "PairCreated" }),
        parameter: "pair",
      }),
      startBlock,
    },
  },
});
