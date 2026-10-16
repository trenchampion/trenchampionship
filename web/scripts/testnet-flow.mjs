// End-to-end exercise of a live deployment, resumable from chain state. Every phase checks the chain first and
// only sends what is still missing, so the script can be re-run at any time; the phases that depend on time
// (reveals, tournament rounds) simply report what they are waiting for.
//
//   node scripts/testnet-flow.mjs            # run every phase that is possible now
//   node scripts/testnet-flow.mjs status     # read-only report
//
// Environment: CHAIN_ID (default 84532), RPC_URL (default by chain), DEPLOYER_KEY (default: contracts/.env),
// DEPLOYMENTS_FILE (default contracts/deployments/<chainId>.json; point it at a saved copy to finish an exercise on
// an older deployment after a redeploy), PHASES (comma list of fund,launchpool,characters,curve,amm,match,license,
// tournament,vesting; default all).
// Seven extra controllers are derived deterministically from the deployer key (never stored, never printed).
// Transaction hashes and gas go to STATE_FILE (default docs/private/testnet-flow-<chainId>.json, gitignored).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodePacked,
  formatEther,
  formatUnits,
  http,
  keccak256,
  parseEther,
  parseEventLogs,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const chainId = Number(process.env.CHAIN_ID ?? "84532");
const chain = chainId === 8453 ? base : baseSepolia;
const rpc = process.env.RPC_URL ?? chain.rpcUrls.default.http[0];
const stateFile = process.env.STATE_FILE ?? join(root, "docs", "private", `testnet-flow-${chainId}.json`);
const mode = process.argv[2] ?? "all";
const phases = new Set((process.env.PHASES ?? "fund,launchpool,characters,curve,amm,match,license,tournament,vesting").split(","));
const on = (name) => phases.has(name);

function deployerKey() {
  if (process.env.DEPLOYER_KEY) return process.env.DEPLOYER_KEY;
  const env = readFileSync(join(root, "contracts", ".env"), "utf8");
  const m = /^DEPLOYER_KEY=(0x[0-9a-fA-F]{64})/m.exec(env);
  if (!m) throw new Error("DEPLOYER_KEY not found in environment or contracts/.env");
  return m[1];
}

const deploymentsFile = process.env.DEPLOYMENTS_FILE ?? join(root, "contracts", "deployments", `${chainId}.json`);
const addresses = JSON.parse(readFileSync(deploymentsFile, "utf8"));
const abi = (name) => JSON.parse(readFileSync(join(root, "contracts", "out", `${name}.sol`, `${name}.json`), "utf8")).abi;
const ABI = Object.fromEntries(
  [
    "TLToken",
    "LaunchPool",
    "CharacterFactory",
    "CharacterPool",
    "CharacterToken",
    "ControllerNFT",
    "CreatorVesting",
    "RewardPool",
    "StakingVault",
    "Rating",
    "MatchManager",
    "Tournament",
    "AmmFactory",
    "AmmPair",
  ].map((n) => [n, abi(n)]),
);
const C = {
  tl: { address: addresses.TLToken, abi: ABI.TLToken },
  lp: { address: addresses.LaunchPool, abi: ABI.LaunchPool },
  factory: { address: addresses.CharacterFactory, abi: ABI.CharacterFactory },
  nft: { address: addresses.ControllerNFT, abi: ABI.ControllerNFT },
  vesting: { address: addresses.CreatorVesting, abi: ABI.CreatorVesting },
  rewardPool: { address: addresses.RewardPool, abi: ABI.RewardPool },
  vault: { address: addresses.StakingVault, abi: ABI.StakingVault },
  rating: { address: addresses.Rating, abi: ABI.Rating },
  mm: { address: addresses.MatchManager, abi: ABI.MatchManager },
  tournament: { address: addresses.Tournament, abi: ABI.Tournament },
  amm: { address: addresses.AmmFactory, abi: ABI.AmmFactory },
};

