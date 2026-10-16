import { ponder } from "ponder:registry";
import {
  ammLiquidity,
  ammPair,
  ammSwap,
  character,
  launchTrade,
  match,
  poolTrade,
  protocolStats,
  ratingChange,
  season,
  seasonReward,
  stake,
  tournament,
  treasuryFlow,
} from "ponder:schema";
import { eq } from "ponder";

const OUTCOME = ["Pending", "WinA", "WinB", "Draw", "Void", "Expired", "Cancelled"] as const;
const T_STATUS = ["Open", "Running", "Finished", "Cancelled"] as const;
const PRESET_SECONDS = [3600n, 86400n, 43200n] as const;
const BPS = 10_000n;

// Config.sol constants mirrored for derived stats (rake 5 % = 3 % pool / 2 % burn; mint fee 5000 TL 50/25/25).
const MINT_FEE = 5_000n * 10n ** 18n;
const MINT_BURN_BPS = 5_000n;
const MINT_REWARDPOOL_BPS = 2_500n;
const TREASURY_MINT_BPS = 2_500n;
const RAKE_TO_REWARDPOOL_BPS = 300n;
const RAKE_TO_BURN_BPS = 200n;
const TREASURY_AMM_BPS = 5_000n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const join = (xs: readonly (number | bigint)[]) => xs.map(String).join(",");

async function bumpStats(
  context: Parameters<Parameters<typeof ponder.on>[1]>[0]["context"],
  patch: Partial<typeof protocolStats.$inferInsert>,
) {
  await context.db
    .insert(protocolStats)
    .values({ id: "global", ...patch })
    .onConflictDoUpdate((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) {
        const cur = (row as Record<string, unknown>)[k];
        out[k] = typeof v === "bigint" ? (cur as bigint) + v : typeof v === "number" ? (cur as number) + v : v;
      }
      return out;
    });
}

// ------------------------------------------------------------------ LaunchPool

ponder.on("LaunchPool:FounderBuy", async ({ event, context }) => {
  await context.db.insert(launchTrade).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    trader: event.args.founder,
    isBuy: true,
    isFounder: true,
    ethAmount: event.args.ethIn,
    tlAmount: event.args.tlOut,
    timestamp: event.block.timestamp,
    block: event.block.number,
  });
  await bumpStats(context, { launchEthIn: event.args.ethIn });
});

ponder.on("LaunchPool:Buy", async ({ event, context }) => {
  await context.db.insert(launchTrade).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    trader: event.args.buyer,
    isBuy: true,
    isFounder: false,
    ethAmount: event.args.ethIn,
    tlAmount: event.args.tlOut,
    timestamp: event.block.timestamp,
    block: event.block.number,
  });
  await bumpStats(context, { launchEthIn: event.args.ethIn });
});

ponder.on("LaunchPool:Sell", async ({ event, context }) => {
  await context.db.insert(launchTrade).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    trader: event.args.seller,
    isBuy: false,
    isFounder: false,
    ethAmount: event.args.ethOut,
    tlAmount: event.args.tlIn,
    timestamp: event.block.timestamp,
    block: event.block.number,
  });
  await bumpStats(context, { launchEthOut: event.args.ethOut });
});

// ------------------------------------------------------------------ Characters

ponder.on("CharacterFactory:CharacterCreated", async ({ event, context }) => {
  const { characterId, creator, token, pool, metadataURI, traits, tokenomics } = event.args;
  const [realReserve, spot] = await Promise.all([
    context.client.readContract({ abi: context.contracts.CharacterPool.abi, address: pool, functionName: "realReserve" }),
    context.client.readContract({ abi: context.contracts.CharacterPool.abi, address: pool, functionName: "spotPrice" }),
  ]);
  // trades emitted earlier in this transaction (the creator's first buy) are already stored
  const earlier = await context.db.sql.select({ amount: poolTrade.tlAmount }).from(poolTrade).where(eq(poolTrade.characterId, characterId));
  const volume = earlier.reduce((acc, r) => acc + r.amount, 0n);
  await context.db.insert(character).values({
    spotPrice: spot as bigint,
    realReserve: realReserve as bigint,
    tradeVolumeTl: volume,
    id: characterId,
    creator,
    controller: creator,
    token,
    pool,
    metadataURI,
    name: tokenomics.name,
    symbol: tokenomics.symbol,
    supply: tokenomics.supply,
    virtualTl: tokenomics.virtualTl,
    creatorAllocBps: Number(tokenomics.creatorAllocBps),
    vestingDuration: Number(tokenomics.vestingDuration),
    creatorFeeBps: Number(tokenomics.creatorFeeBps),
    strength: Number(traits.strength),
    defense: Number(traits.defense),
    speed: Number(traits.speed),
    focus: Number(traits.focus),
    element: Number(traits.element),
    special: Number(traits.special),
    weakness: Number(traits.weakness),
    createdAt: event.block.timestamp,
    createdBlock: event.block.number,
  });
  const toTreasury = (MINT_FEE * TREASURY_MINT_BPS) / BPS;
  await context.db.insert(treasuryFlow).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    source: "mint",
    amount: toTreasury,
    timestamp: event.block.timestamp,
  });
  await bumpStats(context, {
    characters: 1,
    tlBurned: (MINT_FEE * MINT_BURN_BPS) / BPS,
    tlToRewardPool: (MINT_FEE * MINT_REWARDPOOL_BPS) / BPS,
    tlToTreasury: toTreasury,
  });
});

