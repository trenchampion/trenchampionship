"use client";

import { useQuery } from "@tanstack/react-query";
import { CHARACTER_FIELDS, MATCH_FIELDS, TOURNAMENT_FIELDS, gql, type CharacterRow, type MatchRow, type TournamentRow } from "./indexer";

type Items<T> = { items: T[] };

export function useCharacters(orderBy = "rating", limit = 50) {
  return useQuery({
    queryKey: ["characters", orderBy, limit],
    queryFn: () =>
      gql<{ characters: Items<CharacterRow> }>(
        `query($orderBy: String!, $limit: Int!) { characters(orderBy: $orderBy, orderDirection: "desc", limit: $limit) { items { ${CHARACTER_FIELDS} } } }`,
        { orderBy, limit },
      ).then((d) => d.characters.items),
  });
}

export function useCharacter(id: string | null) {
  return useQuery({
    queryKey: ["character", id],
    enabled: !!id,
    queryFn: () =>
      gql<{ character: CharacterRow | null }>(`query($id: BigInt!) { character(id: $id) { ${CHARACTER_FIELDS} } }`, { id }).then(
        (d) => d.character,
      ),
  });
}

/** Characters whose controller NFT the address holds (lower-cased, as the indexer stores it). */
export function useMyCharacters(address?: string) {
  return useQuery({
    queryKey: ["myCharacters", address?.toLowerCase()],
    enabled: !!address,
    queryFn: () =>
      gql<{ characters: Items<CharacterRow> }>(
        `query($c: String!) { characters(where: { controller: $c }) { items { ${CHARACTER_FIELDS} } } }`,
        { c: address!.toLowerCase() },
      ).then((d) => d.characters.items),
  });
}

/** Characters by id, for lists that only carry ids (matches, brackets). Skipped while the list is empty. */
export function useCharactersByIds(ids: string[]) {
  const key = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ["charactersByIds", key],
    enabled: key.length > 0,
    queryFn: () =>
      gql<{ characters: Items<CharacterRow> }>(
        `query($ids: [BigInt!], $limit: Int!) { characters(where: { id_in: $ids }, limit: $limit) { items { ${CHARACTER_FIELDS} } } }`,
        { ids: key, limit: Math.min(key.length, 1000) },
      ).then((d) => d.characters.items),
  });
}

// ------------------------------------------------------------------ markets (WP11/WP12)

export type AmmPairRow = {
  id: string;
  characterId: string;
  token: string;
  reserveTl: string;
  reserveToken: string;
  lpSupply: string;
  volumeTl: string;
  swaps: number;
  createdAt: string;
};

const AMM_PAIR_FIELDS = "id characterId token reserveTl reserveToken lpSupply volumeTl swaps createdAt";

/** Every AMM pair with its reserves; keyed by character id on the marketplace. */
export function useAmmPairs(limit = 1000) {
  return useQuery({
    queryKey: ["ammPairs", limit],
    queryFn: () =>
      gql<{ ammPairs: Items<AmmPairRow> }>(`query($limit: Int!) { ammPairs(limit: $limit) { items { ${AMM_PAIR_FIELDS} } } }`, { limit }).then(
        (d) => d.ammPairs.items,
      ),
  });
}

export type TradeRow = {
  id: string;
  venue: "curve" | "amm";
  characterId: string;
  trader: string;
  isBuy: boolean;
  tlAmount: string;
  tokenAmount: string;
  timestamp: string;
};

type PoolTradeRow = { id: string; characterId: string; trader: string; isBuy: boolean; tlAmount: string; tokenAmount: string; timestamp: string };
type AmmSwapRow = PoolTradeRow;