const pub = createPublicClient({ chain, transport: http(rpc) });
const key = deployerKey();
const deployer = privateKeyToAccount(key);
const players = Array.from({ length: 7 }, (_, i) =>
  privateKeyToAccount(keccak256(encodePacked(["bytes32", "string", "uint8"], [key, "trenchampionship-flow", i + 1]))),
);
const controllers = [deployer, ...players]; // index 0..7
const wallet = (account) => createWalletClient({ account, chain, transport: http(rpc) });

const E18 = 10n ** 18n;
const tl = (v) => `${Number(formatUnits(v, 18)).toLocaleString("en-US", { maximumFractionDigits: 2 })} TRCH`;
const eth = (v) => `${formatEther(v)} ETH`;
const now = () => BigInt(Math.floor(Date.now() / 1000));
const when = (t) => new Date(Number(t) * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC";

// ------------------------------------------------------------------ state file

let state = { chainId, txs: [], characters: {} };
if (existsSync(stateFile)) state = JSON.parse(readFileSync(stateFile, "utf8"));
function save() {
  mkdirSync(dirname(stateFile), { recursive: true });
  writeFileSync(stateFile, JSON.stringify(state, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
}

// ------------------------------------------------------------------ helpers

const read = (c, functionName, args = []) => pub.readContract({ ...c, functionName, args });
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/** Public RPCs sit behind load balancers whose nodes lag a block or two; poll until a read agrees. */
async function until(what, fn, tries = 20) {
  for (let i = 0; i < tries; i++) {
    if (await fn()) return;
    await sleep(2000);
  }
  throw new Error(`timeout waiting for ${what}`);
}

/** Event argument from a receipt, so ids never come from a counter read on a lagging node. */
function eventArg(receipt, c, eventName, arg) {
  const logs = parseEventLogs({ abi: c.abi, eventName, logs: receipt.logs });
  if (logs.length === 0) throw new Error(`event ${eventName} not in receipt`);
  return logs[0].args[arg];
}

async function send(label, account, c, functionName, args = [], value = 0n) {
  let hash;
  for (let attempt = 1; ; attempt++) {
    try {
      // The estimate may come from a node that lags a block and sees a cheaper path (the second reveal
      // resolves the whole match; the second commit stores bothCommittedAt). Unused gas is refunded, so
      // over-provision generously instead of trusting the estimate.
      const estimate = await pub.estimateContractGas({ ...c, functionName, args, value, account });
      hash = await wallet(account).writeContract({ ...c, functionName, args, value, gas: estimate * 4n + 200_000n });
      break;
    } catch (e) {
      if (attempt >= 4) throw e;
      console.log(`  ${label}: attempt ${attempt} failed (${e.shortMessage?.split("\n")[0] ?? e.message}); retrying`);
      await sleep(4000 * attempt);
    }
  }
  const r = await pub.waitForTransactionReceipt({ hash, confirmations: 1 });
  if (r.status !== "success") throw new Error(`${label}: reverted (${hash})`);
  const l1Fee = r.l1Fee ?? 0n;
  const cost = r.gasUsed * r.effectiveGasPrice + l1Fee;
  state.txs.push({ label, hash, block: r.blockNumber, gasUsed: r.gasUsed, l1Fee, cost, at: new Date().toISOString() });
  save();
  console.log(`  ${label}: ${hash} (gas ${r.gasUsed}, cost ${eth(cost)})`);
  return r;
}

async function sendEth(label, account, to, value) {
  const hash = await wallet(account).sendTransaction({ to, value });
  const r = await pub.waitForTransactionReceipt({ hash, confirmations: 1 });
  state.txs.push({ label, hash, block: r.blockNumber, gasUsed: r.gasUsed, at: new Date().toISOString() });
  save();
  console.log(`  ${label}: ${hash}`);
}

async function ensureAllowance(account, token, spender, amount) {
  const current = await pub.readContract({ address: token, abi: ABI.TLToken, functionName: "allowance", args: [account.address, spender] });
  if (current >= amount) return;
  await send(`approve ${spender.slice(0, 8)} by ${label(account)}`, account, { address: token, abi: ABI.TLToken }, "approve", [spender, amount]);
  await until("allowance", async () => (await pub.readContract({ address: token, abi: ABI.TLToken, functionName: "allowance", args: [account.address, spender] })) >= amount);
}

const label = (account) => {
  const i = controllers.findIndex((c) => c.address === account.address);
  return i === 0 ? "deployer" : `player${i}`;
};

// ------------------------------------------------------------------ characters

// traits sum to 45 (1..15 each); specials 1..8 each once; elements and weaknesses spread
const CHARACTERS = [
  { name: "Ember", symbol: "EMBER", traits: [12, 11, 11, 11, 0, 1, 3], alloc: 0 },
  { name: "Gale", symbol: "GALE", traits: [10, 10, 15, 10, 1, 2, 2], alloc: 1000 },
  { name: "Terra", symbol: "TERRA", traits: [11, 15, 9, 10, 2, 3, 4], alloc: 0 },
  { name: "Tide", symbol: "TIDE", traits: [9, 12, 12, 12, 3, 4, 0], alloc: 500 },
  { name: "Umbra", symbol: "UMBRA", traits: [15, 8, 10, 12, 4, 5, 1], alloc: 0 },
  { name: "Cinder", symbol: "CINDR", traits: [13, 9, 13, 10, 0, 6, 1], alloc: 0 },
  { name: "Zephyr", symbol: "ZEPHR", traits: [8, 13, 14, 10, 1, 7, 3], alloc: 2000 },
  { name: "Basalt", symbol: "BASLT", traits: [12, 14, 8, 11, 2, 8, 4], alloc: 0 },
];
const MINT_FEE = 5000n * E18;
const CREATOR_BUY = 20_000n * E18;

function traitsTuple(t) {
  return { strength: t[0], defense: t[1], speed: t[2], focus: t[3], element: t[4], special: t[5], weakness: t[6] };
}

function energyBudget(t) {
  return 5 + Math.trunc(t[2] / 2) + (t[5] === 3 ? 1 : 0);
}

/** Deterministic tactics per (controller, match): valid stances, energies summing to the budget. */
function tactics(idx, matchId, traits) {
  const budget = energyBudget(traits);
  const seed = Number(BigInt(keccak256(encodePacked(["uint8", "uint256"], [idx, matchId]))) % 1000n);
  const stances = [seed % 3, (seed >> 2) % 3, (seed >> 4) % 3];
  const e0 = seed % (budget + 1);
  const e1 = (seed >> 3) % (budget - e0 + 1);
  const energies = [e0, e1, budget - e0 - e1];
  return { stances, energies };
}

const salt = (account, matchId) => keccak256(encodePacked(["bytes32", "uint256", "string"], [keccak256(encodePacked(["address"], [account.address])), matchId, "salt"]));

function commitHash(matchId, controller, t, s) {
  return keccak256(
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "address" }, { type: "uint8[3]" }, { type: "uint8[3]" }, { type: "bytes32" }],
      [matchId, controller, t.stances, t.energies, s],
    ),
  );
}