ponder.on("ControllerNFT:Transfer", async ({ event, context }) => {
  const { to, tokenId } = event.args;
  // The mint is emitted before CharacterCreated in the same transaction; that handler sets the
  // controller itself, so a transfer for a character row that does not exist yet is skipped.
  const existing = await context.db.find(character, { id: tokenId });
  if (!existing) return;
  await context.db
    .update(character, { id: tokenId })
    .set(to === ZERO_ADDRESS ? { controller: null, retired: true } : { controller: to });
});

// ------------------------------------------------------------------ Character pools

async function recordTrade(
  context: Parameters<Parameters<typeof ponder.on>[1]>[0]["context"],
  event: { transaction: { hash: `0x${string}` }; log: { logIndex: number; address: `0x${string}` }; block: { timestamp: bigint; number: bigint } },
  trader: `0x${string}`,
  isBuy: boolean,
  tlAmount: bigint,
  tokenAmount: bigint,
  protocolFee: bigint,
  creatorFee: bigint,
) {
  const [characterId, realReserve, spot] = await Promise.all([
    context.client.readContract({ abi: context.contracts.CharacterPool.abi, address: event.log.address, functionName: "CHARACTER_ID" }),
    context.client.readContract({ abi: context.contracts.CharacterPool.abi, address: event.log.address, functionName: "realReserve" }),
    context.client.readContract({ abi: context.contracts.CharacterPool.abi, address: event.log.address, functionName: "spotPrice" }),
  ]);
  await context.db.insert(poolTrade).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    characterId: characterId as bigint,
    trader,
    isBuy,
    tlAmount,
    tokenAmount,
    protocolFee,
    creatorFee,
    timestamp: event.block.timestamp,
    block: event.block.number,
  });
  // The creator's first buy is emitted before CharacterCreated in the same transaction; the
  // character row then does not exist yet and CharacterCreated picks up the pool state itself.
  const existing = await context.db.find(character, { id: characterId as bigint });
  if (existing) {
    await context.db.update(character, { id: characterId as bigint }).set((row) => ({
      spotPrice: spot as bigint,
      realReserve: realReserve as bigint,
      tradeVolumeTl: row.tradeVolumeTl + tlAmount,
    }));
  }
  const toTreasury = protocolFee / 2n; // TREASURY_TRADE_BPS = 50 %
  if (toTreasury > 0n) {
    await context.db.insert(treasuryFlow).values({
      id: `${event.transaction.hash}-${event.log.logIndex}-t`,
      source: "trade",
      amount: toTreasury,
      timestamp: event.block.timestamp,
    });
  }
  await bumpStats(context, { tlToTreasury: toTreasury, tlToRewardPool: protocolFee - toTreasury });
}

ponder.on("CharacterPool:Buy", async ({ event, context }) => {
  await recordTrade(context, event, event.args.recipient, true, event.args.tlIn, event.args.tokensOut, event.args.protocolFee, event.args.creatorFee);
});

ponder.on("CharacterPool:Sell", async ({ event, context }) => {
  await recordTrade(context, event, event.args.seller, false, event.args.tlOut, event.args.tokensIn, event.args.protocolFee, event.args.creatorFee);
});

// ------------------------------------------------------------------ AMM (WP11)

ponder.on("AmmFactory:PairCreated", async ({ event, context }) => {
  const { characterId, token, pair } = event.args;
  await context.db.insert(ammPair).values({
    id: pair,
    characterId,
    token,
    createdAt: event.block.timestamp,
    createdBlock: event.block.number,
  });
  await context.db.update(character, { id: characterId }).set({ ammPair: pair });
});

