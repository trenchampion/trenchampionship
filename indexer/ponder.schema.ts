import { index, onchainTable, relations } from "ponder";

/**
 * Trenchampionship indexer schema.
 * Everything the web app reads comes from here; everything it writes goes to the chain.
 */

export const character = onchainTable(
  "character",
  (t) => ({
    id: t.bigint().primaryKey(),
    creator: t.hex().notNull(),
    controller: t.hex(), // null once retired
    token: t.hex().notNull(),
    pool: t.hex().notNull(),
    metadataURI: t.text().notNull(),
    name: t.text().notNull(),
    symbol: t.text().notNull(),
    supply: t.bigint().notNull(),
    virtualTl: t.bigint().notNull(),
    creatorAllocBps: t.integer().notNull(),
    vestingDuration: t.integer().notNull(),
    creatorFeeBps: t.integer().notNull(),
    strength: t.integer().notNull(),
    defense: t.integer().notNull(),
    speed: t.integer().notNull(),
    focus: t.integer().notNull(),
    element: t.integer().notNull(),
    special: t.integer().notNull(),
    weakness: t.integer().notNull(),
    rating: t.integer().notNull().default(1000),
    ratedMatches: t.integer().notNull().default(0),
    wins: t.integer().notNull().default(0),
    losses: t.integer().notNull().default(0),
    draws: t.integer().notNull().default(0),
    tlWon: t.bigint().notNull().default(0n),
    licensed: t.boolean().notNull().default(false),
    retired: t.boolean().notNull().default(false),
    // market snapshot (TL per token scaled 1e18), updated on every pool trade
    spotPrice: t.bigint().notNull().default(0n),
    realReserve: t.bigint().notNull().default(0n),
    tradeVolumeTl: t.bigint().notNull().default(0n),
    stakerCount: t.integer().notNull().default(0),
    // WP11: the character's TL/token AMM pair once somebody created it
    ammPair: t.hex(),
    createdAt: t.bigint().notNull(),
    createdBlock: t.bigint().notNull(),
  }),
  (table) => ({
    controllerIdx: index().on(table.controller),
    ratingIdx: index().on(table.rating),
  }),
);

// ------------------------------------------------------------------ AMM (WP11)

export const ammPair = onchainTable(
  "amm_pair",
  (t) => ({
    id: t.hex().primaryKey(), // pair address
    characterId: t.bigint().notNull(),
    token: t.hex().notNull(),
    reserveTl: t.bigint().notNull().default(0n),
    reserveToken: t.bigint().notNull().default(0n),
    lpSupply: t.bigint().notNull().default(0n), // tracked from the LP token's mint/burn transfers
    volumeTl: t.bigint().notNull().default(0n),
    swaps: t.integer().notNull().default(0),
    createdAt: t.bigint().notNull(),
    createdBlock: t.bigint().notNull(),
  }),
  (table) => ({ byCharacter: index().on(table.characterId) }),
);

export const ammSwap = onchainTable(
  "amm_swap",
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    pair: t.hex().notNull(),
    characterId: t.bigint().notNull(),
    trader: t.hex().notNull(),
    isBuy: t.boolean().notNull(), // TL in, tokens out
    tlAmount: t.bigint().notNull(), // TL in (buy) or TL out net of the protocol fee (sell)
    tokenAmount: t.bigint().notNull(),
    protocolFee: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    block: t.bigint().notNull(),
  }),
  (table) => ({ byCharacter: index().on(table.characterId, table.timestamp), byTrader: index().on(table.trader) }),
);

export const ammLiquidity = onchainTable(
  "amm_liquidity",
  (t) => ({
    id: t.text().primaryKey(),
    pair: t.hex().notNull(),
    characterId: t.bigint().notNull(),
    provider: t.hex().notNull(),
    isAdd: t.boolean().notNull(),
    tlAmount: t.bigint().notNull(),
    tokenAmount: t.bigint().notNull(),
    liquidity: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    block: t.bigint().notNull(),
  }),
  (table) => ({ byCharacter: index().on(table.characterId, table.timestamp), byProvider: index().on(table.provider) }),
);

export const poolTrade = onchainTable(
  "pool_trade",
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    characterId: t.bigint().notNull(),
    trader: t.hex().notNull(),
    isBuy: t.boolean().notNull(),
    tlAmount: t.bigint().notNull(), // TL in (buy) or TL out (sell), net of fees for sells
    tokenAmount: t.bigint().notNull(),
    protocolFee: t.bigint().notNull(),
    creatorFee: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    block: t.bigint().notNull(),
  }),
  (table) => ({ byCharacter: index().on(table.characterId, table.timestamp) }),
);

export const launchTrade = onchainTable(
  "launch_trade",
  (t) => ({
    id: t.text().primaryKey(),
    trader: t.hex().notNull(),
    isBuy: t.boolean().notNull(),
    isFounder: t.boolean().notNull(),
    ethAmount: t.bigint().notNull(),
    tlAmount: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    block: t.bigint().notNull(),
  }),
  (table) => ({ byTime: index().on(table.timestamp) }),
);