async function ownedCharacter(account) {
  const count = Number(await read(C.factory, "characterCount"));
  for (let id = 1; id <= count; id++) {
    const owner = await read(C.nft, "controllerOf", [BigInt(id)]);
    if (owner.toLowerCase() === account.address.toLowerCase()) return BigInt(id);
  }
  return 0n;
}

async function characterIds() {
  const ids = [];
  for (let i = 0; i < controllers.length; i++) {
    const cached = state.characters[i];
    ids.push(cached ? BigInt(cached) : await ownedCharacter(controllers[i]));
    if (ids[i] !== 0n) state.characters[i] = ids[i].toString();
  }
  save();
  return ids;
}

// ------------------------------------------------------------------ phases

async function phaseFund() {
  console.log("fund");
  for (const p of players) {
    const bal = await pub.getBalance({ address: p.address });
    if (bal < parseEther("0.00015")) await sendEth(`fund ETH ${label(p)}`, deployer, p.address, parseEther("0.0002"));
    const trch = await read(C.tl, "balanceOf", [p.address]);
    if (trch < 15_000n * E18) await send(`fund TRCH ${label(p)}`, deployer, C.tl, "transfer", [p.address, 40_000n * E18]);
  }
}

async function phaseLaunchPool() {
  console.log("launchpool");
  if (!state.launchBuy) {
    const ethIn = parseEther("0.0003");
    const quote = await read(C.lp, "quoteBuy", [ethIn]);
    await send("LaunchPool.buy 0.0003 ETH", deployer, C.lp, "buy", [(quote * 99n) / 100n], ethIn);
    state.launchBuy = { ethIn: ethIn.toString(), quote: quote.toString() };
    save();
  }
  if (!state.launchSell) {
    const tlIn = 1000n * E18;
    const quote = await read(C.lp, "quoteSell", [tlIn]);
    await ensureAllowance(deployer, C.tl.address, C.lp.address, tlIn);
    await send("LaunchPool.sell 1000 TRCH", deployer, C.lp, "sell", [tlIn, (quote * 99n) / 100n]);
    state.launchSell = { tlIn: tlIn.toString(), quote: quote.toString() };
    save();
  }
}