ponder.on("AmmPair:ReservesUpdated", async ({ event, context }) => {
  await context.db
    .update(ammPair, { id: event.log.address })
    .set({ reserveTl: event.args.reserveTl, reserveToken: event.args.reserveToken });
});

// LP supply follows the share token's mints (from zero) and burns (to zero), including the locked first deposit.
ponder.on("AmmPair:Transfer", async ({ event, context }) => {
  const { from, to, value } = event.args;
  if (from === ZERO_ADDRESS) {
    await context.db.update(ammPair, { id: event.log.address }).set((row) => ({ lpSupply: row.lpSupply + value }));
  } else if (to === ZERO_ADDRESS) {
    await context.db.update(ammPair, { id: event.log.address }).set((row) => ({ lpSupply: row.lpSupply - value }));
  }
});

ponder.on("AmmPair:Swap", async ({ event, context }) => {
  const { trader, tlToToken, amountIn, amountOut, protocolFee } = event.args;
  const pairRow = await context.db.find(ammPair, { id: event.log.address });
  if (!pairRow) return;
  const tlAmount = tlToToken ? amountIn : amountOut;
  await context.db.insert(ammSwap).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    pair: event.log.address,
    characterId: pairRow.characterId,
    trader,
    isBuy: tlToToken,
    tlAmount,
    tokenAmount: tlToToken ? amountOut : amountIn,
    protocolFee,
    timestamp: event.block.timestamp,
    block: event.block.number,
  });
  await context.db.update(ammPair, { id: event.log.address }).set((row) => ({ volumeTl: row.volumeTl + tlAmount, swaps: row.swaps + 1 }));
  const toTreasury = (protocolFee * TREASURY_AMM_BPS) / BPS;
  if (toTreasury > 0n) {
    await context.db.insert(treasuryFlow).values({
      id: `${event.transaction.hash}-${event.log.logIndex}-t`,
      source: "amm",
      amount: toTreasury,
      timestamp: event.block.timestamp,
    });
  }
  await bumpStats(context, { tlToTreasury: toTreasury, tlToRewardPool: protocolFee - toTreasury, ammVolumeTl: tlAmount });
});

async function recordLiquidity(
  context: Parameters<Parameters<typeof ponder.on>[1]>[0]["context"],
  event: { transaction: { hash: `0x${string}` }; log: { logIndex: number; address: `0x${string}` }; block: { timestamp: bigint; number: bigint } },
  provider: `0x${string}`,
  isAdd: boolean,
  tlAmount: bigint,
  tokenAmount: bigint,
  liquidity: bigint,
) {
  const pairRow = await context.db.find(ammPair, { id: event.log.address });
  if (!pairRow) return;
  await context.db.insert(ammLiquidity).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    pair: event.log.address,
    characterId: pairRow.characterId,
    provider,
    isAdd,
    tlAmount,
    tokenAmount,
    liquidity,
    timestamp: event.block.timestamp,
    block: event.block.number,
  });
}

ponder.on("AmmPair:LiquidityAdded", async ({ event, context }) => {
  await recordLiquidity(context, event, event.args.provider, true, event.args.tlIn, event.args.tokenIn, event.args.liquidity);
});

ponder.on("AmmPair:LiquidityRemoved", async ({ event, context }) => {
  await recordLiquidity(context, event, event.args.provider, false, event.args.tlOut, event.args.tokenOut, event.args.liquidity);
});

// ------------------------------------------------------------------ Matches

ponder.on("MatchManager:Challenged", async ({ event, context }) => {
  const { matchId, idA, idB, controllerA, stake: stakeAmount, preset, open } = event.args;
  await context.db.insert(match).values({
    id: matchId,
    idA,
    idB: idB === 0n ? null : idB,
    controllerA,
    stake: stakeAmount,
    preset: Number(preset),
    open,
    status: Number(preset) === 2 ? "Accepted" : "Challenged",
    createdAt: event.block.timestamp,
  });
  await bumpStats(context, { matches: 1 });
});

ponder.on("MatchManager:Accepted", async ({ event, context }) => {
  const { matchId, idB, controllerB, stakingCloseAt, commitDeadline } = event.args;
  await context.db.update(match, { id: matchId }).set({
    idB,
    controllerB,
    status: "Accepted",
    acceptedAt: event.block.timestamp,
    stakingCloseAt,
    commitDeadline,
  });
});

ponder.on("MatchManager:Cancelled", async ({ event, context }) => {
  await context.db.update(match, { id: event.args.matchId }).set({ status: "Resolved", outcome: "Cancelled", resolvedAt: event.block.timestamp });
});