export const match = onchainTable(
  "match",
  (t) => ({
    id: t.bigint().primaryKey(),
    idA: t.bigint().notNull(),
    idB: t.bigint(), // null for open challenges until accepted
    controllerA: t.hex().notNull(),
    controllerB: t.hex(),
    stake: t.bigint().notNull(),
    preset: t.integer().notNull(),
    open: t.boolean().notNull(),
    tournamentId: t.bigint(),
    status: t.text().notNull(), // Challenged | Accepted | Resolved
    outcome: t.text(), // WinA | WinB | Draw | Void | Expired | Cancelled
    createdAt: t.bigint().notNull(),
    acceptedAt: t.bigint(),
    stakingCloseAt: t.bigint(),
    commitDeadline: t.bigint(),
    committedA: t.boolean().notNull().default(false),
    committedB: t.boolean().notNull().default(false),
    encryptedTacticsA: t.hex(),
    encryptedTacticsB: t.hex(),
    revealedA: t.boolean().notNull().default(false),
    revealedB: t.boolean().notNull().default(false),
    stancesA: t.text(), // "0,1,2"
    energiesA: t.text(),
    stancesB: t.text(),
    energiesB: t.text(),
    roundsA: t.integer(),
    roundsB: t.integer(),
    scoreA: t.text(),
    scoreB: t.text(),
    winners: t.text(),
    stakerReward: t.bigint(),
    totalStakedA: t.bigint().notNull().default(0n),
    totalStakedB: t.bigint().notNull().default(0n),
    resolvedAt: t.bigint(),
  }),
  (table) => ({
    byA: index().on(table.idA),
    byB: index().on(table.idB),
    byStatus: index().on(table.status, table.createdAt),
  }),
);

export const stake = onchainTable(
  "stake",
  (t) => ({
    id: t.text().primaryKey(), // matchId-side-staker
    matchId: t.bigint().notNull(),
    side: t.integer().notNull(),
    staker: t.hex().notNull(),
    amount: t.bigint().notNull(),
    withdrawn: t.boolean().notNull().default(false),
    reward: t.bigint(),
    timestamp: t.bigint().notNull(),
  }),
  (table) => ({ byStaker: index().on(table.staker), byMatch: index().on(table.matchId) }),
);

export const ratingChange = onchainTable(
  "rating_change",
  (t) => ({
    id: t.text().primaryKey(),
    characterId: t.bigint().notNull(),
    season: t.integer().notNull(),
    before: t.integer().notNull(),
    after: t.integer().notNull(),
    rated: t.boolean().notNull(),
    timestamp: t.bigint().notNull(),
  }),
  (table) => ({ byCharacter: index().on(table.characterId, table.timestamp) }),
);

export const season = onchainTable("season", (t) => ({
  id: t.integer().primaryKey(),
  closed: t.boolean().notNull().default(false),
  prize: t.bigint(),
  top: t.text(), // comma separated character ids
  closedAt: t.bigint(),
}));

export const seasonReward = onchainTable(
  "season_reward",
  (t) => ({
    id: t.text().primaryKey(), // season-characterId
    season: t.integer().notNull(),
    characterId: t.bigint().notNull(),
    controller: t.hex().notNull(),
    amount: t.bigint().notNull(),
  }),
  (table) => ({ byController: index().on(table.controller) }),
);

export const tournament = onchainTable(
  "tournament",
  (t) => ({
    id: t.bigint().primaryKey(),
    organizer: t.hex().notNull(),
    size: t.integer().notNull(),
    entry: t.bigint().notNull(),
    organizerFeeBps: t.integer().notNull(),
    status: t.text().notNull(), // Open | Running | Finished | Cancelled
    round: t.integer().notNull().default(0),
    players: t.text().notNull().default(""), // comma separated ids (seeded order once started)
    roundMatches: t.text().notNull().default(""),
    winner: t.bigint(),
    finalist: t.bigint(),
    prizePool: t.bigint(),
    createdAt: t.bigint().notNull(),
  }),
  (table) => ({ byStatus: index().on(table.status, table.createdAt) }),
);

export const treasuryFlow = onchainTable(
  "treasury_flow",
  (t) => ({
    id: t.text().primaryKey(),
    source: t.text().notNull(), // mint | trade
    amount: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
  }),
  (table) => ({ byTime: index().on(table.timestamp) }),
);

export const protocolStats = onchainTable("protocol_stats", (t) => ({
  id: t.text().primaryKey(), // "global"
  characters: t.integer().notNull().default(0),
  matches: t.integer().notNull().default(0),
  resolvedMatches: t.integer().notNull().default(0),
  tlBurned: t.bigint().notNull().default(0n),
  tlToRewardPool: t.bigint().notNull().default(0n),
  tlToTreasury: t.bigint().notNull().default(0n),
  launchEthIn: t.bigint().notNull().default(0n),
  launchEthOut: t.bigint().notNull().default(0n),
  ammVolumeTl: t.bigint().notNull().default(0n),
}));

export const characterRelations = relations(character, ({ many }) => ({
  trades: many(poolTrade),
  ratingChanges: many(ratingChange),
}));

export const poolTradeRelations = relations(poolTrade, ({ one }) => ({
  character: one(character, { fields: [poolTrade.characterId], references: [character.id] }),
}));

export const ratingChangeRelations = relations(ratingChange, ({ one }) => ({
  character: one(character, { fields: [ratingChange.characterId], references: [character.id] }),
}));

export const stakeRelations = relations(stake, ({ one }) => ({
  match: one(match, { fields: [stake.matchId], references: [match.id] }),
}));