async function phaseCharacters() {
  console.log("characters");
  const ids = await characterIds();
  for (let i = 0; i < controllers.length; i++) {
    if (ids[i] !== 0n) continue;
    const c = CHARACTERS[i];
    const acct = controllers[i];
    const buy = i === 0 ? CREATOR_BUY : 5000n * E18;
    await ensureAllowance(acct, C.tl.address, C.factory.address, MINT_FEE + buy);
    const tk = {
      name: c.name,
      symbol: c.symbol,
      supply: 1_000_000_000n * E18,
      virtualTl: 10_000n * E18,
      creatorAllocBps: c.alloc,
      vestingDuration: c.alloc > 0 ? 30 * 86_400 : 0,
      creatorFeeBps: 50,
    };
    const r = await send(`createCharacter ${c.name} by ${label(acct)}`, acct, C.factory, "createCharacter", [traitsTuple(c.traits), `ipfs://flow/${c.symbol.toLowerCase()}`, tk, buy, 0n]);
    ids[i] = eventArg(r, C.factory, "CharacterCreated", "characterId");
    state.characters[i] = ids[i].toString();
    save();
    await until("character visible", async () => (await read(C.nft, "controllerOf", [ids[i]])).toLowerCase() === acct.address.toLowerCase());
  }
  return ids;
}

async function poolOf(id) {
  return { address: await read(C.factory, "poolOf", [id]), abi: ABI.CharacterPool };
}
async function tokenOf(id) {
  return { address: await read(C.factory, "tokenOf", [id]), abi: ABI.CharacterToken };
}

async function phaseCurve(ids) {
  console.log("curve");
  if (state.curve) return;
  const pool = await poolOf(ids[1]);
  const token = await tokenOf(ids[1]);
  const tlIn = 2000n * E18;
  const q = await read(pool, "quoteBuy", [tlIn]);
  await ensureAllowance(deployer, C.tl.address, pool.address, tlIn);
  await send("CharacterPool.buy Gale 2000 TRCH", deployer, pool, "buy", [tlIn, (q * 99n) / 100n]);
  const half = q / 2n;
  const qs = await read(pool, "quoteSell", [half]);
  await ensureAllowance(deployer, token.address, pool.address, half);
  await send("CharacterPool.sell Gale half", deployer, pool, "sell", [half, (qs * 99n) / 100n]);
  state.curve = { bought: q.toString(), sold: half.toString(), tlOut: qs.toString() };
  save();
}