ponder.on("MatchManager:Committed", async ({ event, context }) => {
  const { matchId, side, encryptedTactics } = event.args;
  await context.db
    .update(match, { id: matchId })
    .set(side === 0 ? { committedA: true, encryptedTacticsA: encryptedTactics } : { committedB: true, encryptedTacticsB: encryptedTactics });
});

ponder.on("MatchManager:Revealed", async ({ event, context }) => {
  const { matchId, side, stances, energies } = event.args;
  await context.db
    .update(match, { id: matchId })
    .set(
      side === 0
        ? { revealedA: true, stancesA: join(stances), energiesA: join(energies) }
        : { revealedB: true, stancesB: join(stances), energiesB: join(energies) },
    );
});

ponder.on("MatchManager:BattleScores", async ({ event, context }) => {
  const { matchId, scoreA, scoreB, winners } = event.args;
  await context.db.update(match, { id: matchId }).set({ scoreA: join(scoreA), scoreB: join(scoreB), winners: join(winners) });
});

ponder.on("MatchManager:Resolved", async ({ event, context }) => {
  const { matchId, outcome, roundsA, roundsB, stakerReward } = event.args;
  const label = OUTCOME[Number(outcome)] ?? "Pending";
  const m = await context.db.find(match, { id: matchId });
  await context.db.update(match, { id: matchId }).set({
    status: "Resolved",
    outcome: label,
    roundsA: Number(roundsA),
    roundsB: Number(roundsB),
    stakerReward,
    resolvedAt: event.block.timestamp,
  });
  if (!m) return;
  const decided = label === "WinA" || label === "WinB";
  if (m.stake > 0n && !m.tournamentId) {
    if (decided) {
      const total = 2n * m.stake;
      const rake = (total * 500n) / BPS;
      const winnerId = label === "WinA" ? m.idA : m.idB!;
      const loserId = label === "WinA" ? m.idB! : m.idA;
      await context.db.update(character, { id: winnerId }).set((row) => ({ wins: row.wins + 1, tlWon: row.tlWon + total - rake }));
      await context.db.update(character, { id: loserId }).set((row) => ({ losses: row.losses + 1 }));
      await bumpStats(context, {
        tlToRewardPool: (total * RAKE_TO_REWARDPOOL_BPS) / BPS,
        tlBurned: rake - (total * RAKE_TO_REWARDPOOL_BPS) / BPS,
      });
    } else if (label === "Draw" && m.idB) {
      await context.db.update(character, { id: m.idA }).set((row) => ({ draws: row.draws + 1 }));
      await context.db.update(character, { id: m.idB }).set((row) => ({ draws: row.draws + 1 }));
    }
  } else if (m.tournamentId && decided && m.idB) {
    const winnerId = label === "WinA" ? m.idA : m.idB;
    const loserId = label === "WinA" ? m.idB : m.idA;
    await context.db.update(character, { id: winnerId }).set((row) => ({ wins: row.wins + 1 }));
    await context.db.update(character, { id: loserId }).set((row) => ({ losses: row.losses + 1 }));
  }
  await bumpStats(context, { resolvedMatches: 1 });
});

// ------------------------------------------------------------------ Staking

ponder.on("StakingVault:Staked", async ({ event, context }) => {
  const { matchId, side, staker, amount } = event.args;
  const id = `${matchId}-${side}-${staker}`;
  const existing = await context.db.find(stake, { id });
  await context.db
    .insert(stake)
    .values({ id, matchId, side: Number(side), staker, amount, timestamp: event.block.timestamp })
    .onConflictDoUpdate((row) => ({ amount: row.amount + amount }));
  await context.db
    .update(match, { id: matchId })
    .set((row) => (Number(side) === 0 ? { totalStakedA: row.totalStakedA + amount } : { totalStakedB: row.totalStakedB + amount }));
  if (!existing) {
    const m = await context.db.find(match, { id: matchId });
    const characterId = Number(side) === 0 ? m?.idA : m?.idB;
    if (characterId) await context.db.update(character, { id: characterId }).set((row) => ({ stakerCount: row.stakerCount + 1 }));
  }
});

ponder.on("StakingVault:Withdrawn", async ({ event, context }) => {
  const { matchId, staker, reward } = event.args;
  for (const side of [0, 1]) {
    const id = `${matchId}-${side}-${staker}`;
    const row = await context.db.find(stake, { id });
    if (row) await context.db.update(stake, { id }).set({ withdrawn: true, reward: side === 0 ? reward : 0n });
  }
});