/** Latest trades on curves and AMM pools merged by time; `trader` (lower-cased) narrows to one wallet. */
export function useTrades(limit = 50, trader?: string, enabled = true) {
  const who = trader?.toLowerCase();
  return useQuery({
    queryKey: ["trades", limit, who ?? null],
    enabled,
    queryFn: async () => {
      const where = who ? `where: { trader: "${who}" }, ` : "";
      const d = await gql<{ poolTrades: Items<PoolTradeRow>; ammSwaps: Items<AmmSwapRow> }>(
        `query($limit: Int!) {
          poolTrades(${where}orderBy: "timestamp", orderDirection: "desc", limit: $limit) { items { id characterId trader isBuy tlAmount tokenAmount timestamp } }
          ammSwaps(${where}orderBy: "timestamp", orderDirection: "desc", limit: $limit) { items { id characterId trader isBuy tlAmount tokenAmount timestamp } }
        }`,
        { limit },
      );
      const rows: TradeRow[] = [
        ...d.poolTrades.items.map((t) => ({ ...t, venue: "curve" as const })),
        ...d.ammSwaps.items.map((t) => ({ ...t, venue: "amm" as const })),
      ];
      rows.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      return rows.slice(0, limit);
    },
  });
}

export function useMatches(where: Record<string, unknown> = {}, limit = 50) {
  return useQuery({
    queryKey: ["matches", where, limit],
    queryFn: () =>
      gql<{ matchs: Items<MatchRow> }>(
        `query($where: matchFilter, $limit: Int!) { matchs(where: $where, orderBy: "createdAt", orderDirection: "desc", limit: $limit) { items { ${MATCH_FIELDS} } } }`,
        { where, limit },
      ).then((d) => d.matchs.items),
  });
}

export function useMatch(id: string | null) {
  return useQuery({
    queryKey: ["match", id],
    enabled: !!id,
    queryFn: () => gql<{ match: MatchRow | null }>(`query($id: BigInt!) { match(id: $id) { ${MATCH_FIELDS} } }`, { id }).then((d) => d.match),
  });
}

export function useTournaments(limit = 50) {
  return useQuery({
    queryKey: ["tournaments", limit],
    queryFn: () =>
      gql<{ tournaments: Items<TournamentRow> }>(
        `query($limit: Int!) { tournaments(orderBy: "createdAt", orderDirection: "desc", limit: $limit) { items { ${TOURNAMENT_FIELDS} } } }`,
        { limit },
      ).then((d) => d.tournaments.items),
  });
}

export type ProtocolStats = {
  characters: number;
  matches: number;
  resolvedMatches: number;
  tlBurned: string;
  tlToRewardPool: string;
  tlToTreasury: string;
  launchEthIn: string;
  launchEthOut: string;
};

export function useProtocolStats() {
  return useQuery({
    queryKey: ["protocolStats"],
    queryFn: () =>
      gql<{ protocolStats: ProtocolStats | null }>(
        `{ protocolStats(id: "global") { characters matches resolvedMatches tlBurned tlToRewardPool tlToTreasury launchEthIn launchEthOut } }`,
      ).then((d) => d.protocolStats),
  });
}

export type SeasonRow = { id: number; closed: boolean; prize: string | null; top: string | null; closedAt: string | null };

export function useSeasons() {
  return useQuery({
    queryKey: ["seasons"],
    queryFn: () =>
      gql<{ seasons: Items<SeasonRow> }>(`{ seasons(orderBy: "id", orderDirection: "desc") { items { id closed prize top closedAt } } }`).then(
        (d) => d.seasons.items,
      ),
  });
}

export type FounderTrade = { trader: string; ethAmount: string; tlAmount: string; timestamp: string };

export function useFounderBuy() {
  return useQuery({
    queryKey: ["founder"],
    queryFn: () =>
      gql<{ launchTrades: Items<FounderTrade> }>(`{ launchTrades(where: { isFounder: true }) { items { trader ethAmount tlAmount timestamp } } }`).then(
        (d) => d.launchTrades.items[0] ?? null,
      ),
  });
}

export type TreasuryFlow = { source: string; amount: string; timestamp: string };

export function useTreasuryFlows(limit = 20) {
  return useQuery({
    queryKey: ["treasuryFlows", limit],
    queryFn: () =>
      gql<{ treasuryFlows: Items<TreasuryFlow> }>(
        `query($limit: Int!) { treasuryFlows(orderBy: "timestamp", orderDirection: "desc", limit: $limit) { items { source amount timestamp } } }`,
        { limit },
      ).then((d) => d.treasuryFlows.items),
  });
}