async function phaseAmm(ids) {
  console.log("amm");
  const token = await tokenOf(ids[0]);
  let pair = await read(C.amm, "pairOf", [token.address]);
  if (pair === "0x0000000000000000000000000000000000000000") {
    const r = await send("AmmFactory.createPair Ember", deployer, C.amm, "createPair", [token.address]);
    pair = eventArg(r, C.amm, "PairCreated", "pair");
    await until("pair visible", async () => (await read(C.amm, "pairOf", [token.address])) === pair);
  }
  const P = { address: pair, abi: ABI.AmmPair };
  const [rTl] = await read(P, "getReserves");
  if (rTl === 0n && !state.ammLiquidity) {
    const tlAmt = 5000n * E18;
    const tokAmt = (await read(token, "balanceOf", [deployer.address])) / 2n;
    await ensureAllowance(deployer, C.tl.address, pair, tlAmt);
    await ensureAllowance(deployer, token.address, pair, tokAmt);
    await send("AmmPair.addLiquidity", deployer, P, "addLiquidity", [tlAmt, tokAmt, (tlAmt * 99n) / 100n, (tokAmt * 99n) / 100n, deployer.address]);
    state.ammLiquidity = { tl: tlAmt.toString(), token: tokAmt.toString() };
    save();
    await until("reserves visible", async () => (await read(P, "getReserves"))[0] > 0n);
  }
  if (!state.ammSwaps) {
    const tlIn = 500n * E18;
    const q1 = await read(P, "quoteTlForToken", [tlIn]);
    await ensureAllowance(deployer, C.tl.address, pair, tlIn);
    await send("AmmPair.swapTlForToken 500 TRCH", deployer, P, "swapTlForToken", [tlIn, (q1 * 99n) / 100n, deployer.address]);
    const q2 = await read(P, "quoteTokenForTl", [q1]);
    await ensureAllowance(deployer, token.address, pair, q1);
    await send("AmmPair.swapTokenForTl back", deployer, P, "swapTokenForTl", [q1, (q2 * 99n) / 100n, deployer.address]);
    const lp = await read(P, "balanceOf", [deployer.address]);
    const tenth = lp / 10n;
    await send("AmmPair.removeLiquidity tenth", deployer, P, "removeLiquidity", [tenth, 0n, 0n, deployer.address]);
    state.ammSwaps = { pair, tokenOut: q1.toString(), tlBack: q2.toString(), lpRemoved: tenth.toString() };
    save();
  }
  state.ammPair = pair;
  save();
}

