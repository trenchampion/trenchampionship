# Changelog

Format per [Keep a Changelog](https://keepachangelog.com/); versions per SemVer only from
the first testnet deploy.

## [Unreleased]

### Terms of Service and Privacy notice (2026-10-22)
- New pages /terms/ and /privacy/ (no operator, game for entertainment, nothing collected by the site, what the
  chain and third parties see), linked from the footer next to the Disclaimer. App directories ask for both.

### Posting to X from the server (2026-10-21)
- `ops/xpost.py`: posts and threads (with images) to the project's X account through the v2 API with OAuth 1.0a,
  plus a daily queue so approved texts go out one per day without anyone at the keyboard.

### Supply endpoints for price trackers (2026-10-21)
- `https://trenchampionship.com/api/total-supply` and `/api/circulating-supply` return bare numbers in whole TRCH,
  refreshed from the chain every 5 minutes (`ops/supply-api.sh`). Circulating supply excludes the unsold tokens on the
  LaunchPool curve and the RewardPool seed.

### Indexer on keyless public RPCs (2026-10-21)
- `PONDER_RPC_URL_<chainId>` may list several URLs separated by commas; Ponder spreads realtime requests over them
  and skips a failing one. The mainnet indexer now runs on PublicNode, dRPC and 1RPC instead of a keyed provider
  whose free monthly quota the one-second head polling exhausted in two days. The head is polled every 2 seconds
  (`POLLING_INTERVAL_MS`), the Base block time, which halves the request count.

### Uniswap pool link (2026-10-20)
- The token page and Transparency list the external Uniswap v3 TRCH/WETH pool (1 % fee) next to the official contract,
  with a note that the LaunchPool curve remains the primary market. The LaunchPool UI links the token page on the
  project domain.

### Project domain (2026-10-20)
- trenchampionship.com points at the server and serves the same static build as the preview host (Caddy block in
  `ops/Caddyfile`, www redirects to the apex). The ENS name on eth.limo keeps serving the IPFS copy.
- Token logo files for explorers and aggregators under `web/public/` (token-logo-32.svg, 32/200/512 px PNG), served at
  the site root.

### Basescan verification (2026-10-20)
- All 17 mainnet contracts are verified on Basescan with exact matches (and on Sourcify), next to the Blockscout
  verification from deploy day. `ops/verify-basescan.sh` submits standard-JSON input straight to the Etherscan v2
  API, because the forge verifier is refused for Base on Etherscan's free tier while the endpoints themselves are
  not. DEPLOY.md links both explorers for every address.

### No more double submissions in the Arena (2026-10-20)
- The match page gated accept, commit and reveal on the indexer, which lags the chain by seconds to minutes, so a
  player whose transaction had already succeeded still saw the button and sent the same action again (the second
  one reverted). The page now reads the match state live from the contract every few seconds and overlays it on the
  indexer row, and every transaction button stays locked for 20 seconds after a confirmation.
- Token page: definition lists with long values use a label column and left-aligned wrapping text; the header no
  longer overflows between 1280 and 1440 px (the external Get TRCH link left the header; it stays in the footer).

### Action buttons wherever a player acts (2026-10-20)
- Every match row in the Arena ends with a button that names the one thing the viewer can do: Accept challenge,
  Commit tactics, Reveal, Stake on a side, Manage challenge, View match or View result (before, the only way in was
  the match number). Your characters in the Arena get a Challenge button that jumps to the challenge form; the League
  top 10 gets a Challenge button per row.
- CI: the lockfile records pnpm 12.8.1 itself (pnpm 12 does this once packageManager is pinned), which the frozen
  install in CI requires.

### Token page and CI repair (2026-10-20)
- New page /token/: the official TRCH contract with copy and add-to-wallet buttons and explorer links, what the token is
  for, supply and distribution (including the founder purchase from the FounderBuy event), live price, reserve,
  circulation and burns, how the LaunchPool buys and sells, and a warning that any other address is a fake. Linked from
  the header, the footer (with the contract address), the home page and a notice on Transparency. The LaunchPool UI
  shows the token address, links to the page and refuses a pool whose token is not the official one.
- CI never ran since the first push: GitHub rejects hashFiles() in a job-level if, so every run failed before starting.
  Removed the two conditions, pinned pnpm 12.8.1 via packageManager, dropped the conflicting version inputs, and
  added the pnpm 12 allowBuilds approvals (the frozen install errored on ignored build scripts).

### Commit-reveal works with every wallet and without the indexer (2026-10-16)
- The Arena derived the commit salt and the encryption key only from a wallet signature, assuming the signature is
  reproducible. That holds for secp256k1 accounts (RFC 6979) but not for smart wallets with passkeys (Coinbase Smart
  Wallet, the first connector offered), which sign differently every time: such a player could commit but never
  reveal, and would lose the stake by forfeit. Now the salt and tactics are saved in the browser at commit time (with a
  copyable backup and a paste field at reveal), a 65-byte signature still allows cross-device recovery, any other
  signature gets a random salt with a clear notice, and the reveal checks the recovered tactics against the on-chain
  commit hash before sending (web only, no contract change).
- The reveal box no longer needs the indexer: it renders from the local record, and the encrypted event blob is only
  the signature-based fallback.
- Commit and reveal send fixed gas limits (250k / 700k) instead of the wallet estimate, which a lagging RPC node had
  under-estimated on testnet (the resolving reveal costs ~430k).
- DEPLOY.md 6.3: the launch-ui chain picker default moves to 8453 together with the mainnet pool address.

### Second review round and deploy-script hardening (2026-10-16)
Three further independent reviews (timestamps, permissionless transitions and griefing; cross-contract value flows;
deployment, access control and reentrancy), each with Foundry proofs kept under `contracts/test/review/` (12 tests).
No way for an unprivileged party to steal or lock funds was found. Changes:
- `Deploy.s.sol`: refuses any chain id other than 8453, 84532 or 31337; `GUARDIAN` must not be zero; a malformed
  `FOUNDER_BUY_ETH` fails instead of silently using a default, and the default is exactly 2/7 ETH (285714285714285714
  wei, previously 0.2857 ether); a `DEPLOYER_KEY` left in `.env` can no longer override an explicit `--sender`; the
  script prints chain id, deployer and founder buy before broadcasting.
- DEPLOY.md: the broadcast is 18 transactions and ~58.7 M gas (the previous figures predated the portrait contracts).
- THREAT-MODEL.md: the launch cap is a net-inflow cap (buys minus sells), as the code always was; three verified facts
  recorded (Tournament is never pausable, the season license travels with the controller NFT, forced ETH into the
  LaunchPool is inert). How-it-works states that the vested creator allocation can only ever be sold against the TRCH
  buyers put into the curve.
- `Rating.closeSeason` skips a listed character whose controller NFT has been retired (possible only between the end
  of a season and the close: `unlicense` edits the next season's list, after which `retire` is allowed). Before, the
  share was booked to address(0) and stayed in Rating forever; now it remains in the RewardPool with the rest of the
  unbooked prize. Found independently by all three reviews; regression test `test_closeSeasonSkipsRetiredCharacter`.
  The three review proofs of the old behaviour were removed; the other twelve stay as regression tests.

### One brand mark everywhere (2026-10-16)
- The header pentagon now carries the five element colours along its ring (Fire, Air, Earth, Water, Shadow) with a
  Fire-to-Shadow core, and the same SVG is used as the favicon (`web/src/app/icon.svg`), in `launch-ui` and for every
  logo file (X avatar, token logo for aggregators), generated by `engine/scripts/brand-mark.mjs`.

### Pre-mainnet security review (2026-10-15)
Four independent reviews (economics and accounting, match protocol, privilege and denial of service, on-chain art)
found no way for an unprivileged party to steal or lock funds. Fixed everything they raised:
- `ControllerNFT.retire` is refused while the character holds a season license (`Licensed`), so the refundable
  deposit can never be stranded by burning the NFT; `Rating.closeSeason` no longer needs the retired branch. New
  constructor argument `rating` (the license oracle).
- `CharacterFactory.bind` can only be called by the account that deployed the factory (`DEPLOYER`, `NotDeployer`):
  before, anyone could bind foreign contracts between the deploy transactions and brick a fresh deployment.
- `MatchManager`: a targeted challenge cannot be accepted by the challenger's own address after the challenged NFT
  changed hands (`BadOpponent`); a pair may hold only one staked challenged-or-running match at a time
  (`activePairs`, `PairBusy`), so the 24 h cooldown cannot be bypassed by stacking challenges; a zero commit hash is
  refused (`EmptyCommit`).
- `Tournament`: tiebreaks for a second draw or a void read the rating snapshot taken at `start()` (`seedRating`),
  not the live rating, so nobody can change the outcome by playing regular matches during the bracket.
- `RewardPool` refuses to deploy without the 100 M seed (`UnexpectedBalance`); `StakingVault.onResolved` never
  reverts (a reward without stakers stays sweepable instead of blocking the match resolution).
- `CharacterFactory` bounds creator strings: name <= 64 bytes, symbol <= 16, metadataURI <= 2048
  (`MetadataTooLong`); `Rating.nominate` refuses nonexistent or retired characters.
- `Deploy.s.sol` checks the factory binding, the NFT's renderer and license oracle, and pins the deployed portrait
  renderer to the first shared art vector (a wrong part order fails the deploy instead of garbling every image).
- Metadata: the four trait attributes carry `max_value`, Energy is `display_type: number` and comes from
  `BattleEngine.energyBudget`; the art vectors were regenerated. `Config.TOURNAMENT_RAKE_BPS` is asserted equal to
  the rake split. Tests: 148 (+6), coverage 100 % on custom contracts, Slither 0.
- Builder: the metadata data URI is checked against the on-chain bound before the create transaction.

### Home page and character stories (2026-10-15)
- Home: the hero and a new "The idea" section explain the league as a meme-coin league where every character is a
  coin with an on-chain portrait and a public fight record; prizes go to the controller, the token's price is set
  only by its market, nothing is a promise of value.
- Builder: optional "Story" (up to 400 characters) stored in the character's on-chain `metadataURI` JSON
  (`description` and `story`), shown on the character's page; no effect on battles, no contract change.
- Testnet redeploy of 2026-10-15 (CharacterArt v2) is live on Base Sepolia; the site is published through IPNS and
  `trenchampionship.eth` now points at the IPNS name.

### CharacterArt v2: vector portraits (2026-10-15)
- The geometric NFT image is replaced by a 512x512 cel-shaded vector portrait generated on chain from the id and
  the traits: five species silhouettes (one per element) with a jaw shape from strength, eyes from focus, mouth
  and species teeth from strength, crest from speed, armour (pauldrons, breastplate, helmet) from defense, an item
  from the special in two designs, a weakness badge; and fifteen id-hashed features (skin tone, marks, ears,
  accessory, background, outfit, brows, metal, iris, headgear, eye shape, item design, plus the rare gold eyes
  and aura, 1 in 16 each). Integer arithmetic only, no randomness, no external data.
- New contracts: `CharacterPortrait` (entry: palettes, variants, head outlines, badge, metadata attributes) and
  five stateless rendering parts (`PortraitBase`, `PortraitBody`, `PortraitFace`, `PortraitItems`,
  `PortraitArms`, each under the 24 KB limit) called with static calls; no delegatecall, no owner, no upgrade.
  `ControllerNFT` takes the renderer address in its constructor (immutable) and `CharacterArt.sol` is now only
  the metadata library. The JSON metadata carries thirteen portrait attributes (Skin, Eye Shape, Brows, Ears,
  Marks, Accessory, Headgear, Outfit, Metal, Eyes, Item, Background, Aura) next to the trait attributes, so
  marketplaces can rank rarity.
- `Deploy.s.sol` deploys the six portrait contracts first; every precomputed address shifts by six nonces and
  `deployments/<chainId>.json` lists the new contracts. This is a breaking change for the live testnet deployment
  (redeploy required before the next testnet exercise).
- `engine/src/vectorart.ts` is the byte-identical TypeScript reference (`characterSvg`, `characterAttributes`,
  `characterTokenUri`, `characterImageUri` in `engine/src/art.ts`); shared vectors regenerated with 113 cases
  covering every branch (`engine/scripts/gen-art-vectors.mjs`); PNG preview scripts in `engine/scripts/`.
  The web renders the same image from the engine (`CharacterArt` component).

### Server as code (2026-10-14)
- `ops/`: `setup-server.sh` (idempotent: sshd hardening, ufw, fail2ban, unattended upgrades, Node 22 and kubo with
  pinned versions and checksums, Caddy, nginx micro-cache with per-IP rate limit, kubo config, Ponder service with
  memory caps, health-check cron) plus the config files it installs and a README with the publish and update steps.

### Server capacity (2026-10-14)
- Load test of the indexer behind Caddy (DEPLOY.md section 8): nginx micro-cache (5 s, request collapsing, stale on
  error) in front of Ponder lifts one core from ~60 to ~500-600 requests/s with 1,000 concurrent connections and no
  errors; `MemoryMax` on the Ponder unit and `GOMEMLIMIT` on kubo keep the 1.5 GB box out of swap-less thrashing;
  a Ponder restart is invisible to cached queries.
- Web: optional "Follow on X" footer link from `NEXT_PUBLIC_X_URL`.

### Mainnet preparation (2026-10-13)
- `Deploy.s.sol`: hardware-wallet path. Without `DEPLOYER_KEY` the script broadcasts as the `--sender`
  (`forge script --ledger --sender <address>`), whose nonce drives the precomputed addresses; verified on anvil with
  `--unlocked`. The private-key path is unchanged.
- `docs/DEPLOY.md` section 6: the mainnet runbook for Base (inputs the founder provides, pre-broadcast checks, the
  Ledger commands, post-deploy `cast` checks, verification fallback, indexer/site/ENS steps, no rollback).
- `web/scripts/testnet-flow.mjs`: end-to-end exercise of a live deployment (LaunchPool buy and sell, eight characters
  with eight controllers, curve and AMM trades, a staked Blitz match with commit and reveal, season license, an
  8-player tournament, vesting release), resumable from chain state; results recorded in DEPLOY.md.

### Base Sepolia redeploy with the frozen constants (2026-10-13)
- Eleven contracts (now including AmmFactory) in twelve transactions, blocks 48061726–48061737; addresses in
  `contracts/deployments/84532.json` and `docs/DEPLOY.md`; founder buy 0.005 ETH on testnet. The server indexer
  moved to schema `tl_84532_v4` from block 48061726; the launch-ui default pool and the web build point at the new
  LaunchPool. The 2026-10-09 deployment (V = 5, no AmmFactory) is superseded.

### Constants frozen for the redeploy (2026-10-13)
- `LP_VIRTUAL_ETH` 5 → 1 ETH: the founder's budget sizes the curve; 20 % of the supply now costs 2/7 ETH (0.2857 ETH),
  the deploy script's default. Everything else stays as designed by the founder's decision: cap 1 ETH per day for
  30 days, 0.5 ETH per buy, mint fee 5,000 TRCH, license 10,000 TRCH, seed 100 M over 24 months, treasury shares,
  rake 3/2/0. Consequence: the same ETH inflow moves the price five times further than with V = 5 (the day-30
  ceiling with a full cap is ×592 instead of ×32), so fixed TRCH amounts reach a given dollar level at roughly 45 %
  of the inflow; documented in BALANCE-REPORT §2, which is regenerated from the model.
- Tests, the simulation constants and the economy tests, the web and launch-ui texts and DEPLOY.md follow; battle
  constants and vectors are untouched.

### WP12 — Marketplace (2026-10-09)
- `/marketplace/`: every character with its curve and AMM pool prices in TRCH, liquidity (curve real reserve plus
  the pool's TRCH side), all-time volume and rating; search by name, ticker or id; ordered by age, rating or name,
  never by price. Each row opens inline trading on both markets (`CurvePanel`, extracted from the character page,
  and `AmmPanel`). Portfolio for the connected wallet: character tokens and LP shares with the LP underlying,
  valued at the current curve quote (labelled as a quote, not a sale price), read with `useReadContracts`. Recent
  trades merge curve trades and AMM swaps (`useTrades`), newest first. Linked from the header, footer and home.
- Header, footer and home link the page; the How-it-works FAQ mentions both venues. No promotional elements, no
  yield figures, no price leaderboard (plan §19.4). With this the feature list is closed until mainnet.

### WP11 — AMM secondary market (2026-10-09)
- `AmmFactory.sol`: permissionless, immutable factory of one TRCH/character-token pair per character. Only tokens
  the CharacterFactory registered can be paired (checked through the id the token claims); TRCH, LP shares, EOAs
  and foreign tokens are rejected. No owner, no pause, no fee switch. Deployed last by `Deploy.s.sol` (nonce n+10,
  referenced by nobody, so the precomputed addresses are unchanged) and written to `deployments/<chainId>.json`.
- `AmmPair.sol`: Uniswap-v2-style constant product with LP shares as an ERC-20 ("Trenchampionship LP X/TRCH",
  `LP-X`). Explicit amounts pulled with `transferFrom` (no router): `addLiquidity` (optimal amounts at the current
  ratio, first deposit locks `AMM_MINIMUM_LIQUIDITY` = 1000 wei of shares at a dead address), `removeLiquidity`,
  `swapTlForToken`, `swapTokenForTl`, quotes for all three. Reserves live in storage only (no `sync`/`skim`);
  every output rounds down, so k never decreases through a swap. Swaps and `removeLiquidity` are documented
  exceptions to pull-payment (exchange in the same call), like the two `sell()` functions.
- Config: `AMM_LP_FEE_BPS` 30 (stays in the pair), `AMM_PROTOCOL_FEE_BPS` 5 (always in TRCH, taken from the TRCH leg,
  paid in the same call), `TREASURY_AMM_BPS` 5000 (treasury switch #4; the rest to RewardPool); confirmed by the
  founder on 2026-10-13. The protocol never holds character tokens.
- Tests: `Amm.t.sol` (19 unit and fuzz tests: factory validation, first and later deposits, removal, both swap
  directions with exact fee splits, slippage and zero guards, donations ignored, k monotone, quotes match execution,
  add-then-remove never profits, fee split exact) and `Amm.invariant.t.sol` (1000 runs × 100 calls: reserves backed,
  LP conservation with the lock, TRCH and token conservation, protocol fees delivered in full, k tracks the ghost).
  140 tests, 4 invariant suites, coverage 100 % lines/functions on the new contracts, Slither 0 high/medium.
- Indexer: `amm_pair`, `amm_swap`, `amm_liquidity` tables, `character.ammPair`, `protocol_stats.ammVolumeTl`,
  treasury flows with source `amm`; LP supply tracked from the share token's mint/burn transfers. Deployments
  without an AmmFactory (the current Base Sepolia one) index the zero address, i.e. nothing, until the next deploy.
- Web: `AmmPanel` on the character page (pool state from the chain; create pool, swap both ways, add and remove
  liquidity with 1 % slippage guards), hidden on deployments without an AmmFactory; constants mirrored in `CONFIG`;
  How-it-works gets the AMM subsection, a FAQ entry and glossary terms.
- Indexer fix: the `ControllerNFT:Transfer` handler skipped nothing on the mint, which is emitted before
  `CharacterCreated` in the same transaction, so Ponder 0.11.44 aborted the sync with RecordNotFoundError on anvil;
  the handler now ignores transfers for characters that do not exist yet (CharacterCreated sets the controller).
- Smoke test on anvil: deploy (11 contracts), create a character, open its pool, add liquidity, swap both ways;
  the indexer's reserves, LP supply, volume and treasury flows match the chain to the wei.
- Design decision (plan §19.3 mentioned token/token pairs; confirmed by the founder 2026-10-13): every pair is
  TRCH/character token, so the protocol fee is always TRCH and RewardPool never receives character tokens;
  token/token trades take two swaps.

### WP10 — on-chain character art (2026-10-09, part 2: web)
- `web/src/components/CharacterArt.tsx`: `<CharacterArt>` renders the engine's `characterImageUri` (byte-identical to
  `ControllerNFT.tokenURI`) as an isolated `<img>` data URI, `<CharacterChip>` is thumbnail + linked name, `traitsOf`
  maps an indexer row to engine traits. No upload, no external image request: the artwork is computed from the
  indexed traits and name.
- Shown everywhere a character appears: character page header (192 px, with a note on the on-chain origin; the
  creator's optional reference image is now a link instead of an inline external image), home (top-5 chips and both
  sides of open challenges), Arena (your characters, match lists, a match-up preview in the challenge form, the side
  panels of a match), Create builder (live 176 px preview of exactly what would be minted, with the id the factory
  assigns next = `characterCount + 1`), League (top-10 and eligibility) and Tournaments (player chips).
- `useCharactersByIds` (GraphQL `id_in`) for lists that only carry character ids.
- The Base Sepolia contracts predate WP10, so their `tokenURI` carries no image yet; the web renders the same artwork
  from the traits regardless. The next testnet deploy (after WP11/WP12) closes the gap.

### WP10 — on-chain character art (2026-10-09, part 1: contracts + engine)
- `CharacterArt.sol`: pure library rendering a deterministic 512x512 SVG and ERC-721 JSON metadata from a
  character's id, traits and token name (element palette, special glyph, trait polygon, element/weakness
  markers, particles seeded by keccak of the id). `ControllerNFT.tokenURI` now returns it; the creator's
  `metadataURI` stays in the factory as a reference. No new contract, deploy script unchanged.
- `engine/src/art.ts`: byte-identical TypeScript port (`characterSvg`, `characterTokenUri`, `characterImageUri`),
  shared vectors `engine/vectors/art-vectors.json` (16 cases) generated by `engine/scripts/gen-art-vectors.mjs`
  and checked by both `forge test` and vitest. Coverage 100 % on the new code; 116 forge tests, 7 engine tests,
  Slither 0 findings.
- Decided 2026-10-09 (plan §19): WP11 AMM for TRCH pairs and WP12 marketplace follow; creation protections stay.

### English everywhere (2026-10-09)
- All public documentation, the changelog, the balance report and the simulation's report strings are in English.
- Battle identifiers renamed to English across Solidity, TypeScript and Python (stances Attack/Defense/Counter,
  elements Fire/Air/Earth/Water/Shadow, specials FirstStrike/Armor/Endurance/Adaptation/Pressure/Finisher/
  Counterstrike/Balance, first-strike mode `attack_r1`, archetype labels A/C/D-spec); numeric encoding unchanged,
  shared vectors regenerated from the Python reference, all three test suites green.
- launch-ui rewritten in English with built-in LaunchPool addresses per network and a wallet-network check.

### Rename — TRENCHAMPIONSHIP (2026-10-09)
- The project is publicly called TRENCHAMPIONSHIP; the token is "Trenchampionship" with the symbol TRCH, the controller NFT
  "Trenchampionship Controller" (TRCHC). The EIP-712 domain for the commit salt in the web app is "Trenchampionship".
- Code identifiers (TLToken, TL-prefixed constants, the @traitleague/* packages) deliberately stay; only
  user-visible texts change (web, launch-ui, README, DEPLOY, THREAT-MODEL, the engineering brief). BALANCE-REPORT
  gets a note instead of rewriting 140 occurrences.
- The testnet (84532) still carries the old token name; a new deploy goes together with freezing the constants.

### WP9 — Base Sepolia deploy (2026-10-05)
- 10 contracts in 11 transactions (blocks 47715924–47715934); addresses in `contracts/deployments/84532.json`,
  broadcast record in `contracts/broadcast/Deploy.s.sol/84532/run-latest.json`; gas ≈ 0.0001 ETH.
- Founder buy of 0.01 ETH in the LaunchPool constructor → 1,796,407.19 TL (0.18 % of supply; testnet amount).
  RewardPool holds 100 M TL, LaunchPool 898.2 M TL, `realReserve` = 0.01 ETH. Treasury = guardian = deployer.
- The source of all 10 contracts verified on Blockscout without an API key: 6 through `forge script --verify` (subject to the rate limit
  of the public Etherscan-compatible API), 4 through Blockscout's v2 standard-input endpoint, one per window
  (procedure in `docs/DEPLOY.md`).
- Web build for `NEXT_PUBLIC_CHAIN_ID=84532` passes (8 routes, addresses baked in); indexer START_BLOCK 47715924.

### WP9 — testnet deployment preparation (2026-10-05)
- `contracts/.env.example`: template for DEPLOYER_KEY, TREASURY, GUARDIAN, FOUNDER_BUY_ETH; forge
  loads `contracts/.env` by itself, the file is in `.gitignore`.
- Deploy script simulated on Base Sepolia without sending: 25.1 M gas, ≈ 0.0003 ETH at 0.01 gwei.
- `web/scripts/sync-deployments.mjs` generates `src/deployments/index.ts` from all the
  `contracts/deployments/*.json`; `config.ts` no longer imports chains by hand.
- `docs/DEPLOY.md`: procedure with `.env`, `--slow` broadcast (CREATE addresses depend on the nonce),
  verification through Blockscout without an API key, Basescan as an alternative, `--resume` after an interruption.
- Pseudonymisation: the founder is referred to in text only by role; the specification, the design notes, the legal
  constraints and the hand-over notes moved to the gitignored `docs/private/` and removed from the history; git history rewritten
  with the pseudonym and the +0000 zone. The rule is in the engineering brief.

### WP8 — indexer, web, launch-ui (2026-10-02)
- `indexer/`: Ponder 0.11, configuration from `contracts/deployments/<chainId>.json`, schemas for characters,
  trading (character curves and the LaunchPool), matches, stakes, rating, seasons, tournaments, treasury flows
  and protocol statistics; GraphQL and SQL API. Smoke test on anvil passes (character creation, founder
  buy, fees). Requires Node 22 (Node 24 silently kills the process) and `--hostname 0.0.0.0` on Windows.
- `web/`: Next.js 15 static export, wagmi + Coinbase Smart Wallet; pages Home, Create a character
  (builder with an evaluation against the archetypes by the same engine), Character (market, history, license,
  retirement), Arena (challenge, accept, staking, commit/reveal with a salt from an EIP-712 signature and
  the tactic encrypted in the event, poke, payouts), Tournaments, League, Transparency. Build 8 routes.
- `launch-ui/index.html`: a single file with no build for buying/selling TL (viem from a CDN).
- `docs/DEPLOY.md`: procedure for contracts, indexer, web and launch-ui; addresses are entered after the deploy.

### WP7 — audit preparation (2026-10-02)
- Three invariant suites (LaunchPool, CharacterPool, matches + staking; 1000 × 100 calls):
  reserve accounting, k never decreases, solvency, token conservation, escrow == claimable,
  the vault holds stakes and rewards, seed locked. The match invariant uncovered a 1-wei gap in the
  rake split (fixed: the burn share absorbs the remainder).
- Slither: 0 high/medium on 62 contracts; CEI in `Tournament._finish`, initialised locals,
  zero-check in constructors.
- `docs/THREAT-MODEL.md`: trust assumptions, assets and invariants, attacks and defences,
  consciously accepted limitations.

### WP1 — freezing the battle constants (2026-10-02)
- `docs/BALANCE-REPORT.md`: sweep of 80 compositions (0.46–0.56, nobody above 0.60), stance bonus
  sensitivity, element and special studies.
- Element ±1 (was ±3), weakness −2 (was −4); specials equalised at +0.05: Armor −2,
  Endurance +1, Pressure/Finisher +2, Counterstrike +8; redesign of First Strike (+4 in Attack in
  round 1), Adaptation (never a negative element) and Balance (budget 45, shield −2 on the opponent's
  stance bonus). Implemented in Solidity, Python and TypeScript; vectors regenerated.

### WP6 — tournaments and deploy script (2026-10-02)
- `Tournament.sol`: brackets of 8/16, registration with escrow, seeding by rating, rounds through
  MatchManager (preset Tournament), a replay of a drawn match and then a tiebreak by rating, prizes
  60/25/7.5/7.5 after the 5 % rake, organiser fee 0–2 %, lock of the characters while the bracket runs.
- `script/Deploy.s.sol`: the whole protocol in one broadcast with precomputed addresses,
  founder buy in the LaunchPool constructor, addresses written to `deployments/<chainId>.json`.
- 12 new tests (112 in total), 100 % lines and functions.

### WP5 — matches, staking, rating (2026-10-02)
- `RewardPool` (seed with linear release, payouts only by the formula 2 % / 20 % of
  `available`), `StakingVault` (no-loss staking per match, pro-rata reward, dust back to the pool),
  `Rating` (Elo with the FIDE table, K 32/16, cap of 3 matches per pair per season, licenses, lazy
  squeeze, on-chain top-10 with `nominate`, `closeSeason` 40/20/10/8/6/5/4/3/2/2),
  `MatchManager` (challenge/accept/commit/reveal, presets, forfeit/void/draw, 24 h cooldown,
  friendly matches, open challenges, tournament hook, pull claims).
- 37 new tests (unit and integration through the whole protocol with precomputed
  addresses); 100 % lines and functions.

### WP4 — characters (2026-10-02)
- `CharacterToken`, `CharacterPool` (TL bonding curve per character, 1 % protocol fee RewardPool/treasury,
  creator fee 0–1 % to the current controller, selling bounded by the real reserve),
  `CreatorVesting` (linear vesting of the allocation), `ControllerNFT` (lock while the character is busy,
  `retire`), `CharacterFactory` (validation of traits and tokenomics, mint fee split
  50/25/25, creation in one transaction, the creator's first buy), `GuardianPausable`.
- 20 tests + pool accounting fuzz; 100 % lines and functions; Slither without high/medium.

### WP3 — battle engine (2026-10-02)
- `BattleEngine.sol` (variant L), TypeScript port `engine/`, 220 shared vectors
  generated from the Python reference engine; all three environments bit-identical.

### WP2 — TL and LaunchPool (2026-10-02)
- `Config.sol`, `BondingCurve.sol`, `TLToken.sol` (900 M / 100 M), `LaunchPool.sol`
  (founder buy in the constructor, daily cap for 30 days, selling bounded by the real reserve).

### WP1 — simulation (2026-10-02, in progress)
- `sim/`: reference engine, Nash solvers (LP, double oracle, RM+ with a certificate),
  economy model, sweep and report generator.

### WP0 — repository and tooling (2026-10-02)
- Monorepo skeleton: `contracts/` (Foundry, OpenZeppelin 5.x), `engine/`, `sim/`,
  `indexer/`, `web/`, `launch-ui/`, `docs/`.
- Design notes v0.2 (`docs/private/`): decisions V = 5 ETH, daily cap, RewardPool seed 10 %,
  character tokenomics chosen by the creator, rake split 3/2, season license, battle formula L.
- Engineering brief v0.2 aligned with the decisions; legal constraints (`docs/private/`) first version.
- `sim/prototype/`: the scripts behind the figures in the analysis (bonding curve, minimax of the formula variants).
- CI: forge fmt/build/test/coverage, Slither.
