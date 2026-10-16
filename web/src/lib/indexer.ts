import { INDEXER_URL } from "./config";

/** Minimal GraphQL client for the Ponder indexer. Reads only; everything written goes to the chain. */
export async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${INDEXER_URL.replace(/\/$/, "")}/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`indexer ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data as T;
}

export type CharacterRow = {
  id: string;
  creator: string;
  controller: string | null;
  token: string;
  pool: string;
  metadataURI: string;
  name: string;
  symbol: string;
  strength: number;
  defense: number;
  speed: number;
  focus: number;
  element: number;
  special: number;
  weakness: number;
  rating: number;
  ratedMatches: number;
  wins: number;
  losses: number;
  draws: number;
  tlWon: string;
  licensed: boolean;
  retired: boolean;
  spotPrice: string;
  realReserve: string;
  tradeVolumeTl: string;
  stakerCount: number;
  creatorFeeBps: number;
  creatorAllocBps: number;
  vestingDuration: number;
  supply: string;
  virtualTl: string;
  createdAt: string;
};

export type MatchRow = {
  id: string;
  idA: string;
  idB: string | null;
  controllerA: string;
  controllerB: string | null;
  stake: string;
  preset: number;
  open: boolean;
  tournamentId: string | null;
  status: string;
  outcome: string | null;
  createdAt: string;
  acceptedAt: string | null;
  stakingCloseAt: string | null;
  commitDeadline: string | null;
  committedA: boolean;
  committedB: boolean;
  encryptedTacticsA: string | null;
  encryptedTacticsB: string | null;
  revealedA: boolean;
  revealedB: boolean;
  stancesA: string | null;
  energiesA: string | null;
  stancesB: string | null;
  energiesB: string | null;
  roundsA: number | null;
  roundsB: number | null;
  scoreA: string | null;
  scoreB: string | null;
  winners: string | null;
  stakerReward: string | null;
  totalStakedA: string;
  totalStakedB: string;
  resolvedAt: string | null;
};

export type TournamentRow = {
  id: string;
  organizer: string;
  size: number;
  entry: string;
  organizerFeeBps: number;
  status: string;
  round: number;
  players: string;
  roundMatches: string;
  winner: string | null;
  finalist: string | null;
  prizePool: string | null;
  createdAt: string;
};

export const CHARACTER_FIELDS = `
  id creator controller token pool metadataURI name symbol
  strength defense speed focus element special weakness
  rating ratedMatches wins losses draws tlWon licensed retired
  spotPrice realReserve tradeVolumeTl stakerCount creatorFeeBps creatorAllocBps vestingDuration supply virtualTl createdAt
`;

export const MATCH_FIELDS = `
  id idA idB controllerA controllerB stake preset open tournamentId status outcome
  createdAt acceptedAt stakingCloseAt commitDeadline committedA committedB encryptedTacticsA encryptedTacticsB
  revealedA revealedB stancesA energiesA stancesB energiesB roundsA roundsB scoreA scoreB winners stakerReward
  totalStakedA totalStakedB resolvedAt
`;

export const TOURNAMENT_FIELDS = `
  id organizer size entry organizerFeeBps status round players roundMatches winner finalist prizePool createdAt
`;