async function phaseMatch(ids) {
  console.log("match (Blitz, staked)");
  const stake = 1000n * E18;
  if (!state.match) {
    await ensureAllowance(deployer, C.tl.address, C.mm.address, stake);
    const r = await send("MatchManager.challenge Ember vs Gale", deployer, C.mm, "challenge", [ids[0], ids[1], stake, 0]);
    state.match = { id: eventArg(r, C.mm, "Challenged", "matchId").toString() };
    save();
  }
  const matchId = BigInt(state.match.id);
  await until("match visible", async () => (await read(C.mm, "getMatch", [matchId])).status !== 0);
  let m = await read(C.mm, "getMatch", [matchId]);
  if (m.status === 1) {
    await ensureAllowance(players[0], C.tl.address, C.mm.address, stake);
    await send("MatchManager.accept by player1", players[0], C.mm, "accept", [matchId, ids[1]]);
    await until("accept visible", async () => (await read(C.mm, "getMatch", [matchId])).status === 2);
    m = await read(C.mm, "getMatch", [matchId]);
  }
  if (m.status === 2) {
    // a third party stakes Ember tokens on side 0 while the staking window is open
    if (!state.match.staked && (await read(C.mm, "stakingOpen", [matchId]))) {
      const staker = players[1];
      const pool = await poolOf(ids[0]);
      const token = await tokenOf(ids[0]);
      const tlIn = 1000n * E18;
      const q = await read(pool, "quoteBuy", [tlIn]);
      await ensureAllowance(staker, C.tl.address, pool.address, tlIn);
      await send("CharacterPool.buy Ember by player2 (staker)", staker, pool, "buy", [tlIn, (q * 99n) / 100n]);
      const amount = q / 2n;
      await ensureAllowance(staker, token.address, C.vault.address, amount);
      await send("StakingVault.stake side 0 by player2", staker, C.vault, "stake", [matchId, 0, amount]);
      state.match.staked = { staker: staker.address, amount: amount.toString() };
      save();
    }
    for (const [side, acct, idx] of [[0, deployer, 0], [1, players[0], 1]]) {
      const committed = side === 0 ? m.commitA : m.commitB;
      if (committed !== "0x0000000000000000000000000000000000000000000000000000000000000000") continue;
      const t = tactics(idx, matchId, CHARACTERS[idx].traits);
      const h = commitHash(matchId, acct.address, t, salt(acct, matchId));
      await send(`MatchManager.commit side ${side}`, acct, C.mm, "commit", [matchId, h, "0x"]);
    }
    m = await read(C.mm, "getMatch", [matchId]);
    await tryReveal(matchId, m, [[0, deployer, 0], [1, players[0], 1]]);
    m = await read(C.mm, "getMatch", [matchId]);
  }
  if (m.status === 3) {
    console.log(`  match ${matchId} resolved: outcome ${["Pending", "WinA", "WinB", "Draw", "Void", "Expired", "Cancelled"][m.outcome]}`);
    for (const acct of [deployer, players[0]]) {
      const owed = await read(C.mm, "claimable", [acct.address]);
      if (owed > 0n) await send(`MatchManager.claim ${label(acct)} ${tl(owed)}`, acct, C.mm, "claim");
    }
    if (state.match.staked && !state.match.withdrawn) {
      const res = await read(C.vault, "resolutions", [matchId]);
      console.log(`  vault: winnerSide ${res[1]} reward ${tl(res[2])}`);
      await send("StakingVault.withdraw player2", players[1], C.vault, "withdraw", [matchId]);
      state.match.withdrawn = true;
      save();
    }
    for (const id of [ids[0], ids[1]]) console.log(`  rating ${id}: ${await read(C.rating, "ratingOf", [id])}`);
  }
}

/** Reveal for every side that can: both committed, staking closed, before the deadline. */
async function tryReveal(matchId, m, sides) {
  const zero = "0x0000000000000000000000000000000000000000000000000000000000000000";
  if (m.status !== 2) return;
  if (m.commitA === zero || m.commitB === zero) {
    console.log(`  match ${matchId}: waiting for commits (deadline ${when(await read(C.mm, "commitDeadline", [matchId]))})`);
    return;
  }
  const open = await read(C.mm, "stakingCloseAt", [matchId]);
  const deadline = await read(C.mm, "revealDeadline", [matchId]);
  const t = now();
  if (t < open) {
    console.log(`  match ${matchId}: reveal opens ${when(open)}, closes ${when(deadline)}`);
    return;
  }
  if (t > deadline) {
    console.log(`  match ${matchId}: reveal window missed (${when(deadline)}); poke to settle`);
    await send(`MatchManager.poke ${matchId}`, deployer, C.mm, "poke", [matchId]);
    return;
  }
  for (const [side, acct, idx] of sides) {
    if (side === 0 ? m.revealedA : m.revealedB) continue;
    const tac = tactics(idx, matchId, CHARACTERS[idx].traits);
    await send(`MatchManager.reveal side ${side} (${label(acct)})`, acct, C.mm, "reveal", [matchId, tac, salt(acct, matchId)]);
  }
}