// ------------------------------------------------------------------ Rating and seasons

ponder.on("Rating:RatingChanged", async ({ event, context }) => {
  const { characterId, season: s, before, after_, rated } = event.args;
  await context.db.insert(ratingChange).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    characterId,
    season: Number(s),
    before: Number(before),
    after: Number(after_),
    rated,
    timestamp: event.block.timestamp,
  });
  await context.db
    .update(character, { id: characterId })
    .set((row) => ({ rating: Number(after_), ratedMatches: rated ? row.ratedMatches + 1 : row.ratedMatches }));
});

ponder.on("Rating:Licensed", async ({ event, context }) => {
  await context.db.update(character, { id: event.args.characterId }).set({ licensed: true });
});

ponder.on("Rating:Unlicensed", async ({ event, context }) => {
  await context.db.update(character, { id: event.args.characterId }).set({ licensed: false });
});

ponder.on("Rating:SeasonClosed", async ({ event, context }) => {
  const { season: s, prize, top } = event.args;
  await context.db
    .insert(season)
    .values({ id: Number(s), closed: true, prize, top: join(top), closedAt: event.block.timestamp })
    .onConflictDoUpdate({ closed: true, prize, top: join(top), closedAt: event.block.timestamp });
});

ponder.on("Rating:SeasonRewardBooked", async ({ event, context }) => {
  const { season: s, characterId, controller, amount } = event.args;
  await context.db.insert(seasonReward).values({ id: `${s}-${characterId}`, season: Number(s), characterId, controller, amount });
  await context.db.update(character, { id: characterId }).set((row) => ({ tlWon: row.tlWon + amount }));
});

// ------------------------------------------------------------------ Tournaments

ponder.on("Tournament:Created", async ({ event, context }) => {
  const { tournamentId, organizer, size, entry, organizerFeeBps } = event.args;
  await context.db.insert(tournament).values({
    id: tournamentId,
    organizer,
    size: Number(size),
    entry,
    organizerFeeBps: Number(organizerFeeBps),
    status: "Open",
    createdAt: event.block.timestamp,
  });
});

ponder.on("Tournament:Registered", async ({ event, context }) => {
  const { tournamentId, characterId } = event.args;
  await context.db.update(tournament, { id: tournamentId }).set((row) => ({
    players: row.players ? `${row.players},${characterId}` : String(characterId),
  }));
});

ponder.on("Tournament:Unregistered", async ({ event, context }) => {
  const { tournamentId, characterId } = event.args;
  await context.db.update(tournament, { id: tournamentId }).set((row) => ({
    players: row.players.split(",").filter((p) => p && p !== String(characterId)).join(","),
  }));
});

ponder.on("Tournament:Started", async ({ event, context }) => {
  await context.db.update(tournament, { id: event.args.tournamentId }).set({ status: "Running", players: join(event.args.seeded) });
});

ponder.on("Tournament:RoundStarted", async ({ event, context }) => {
  const { tournamentId, round, matchIds } = event.args;
  await context.db.update(tournament, { id: tournamentId }).set({ round: Number(round), roundMatches: join(matchIds) });
  for (const mid of matchIds) {
    await context.db.update(match, { id: mid }).set({ tournamentId });
  }
});

ponder.on("Tournament:Replay", async ({ event, context }) => {
  const { tournamentId, oldMatchId, newMatchId } = event.args;
  await context.db.update(tournament, { id: tournamentId }).set((row) => ({
    roundMatches: row.roundMatches.split(",").map((m) => (m === String(oldMatchId) ? String(newMatchId) : m)).join(","),
  }));
  await context.db.update(match, { id: newMatchId }).set({ tournamentId });
});

ponder.on("Tournament:Finished", async ({ event, context }) => {
  const { tournamentId, winner, finalist, prizePool } = event.args;
  await context.db.update(tournament, { id: tournamentId }).set({ status: "Finished", winner, finalist, prizePool });
  const t = await context.db.find(tournament, { id: tournamentId });
  if (t) {
    const total = t.entry * BigInt(t.size);
    await bumpStats(context, {
      tlToRewardPool: (total * RAKE_TO_REWARDPOOL_BPS) / BPS,
      tlBurned: (total * RAKE_TO_BURN_BPS) / BPS,
    });
  }
});

ponder.on("Tournament:Cancelled", async ({ event, context }) => {
  await context.db.update(tournament, { id: event.args.tournamentId }).set({ status: "Cancelled" });
});

// keep the imports used (status enum reserved for API filters)
void T_STATUS;
void PRESET_SECONDS;
void eq;