async function phaseLicense(ids) {
  console.log("license");
  if (!(await read(C.rating, "licensed", [ids[0]]))) {
    await ensureAllowance(deployer, C.tl.address, C.rating.address, 10_000n * E18);
    await send("Rating.license Ember", deployer, C.rating, "license", [ids[0]]);
  }
  if (!state.nominated) {
    await send("Rating.nominate Ember", deployer, C.rating, "nominate", [ids[0]]);
    state.nominated = true;
    save();
  }
  console.log(`  season ${await read(C.rating, "currentSeason")} ends ${when(await read(C.rating, "seasonEnd", [await read(C.rating, "currentSeason")]))}`);
}

async function phaseTournament(ids) {
  console.log("tournament (8, entry 100 TRCH, organizer fee 1 %)");
  const entry = 100n * E18;
  if (!state.tournament) {
    const r = await send("Tournament.create", deployer, C.tournament, "create", [8, entry, 100]);
    state.tournament = { id: eventArg(r, C.tournament, "Created", "tournamentId").toString() };
    save();
  }
  const tid = BigInt(state.tournament.id);
  await until("tournament visible", async () => (await read(C.tournament, "getBracket", [tid])).size === 8);
  let b = await read(C.tournament, "getBracket", [tid]);
  if (b.status === 0) {
    for (let i = 0; i < 8; i++) {
      if (await read(C.tournament, "registered", [tid, ids[i]])) continue;
      await ensureAllowance(controllers[i], C.tl.address, C.tournament.address, entry);
      await send(`Tournament.register ${CHARACTERS[i].name}`, controllers[i], C.tournament, "register", [tid, ids[i]]);
      await until("registration visible", async () => read(C.tournament, "registered", [tid, ids[i]]));
    }
    b = await read(C.tournament, "getBracket", [tid]);
    if (b.players.length === 8) {
      await send("Tournament.start", deployer, C.tournament, "start", [tid]);
      await until("start visible", async () => (await read(C.tournament, "getBracket", [tid])).status === 1);
      b = await read(C.tournament, "getBracket", [tid]);
      console.log(`  seeded: ${b.players.join(", ")}`);
    }
  }
  if (b.status === 1) {
    console.log(`  round ${b.round}, matches ${b.roundMatches.join(", ")}`);
    let allResolved = true;
    for (const mid of b.roundMatches) {
      const m = await read(C.mm, "getMatch", [mid]);
      const sides = [[0, m.idA], [1, m.idB]].map(([side, cid]) => {
        const idx = ids.findIndex((x) => x === cid);
        return [side, controllers[idx], idx];
      });
      if (m.status === 2) {
        allResolved = false;
        for (const [side, acct, idx] of sides) {
          const committed = side === 0 ? m.commitA : m.commitB;
          if (committed !== "0x0000000000000000000000000000000000000000000000000000000000000000") continue;
          const t = tactics(idx, mid, CHARACTERS[idx].traits);
          await send(`commit match ${mid} side ${side} (${label(acct)})`, acct, C.mm, "commit", [mid, commitHash(mid, acct.address, t, salt(acct, mid)), "0x"]);
        }
        await tryReveal(mid, await read(C.mm, "getMatch", [mid]), sides);
        if ((await read(C.mm, "getMatch", [mid])).status === 3) allResolved = allResolved; // re-checked below
      }
    }
    const resolved = await Promise.all(b.roundMatches.map(async (mid) => (await read(C.mm, "getMatch", [mid])).status === 3));
    if (resolved.every(Boolean)) {
      const prev = b.round;
      await send(`Tournament.advance round ${b.round}`, deployer, C.tournament, "advance", [tid]);
      await until("advance visible", async () => {
        const nb = await read(C.tournament, "getBracket", [tid]);
        return nb.status !== 1 || nb.round > prev || nb.roundMatches.some((m) => !b.roundMatches.includes(m));
      });
      b = await read(C.tournament, "getBracket", [tid]);
      if (b.status === 1) {
        console.log(`  next round ${b.round}: matches ${b.roundMatches.join(", ")}; committing now, reveal from +12 h`);
        return phaseTournament(ids); // commit the new round in the same run
      }
    } else if (!allResolved) {
      console.log("  round in progress");
    }
  }
  if (b.status === 2) {
    console.log(`  finished: winner ${b.winner}, finalist ${b.finalist}`);
    for (const acct of controllers) {
      const owed = await read(C.tournament, "claimable", [acct.address]);
      if (owed > 0n) await send(`Tournament.claim ${label(acct)} ${tl(owed)}`, acct, C.tournament, "claim");
    }
  }
}

async function phaseVesting(ids) {
  console.log("vesting");
  const r = await read(C.vesting, "releasable", [ids[1]]);
  console.log(`  Gale releasable now: ${formatUnits(r, 18)}`);
  if (r > 0n && !state.released) {
    await send("CreatorVesting.release Gale by player1", players[0], C.vesting, "release", [ids[1]]);
    state.released = true;
    save();
  }
}

async function status() {
  console.log(`chain ${chainId}, rpc ${rpc}`);
  console.log(`deployer ${deployer.address}: ${eth(await pub.getBalance({ address: deployer.address }))}, ${tl(await read(C.tl, "balanceOf", [deployer.address]))}`);
  for (const p of players) console.log(`${label(p)} ${p.address}: ${eth(await pub.getBalance({ address: p.address }))}, ${tl(await read(C.tl, "balanceOf", [p.address]))}`);
  const ids = await characterIds();
  console.log(`characters: ${ids.map((id, i) => `${CHARACTERS[i].name}=${id}`).join(", ")}`);
  console.log(`LaunchPool realReserve ${eth(await read(C.lp, "realReserve"))}, RewardPool available ${tl(await read(C.rewardPool, "available"))}`);
  if (state.match) {
    const m = await read(C.mm, "getMatch", [BigInt(state.match.id)]);
    console.log(`match ${state.match.id}: status ${m.status} outcome ${m.outcome} revealed ${m.revealedA}/${m.revealedB}`);
    await tryRevealReport(BigInt(state.match.id), m);
  }
  if (state.tournament) {
    const b = await read(C.tournament, "getBracket", [BigInt(state.tournament.id)]);
    console.log(`tournament ${state.tournament.id}: status ${b.status} round ${b.round} matches ${b.roundMatches.join(", ")} winner ${b.winner}`);
    for (const mid of b.roundMatches) await tryRevealReport(mid, await read(C.mm, "getMatch", [mid]));
  }
  const total = state.txs.reduce((a, t) => a + BigInt(t.cost ?? 0), 0n);
  console.log(`${state.txs.length} transactions recorded, total cost ${eth(total)}`);
}

async function tryRevealReport(mid, m) {
  if (m.status !== 2) return;
  console.log(`  match ${mid}: staking closes ${when(await read(C.mm, "stakingCloseAt", [mid]))}, commit deadline ${when(await read(C.mm, "commitDeadline", [mid]))}, reveal deadline ${when(await read(C.mm, "revealDeadline", [mid]))}`);
}

// ------------------------------------------------------------------ main

if (mode === "status") {
  await status();
} else {
  if (on("fund")) await phaseFund();
  if (on("launchpool")) await phaseLaunchPool();
  const ids = on("characters") ? await phaseCharacters() : await characterIds();
  if (on("curve")) await phaseCurve(ids);
  if (on("amm")) await phaseAmm(ids);
  if (on("match")) await phaseMatch(ids);
  if (on("license")) await phaseLicense(ids);
  if (on("tournament")) await phaseTournament(ids);
  await phaseVesting(ids);
  await status();
}
