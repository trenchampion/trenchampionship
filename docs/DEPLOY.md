# DEPLOY.md — how everything is brought up, and where things are

Status: **Base Sepolia deployed 2026-10-13** (frozen constants, block 48061726; earlier testnet deployments 2026-10-09 and 2026-10-05). Mainnet not yet: runbook in section 6.

## Prerequisites (one-off, free)

- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- Node **22** (the indexer does not run on Node 24 because of an incompatibility in Ponder 0.11) and pnpm 12
- uv (Python 3.12 for the simulation and scripts)
- A deployer wallet with a little ETH on the target network (Base Sepolia: faucet; Base: ~0.05 ETH for gas + the founder buy)

## 1. Contracts

```bash
cd contracts
cp .env.example .env                     # DEPLOYER_KEY, TREASURY, GUARDIAN, FOUNDER_BUY_ETH; forge loads .env by itself
forge test                               # 113 tests + invariants must be green
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org              # simulation, nothing is sent
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast --slow \
  --verify --verifier blockscout --verifier-url https://base-sepolia.blockscout.com/api/
```

Variables (all in `contracts/.env`, which is in `.gitignore`; the template is `contracts/.env.example`):

| Variable | Meaning |
| --- | --- |
| `DEPLOYER_KEY` | the deployer's private key; the deployer is also the founder and receives the founder TRCH |
| `TREASURY` | the address that receives the treasury shares from Config.sol; on testnet it can be the deployer |
| `GUARDIAN` | a Safe 2/3 or the deployer; can only pause, for 365 days from deploy |
| `FOUNDER_BUY_ETH` | wei sent with the LaunchPool deploy; 0.2857 ETH (2/7 ETH) for ~20 % on mainnet at V = 1 ETH, on testnet 0.01 ETH is enough; 0 disables it. The script fails on a malformed value instead of using a default |

The script deploys 17 contracts (the six portrait contracts come first, since CharacterArt v2; the AmmFactory comes
last, referenced by nobody) in one broadcast with precomputed addresses (CREATE addresses
depend on the nonce order, hence `--slow`: each transaction waits for the previous one to be confirmed), executes
the founder buy in the LaunchPool constructor and writes `deployments/<chainId>.json`. Committed are
`deployments/<chainId>.json` and `broadcast/Deploy.s.sol/<chainId>/run-latest.json` (except for anvil 31337).
An interrupted broadcast is resumed with the same command plus `--resume`.

Simulation on Base Sepolia (2026-10-05): 25.1 M gas, ≈ 0.0003 ETH at 0.01 gwei; so you need
FOUNDER_BUY_ETH + ~0.001 ETH reserve for gas.

Verification: Blockscout needs no key. Basescan needs an Etherscan V2 key; since Etherscan moved Base out of its free
API tier `forge --verifier etherscan` stops with "Free API access is not supported for this chain", but the
verification endpoints themselves still take a free key, so `ops/verify-basescan.sh` calls them directly with
standard-JSON input (17/17 exact matches on mainnet, 2026-10-20). The CharacterToken and CharacterPool that the
Factory creates later are verified once, manually (`forge verify-contract`); the explorer recognises other instances of the same
bytecode by itself.

Check: `cast call <LaunchPool> "realReserve()(uint256)" --rpc-url ...` must return the amount of the founder
buy; `cast call <TLToken> "balanceOf(address)(uint256)" <RewardPool>` must be 100 M TRCH.

## 2. Indexer (Ponder)

Production: `ops/README.md` and `ops/setup-server.sh` set up a whole server (hardening, Node 22, Caddy, the nginx
micro-cache, kubo, the Ponder service with memory caps, a health-check cron) in one run; section 8 has the capacity
numbers behind those settings. Local development:

```bash
cd indexer
cp .env.example .env.local               # CHAIN_ID, PONDER_RPC_URL_<id>, START_BLOCK
pnpm install
pnpm exec ponder dev                     # local
pnpm exec ponder start --schema tl_<chainId>   # production (Railway hobby / Fly / own machine)
```

Notes: Ponder needs an open stdin (in a `systemd`/Docker environment that is the default; from a script that
closes stdin the process exits silently). The default hostname `::` on Windows listens on IPv6 only, so the scripts
in `package.json` pass `--hostname 0.0.0.0`. The database is PGlite in `.ponder/`; for Postgres set
`DATABASE_URL`. GraphQL is at `/graphql`, the SQL client at `/sql/*`.

## 3. Web app (static export)

```bash
cd web
NEXT_PUBLIC_CHAIN_ID=84532 NEXT_PUBLIC_INDEXER_URL=https://indexer.example.com \
NEXT_PUBLIC_LAUNCH_UI_URL=https://launch.example.com pnpm build       # -> web/out
```

`web/out` goes to IPFS (Fleek, 4EVERLAND, Pinata) or GitHub Pages. The build copies
`contracts/deployments/*.json` into `web/src/deployments/` and generates `index.ts` with all the chains present;
a new chain needs no code change, only the JSON from the deploy script.

## 3b. ENS

`trenchampionship.eth` registered on 2026-10-09 on Ethereum mainnet (owner: the project's working wallet), content hash
`ipfs://bafybeidwsvao57ivoyjpl2me2vzswvlhsxwyqrqz4z7xzi64hpt7payxry`. Site: https://trenchampionship.eth.limo
(and `.eth.link`). Expiry: 2027-10-09, 90-day grace period; renewal is a single transaction in app.ens.domains.
A new site build = a new CID = a content hash change (Records → Edit → Other → Content Hash).

## 3a. Published site versions (IPFS)

| Date | Network | Content | CID |
| --- | --- | --- | --- |
| 2026-10-09 | Base Sepolia (84532) | web + `launch-ui/` in the same directory, indexer `https://45-142-142-2.sslip.io` | `bafybeidwsvao57ivoyjpl2me2vzswvlhsxwyqrqz4z7xzi64hpt7payxry` (own IPFS node on the server) |
| 2026-10-09 (v2) | Base Sepolia (84532) | redesigned English site + `launch-ui/`, contracts of block 47891722, indexer `https://45-142-142-2.sslip.io` | `bafybeieydkokrbn7evdhht7l2aqqpsszotfu36bvybrystsmtq7ff7paf4` (server + VM nodes) |
| 2026-10-13 | Base Sepolia (84532) | light "arena" design, disclaimer, contracts of block 48061726 | `bafybeigjn22ynlbfwu7xosa7zbukwabxoln47nlubjqxlv42cragjhamzi` (server + VM nodes) |
| 2026-10-14 | Base Sepolia (84532) | founder section removed, X link, launch-ui connected state | `bafybeidqlykmvfbuo5hdfyhzey52od2v2h7upn6me2dwwvk2jsfvfgd52q` (server + VM nodes); published as IPNS `k51qzi5uqu5dh5hl92drldnpnrz9mvm4kunxtil96oyi2ksur2rrd3bi2lmvss` |
| 2026-10-15 | Base Sepolia (84532) | CharacterArt v2 portraits, contracts of block 48142935, launch-ui on the new pool | `bafybeifjmpbswq7rvzankcqkau3p2rcyzhn46xhsm6f2ffref6dgf4bmym` (superseded the same day) |
| 2026-10-15 (v2) | Base Sepolia (84532) | home page explains the league idea, optional character story in the builder | `bafybeia47anuwpcbiuhwd6rkkfonzebebnw3v25zfzo464hcg3det3u3sm` (superseded the same day) |
| 2026-10-15 (v3) | Base Sepolia (84532) | contracts of block 48148395 (security review fixes), builder checks the metadata bound | `bafybeif4yq4dbt75lcnwjyfpvgfi6itck6jmxzhdoz65fdrdih4tsaoqqm` (superseded) |
| 2026-10-16 | Base Sepolia (84532) | one brand mark everywhere (element-coloured pentagon), favicon | `bafybeifmumlnhpkl7g7x3hy343hjtc3rcfdyjrhmp5s3dkqwyy375gkvsq` (server + VM nodes, current IPNS target; ENS points at the IPNS name since 2026-10-15) |

IPNS name of the site (ENS content hash target): `ipns://k51qzi5uqu5dh5hl92drldnpnrz9mvm4kunxtil96oyi2ksur2rrd3bi2lmvss`.
The `site` key lives on the server's kubo and, as a backup, on the VM's kubo; after every build
`ipfs name publish --key=site --lifetime=8760h /ipfs/<cid>` on the server (the daemon re-announces the record while it
runs; the VM node can publish the same name if the server is down).

The source of truth is the IPFS node (kubo) on our own server: pin + announce to the network, independent of providers. A 4EVERLAND
Bucket (wallet sign-in) is an additional copy once it works; its CID of the same directory (`bafybeialusysnifgwgjrqko2gva7hgwjw5bxy4yy52iczx6wh5csn5wxmq`,
different packing) was not retrievable from the network. The same content can be pinned anywhere. Gateways: `https://<CID>.ipfs.4everland.io/`, `https://ipfs.io/ipfs/<CID>/`. ENS `trenchampionship.eth`
points at an **IPNS name** (`ipns://<key>`, the `site` key of the kubo node, backed up on the VM node) since
2026-10-14, so a new build is one `ipfs name publish` and no ENS transaction; the CID table above stays the audit
trail of what was published.

## 4. LaunchPool UI

`launch-ui/index.html` is a single file with no build; it is published to IPFS separately from the app.
The pool address can be given in the URL (`?chain=84532&pool=0x...`). The CID is recorded here.

## 5. After the deploy

- Enter the addresses and CIDs in the table below and on the Transparency page (it reads them from
  `deployments/<chainId>.json`).
- Guardian: confirm the Safe signers and the pause expiry date (deploy + 365 days).

## 6. Mainnet runbook (Base, chain id 8453)

Everything below is prepared; the inputs that only the founder can give are marked **[founder]**. Nothing in the
code changes between testnet and mainnet except the chain id, the three addresses and the founder-buy amount.

### 6.1 Inputs

| Input | Value | Who |
| --- | --- | --- |
| Deployer | a fresh software-wallet account (MetaMask or any EVM wallet) in the pseudonymous VM, used for nothing else; also the founder: receives the founder TRCH. Decided 2026-10-14: software wallets, no hardware wallet (the risk of a key on an internet-connected machine was explained and accepted) | **[founder]** creates the account |
| `GUARDIAN` | a second fresh account in the same wallet (1/1, no Safe); can only pause create/challenge/accept/stake for 365 days, never touches funds | **[founder]** creates the account |
| `TREASURY` | a third fresh account, separate from the deployer and from the working wallet, receiving the Config.sol shares (mint 25 %, trade 50 %, AMM 50 %, rake 0 %); the address is immutable, so it must stay under the founder's control for the life of the protocol | **[founder]** creates the account |
| `FOUNDER_BUY_ETH` | `285714285714285714` wei = 2/7 ETH = 20.00 % of the supply at V = 1 ETH | fixed |
| Deployer balance | 2/7 ETH + gas. The deployment is 18 transactions and ~58.7 M gas (mainnet simulation of 2026-10-15 with the founder buy); on Base at 0.01-0.05 gwei that is 0.0003-0.002 ETH plus the L1 data fee, which usually dominates (~0.005-0.02 ETH). Fund **0.32 ETH** and keep the rest | **[founder]** |
| RPC | `https://mainnet.base.org` (public; a free dRPC/Alchemy endpoint is the fallback if it rate-limits the 18-transaction broadcast) | fixed |

The deployer's ETH must not come from an address linked to the founder's identity (see the private notes on
pseudonymity): exchange withdrawal or a Monero swap to the Ledger account, then bridge to Base.

### 6.2 Before the broadcast

The broadcast runs **inside the VM**, not on the Windows machine: the deployer key never leaves the pseudonymous
environment and the RPC traffic goes through Mullvad. One-off preparation (the operator, as the VM service user, then
hand-over to the founder's user): Foundry installed for the founder's user (`curl -L https://foundry.paradigm.xyz | bash
&& foundryup`), the repository at the release commit in `/home/user/trenchampionship` (from the bundle), `contracts/.env`
with `TREASURY`, `GUARDIAN`, `FOUNDER_BUY_ETH=285714285714285714` and no `DEPLOYER_KEY`. The founder then imports the
deployer key once into Foundry's encrypted keystore, in a VM terminal, never in chat:

```bash
cast wallet import deployer --interactive        # pastes the private key exported from the wallet, sets a password
cast wallet address --account deployer           # must print the deployer address
```

The checks below run on the Windows machine (tests, coverage, Slither) and are repeated as `forge build` in the VM.

```bash
git status                                   # clean; HEAD is what gets deployed
cd contracts && forge test && forge coverage --no-match-coverage "(script|test)" --report summary
slither . --filter-paths lib/                # 0 high / 0 medium
cd .. && pnpm abis && git status             # ABIs in web and indexer must already match the contracts
cd engine && pnpm test && cd ../sim && uv run --python 3.12 pytest -q
```

`contracts/.env` for mainnet: `TREASURY`, `GUARDIAN`, `FOUNDER_BUY_ETH=285714285714285714`, and **no `DEPLOYER_KEY`**
(comment the line out; the script then broadcasts as the `--sender`). Optional `RPC_URL`.

`--slow` waits for each receipt so the CREATE nonces stay in order; `--account deployer` signs with the keystore
(forge asks for its password once). A hardware wallet would use `--ledger --hd-paths ...` in place of `--account`;
the script is the same.

```bash
cd ~/trenchampionship/contracts
DEPLOYER=0x...                                              # the deployer address
# 1) simulation only: prints the gas estimate and the predicted addresses, sends nothing
forge script script/Deploy.s.sol --rpc-url https://mainnet.base.org --account deployer --sender $DEPLOYER
# 2) broadcast
forge script script/Deploy.s.sol --rpc-url https://mainnet.base.org --account deployer --sender $DEPLOYER \
  --broadcast --slow --verify --verifier blockscout --verifier-url https://base.blockscout.com/api/
# interrupted? same command plus --resume (it continues from the last confirmed transaction)
```

The keyless path (`DEPLOYER_KEY` unset, broadcaster = `--sender`) was exercised on anvil with `--unlocked` on
2026-10-13: predicted addresses match, `realReserve` = 2/7 ETH, the sender holds 200 M TRCH. After the broadcast
`deployments/8453.json` and `broadcast/Deploy.s.sol/8453/run-latest.json` are copied back to the Windows repository
(bundle the other way, or scp) and committed there.

### 6.3 Right after the broadcast

First, in the VM, delete the keystore: `rm ~/.foundry/keystores/deployer` (the key is imported just before the
broadcast and exists only for those 18 transactions; the wallet keeps the account). Then the checks:

```bash
RPC=https://mainnet.base.org
LP=$(jq -r .LaunchPool deployments/8453.json); TL=$(jq -r .TLToken deployments/8453.json)
RP=$(jq -r .RewardPool deployments/8453.json); CF=$(jq -r .CharacterFactory deployments/8453.json)
cast call $LP "realReserve()(uint256)" --rpc-url $RPC             # 285714285714285714
cast call $TL "balanceOf(address)(uint256)" $RP --rpc-url $RPC    # 100000000e18
cast call $TL "balanceOf(address)(uint256)" $DEPLOYER --rpc-url $RPC   # ~200000000e18
cast call $CF "GUARDIAN()(address)" --rpc-url $RPC
cast call $CF "TREASURY()(address)" --rpc-url $RPC
cast call $CF "DEPLOY_TIME()(uint256)" --rpc-url $RPC             # pause expiry = +365 d
# wiring read back from the chain (addresses from deployments/8453.json); every line must match
cast call $CF "nft()(address)" --rpc-url $RPC                      # ControllerNFT
cast call $CF "vesting()(address)" --rpc-url $RPC                  # CreatorVesting
cast call $NFT "ART()(address)" --rpc-url $RPC                     # CharacterPortrait
cast call $NFT "RATING()(address)" --rpc-url $RPC                  # Rating
cast call $NFT "MATCH_MANAGER()(address)" --rpc-url $RPC           # MatchManager
cast call $NFT "TOURNAMENT()(address)" --rpc-url $RPC              # Tournament
cast call $RP "MATCH_MANAGER()(address)" --rpc-url $RPC            # MatchManager
cast call $RP "RATING()(address)" --rpc-url $RPC                   # Rating
cast call $MM "TOURNAMENT()(address)" --rpc-url $RPC               # Tournament
cast call $NFT "tokenURI(uint256)(string)" 1 --rpc-url $RPC | head -c 80   # after the first character: data:application/json;base64,...
```

Verification: if `--verify` is rate-limited (429, as on testnet), run the standard-json loop: for each contract
`forge verify-contract --show-standard-json-input <addr> src/X.sol:X > X.json` and submit to
`https://base.blockscout.com/api/v2/smart-contracts/<addr>/verification/via/standard-input` every ~30 min until
`is_verified` is true (`ops/verify-blockscout.sh`). Basescan: `ETHERSCAN_API_KEY=... bash ../ops/verify-basescan.sh`
from the contracts directory of the release commit (direct Etherscan v2 API calls; the forge verifier is blocked for
Base on the free tier).

Commit `deployments/8453.json` and `broadcast/Deploy.s.sol/8453/run-latest.json`; add the address table to this file
(section "Addresses"), set `launch-ui/index.html` `NETWORKS[8453].pool` and move the `selected` attribute of the chain picker to the 8453 option, write the CHANGELOG `## [1.0.0]` entry and tag
`v1.0.0` on that commit. There is no bug bounty (decided 2026-10-14).

### 6.4 Indexer, site, ENS

1. Server: `indexer/.env.local` -> `CHAIN_ID=8453`, `PONDER_RPC_URL_8453=https://mainnet.base.org`,
   `START_BLOCK=<deploy block>`; `ponder.service` -> `--schema tl_8453`; restart; `/health` 200, `/ready` 200 after the
   sync. The server runs one indexer only (memory): the testnet indexer stops when the mainnet one starts (decided
   2026-10-14; the testnet is not needed after launch). Before the switch the server passes the load test of
   section 8.
2. Web: `NEXT_PUBLIC_CHAIN_ID=8453 NEXT_PUBLIC_INDEXER_URL=https://45-142-142-2.sslip.io pnpm build` (the testnet
   notice disappears by itself; `IS_TESTNET` is 84532 only), copy `launch-ui/index.html` to `web/out/launch-ui/`,
   publish to `/var/www/preview` for a last look, then pin on the server and VM nodes (section 3a procedure) -> new CID.
3. ENS: `trenchampionship.eth` content hash -> the mainnet CID **[founder]** (decided 2026-10-14: the name points at
   the mainnet build; no testnet subname).
4. Transparency page: shows the guardian, the pause expiry, the treasury flows and the contract addresses; check
   them against the values above. The founder purchase is verifiable on chain (`FounderBuy` event); the site does
   not display or announce it (decided 2026-10-14).

### 6.5 Rollback

There is none: the contracts have no admin. If a deployment is wrong (wrong treasury, wrong guardian), the fix is a
fresh deployment with a fresh deployer account and the old addresses are never linked. Hence the simulation step
and the six `cast call` checks before anything is announced.

## 7. Testnet exercise of the whole flow (Base Sepolia, 2026-10-13)

`web/scripts/testnet-flow.mjs` ran every user action against the block-48061726 deployment with the deployer and
seven derived controllers (`node scripts/testnet-flow.mjs`, re-runnable; `status` is read-only). Gas is the
on-chain `gasUsed`; at Base Sepolia's 0.006 gwei the whole exercise (86 transactions) cost 0.00015 ETH. On Base
mainnet the L1 data fee dominates; multiply by the gas price of the day.

| Action | Gas (max observed) |
| --- | --- |
| `LaunchPool.buy` / `sell` | 75,096 / 65,715 |
| `CharacterFactory.createCharacter` (deploys pool + token; with vesting) | 2,101,970 (2,212,492) |
| `CharacterPool.buy` / `sell` | 111,802 / 89,614 |
| `AmmFactory.createPair` | 1,931,658 |
| `AmmPair.addLiquidity` / `swapTlForToken` / `swapTokenForTl` / `removeLiquidity` | 212,947 / 84,662 / 84,761 / 83,302 |
| `MatchManager.challenge` / `accept` / `commit` | 252,255 / 106,480 / 62,497 |
| `MatchManager.reveal` first / second (resolves: battle, escrow, rake, stakers, rating) / `claim` | 102,744 / 431,499 / 38,932 |
| `StakingVault.stake` / `withdraw` | 135,443 / 56,383 |
| `Rating.license` / `nominate` | 86,795 / 55,551 |
| `Tournament.create` / `register` / `start` (8 players, 4 matches) / `advance` (4 results, 2 new matches) | 113,292 / 181,162 / 1,164,947 / 574,336 |
| tournament match: second `reveal` (resolves, no escrow) | 310,195 - 344,626 |
| `CreatorVesting.release` | 70,958 |
| ERC-20 `approve` | 46,378 |

State on chain after the run: characters 1-8 (Ember ... Basalt), AMM pair for Ember, match 1 (Blitz, 1,000 TRCH per
side, player2 staked Ember tokens on side 0, both committed), Ember licensed and nominated for season 0 (ends
2026-11-10), tournament 1 started (seeded 1-8, round-1 matches 2-5 committed on both sides), Gale's creator
allocation partly released. Time-gated steps and their windows (UTC): match 1 reveal 15:20-16:20 on 2026-10-13;
tournament round 1 reveal 02:23-14:23 on 2026-10-14, then `advance`, two more rounds of 12 h + 12 h each;
`closeSeason` after 2026-11-10 11:42. Results are appended below as they happen.

- 2026-10-13 15:21 UTC, match 1: both reveals in the window; outcome WinB (Gale). Winner claimed 1,900 TRCH
  (2 × 1,000 minus the 5 % rake: 60 TRCH to RewardPool, 40 burned, 0 to treasury); the staker on the losing side
  withdrew the full stake with no reward (no-loss); ratings 1000 → 984 / 1016 (K = 32). The indexer on the server
  followed every event without errors.
- 2026-10-14 08:25 UTC, tournament 1 round 1: eight reveals in the window, all four matches decided by battle
  (1 Ember > 8 Basalt, 2 Gale > 7 Zephyr, 6 Cinder > 3 Terra, 4 Tide > 5 Umbra), `advance` opened round 2
  (match 6 Ember vs Gale, match 7 Cinder vs Tide) and both sides committed within the minute. Reveal window
  20:24 on 2026-10-14 to 08:24 on 2026-10-15 UTC, then the final.
- 2026-10-15 05:54 UTC, round 2: Ember > Gale and Tide > Cinder by battle; `advance` created the final (match 8,
  Ember vs Tide), both committed. 2026-10-15 23:08 UTC, the final: both reveals (103 k and 288 k gas), `advance`
  finished the bracket (winner Ember, finalist Tide), `claim` paid 459.2 TRCH to the winner's controller, 188 to the
  finalist's and 56.4 to each semifinal loser (60 / 25 / 7.5 / 7.5 of the 800 TRCH pot after the 5 % rake and the
  1 % organizer fee). The whole scripted exercise cost 0.00018 ETH over 113 transactions; it ran on the deployment of
  block 48061726, which stays on chain but is no longer indexed (the live deployment is block 48148395).

Two lessons for any script against a public RPC: the endpoint is load-balanced and single nodes lag a block, so
(1) never read a counter right after a write (take ids from the receipt's events) and wait until a read reflects
the write before the next dependent call, and (2) do not trust `eth_estimateGas` for a call whose cost depends on
the other side's state: a lagging node estimated the second `commit` without the `bothCommittedAt` store (out of
gas by 2 k) and the second `reveal` as a plain reveal (173 k) when the real path resolves the match (431 k). The
script now sends 4 × estimate + 200 k; unused gas is refunded. The web app faces the same issue through the wallet's
estimate; wallets add their own margin, but a reveal that resolves a match should be retried if it fails.

## 8. Server load test and capacity (2026-10-14)

Setup under test: the testnet server (1 vCPU, 1.46 GB RAM, no swap possible) running Caddy (TLS), the Ponder indexer
(PGlite in-process) and a kubo IPFS node. Load generated with `oha` from the VM through Mullvad against
`https://45-142-142-2.sslip.io/graphql` with the heaviest page query (50 characters with every field, 6.3 KB per
answer), 20 s per step. The web app polls every query of an open tab every 15 s (`refetchInterval` in
`web/src/app/providers.tsx`), so 1,000 open tabs are roughly 200 requests/s of identical queries.

Findings, in order:

1. **At idle the box was already thrashing**: 0 MB free, 45 % iowait, load average 12 on one core, Ponder at 770 MB,
   kubo at 390 MB, page cache squeezed to 190 MB. Ponder's RPC calls were failing hourly from CPU starvation.
2. **Ponder alone** (kubo stopped): 100 % success, 46-68 requests/s, p50 0.36 s at 20 connections, 1.0 s at 100,
   3.2 s at 300 (two 502s). Enough for a few hundred browsing users, not for a thousand.
3. **nginx micro-cache in front of Ponder** (Caddy -> nginx 127.0.0.1:8080 -> Ponder 127.0.0.1:42069; POST bodies as
   cache key, 5 s TTL, request collapsing, stale-while-revalidate and stale-on-error, config in
   `/etc/nginx/conf.d/indexer-cache.conf`, `worker_connections 4096`): 300 connections -> 592 requests/s, 100 %
   success, p50 0.47 s, p99 1.5 s; 1,000 connections -> 499 requests/s, 100 % success, p50 1.9 s, p99 4.5 s. The
   core is then saturated by TLS and gzip, not by Ponder. A tiny query at 1,000 connections still lost 25 % to
   timeouts when the box ran out of memory again.
4. **Resilience**: with `MemoryMax=1000M` on `ponder.service` (systemd restarts it on OOM) and the cache serving
   stale answers, a Ponder restart is invisible for cached queries (three requests during the restart: 200, X-Cache
   STALE); `/health` is back after ~45 s, `/ready` once the block gap is re-synced. kubo runs with
   `GOMEMLIMIT=220MiB` (210 MB RSS instead of 390). After the restart Ponder sits at 425 MB and the box has
   250 MB free plus 600 MB of page cache.

Capacity statement for mainnet: with the cache, one core serves about 500 requests/s of the heaviest query to 1,000
simultaneous connections with no errors, which is several times the realistic peak of 1,000 open tabs. The limits
that remain are RAM (Ponder grows towards 800 MB under load and the box has 1.46 GB for everything) and the single
core for TLS. Recommendation: a plan with 2 vCPU and 3 GB (Njalla "VPS 30" class) is comfortable for the indexer,
the cache and the IPFS node together; on the current plan the IPFS node should move off the server (the VM node
plus a free pinning service keeps the CID available) and the memory cap keeps the indexer alive. Nothing on the
site depends on the indexer for safety: commit, reveal, claim and withdraw read the chain through the wallet's RPC.

Reproduce: `~/oha/run3.sh` in the VM (stops kubo for the measurement, raises the client fd limit, runs 300 and
1,000 connections, restarts kubo); results in `~/oha/run3.log`. The nginx config now also rate-limits each visitor
IP to 30 requests/s with bursts of 60 (verified: a 50-connection burst from one IP gets 86 × 200 then 429, and a
single request succeeds again 3 s later), so a capacity test from one IP needs the rate raised for its duration.
Everything the server runs is in `ops/` and applied by `ops/setup-server.sh`.

### 8.1 Acceptance test after the upgrade (2026-10-14, 2 vCPU / 2.9 GB, same machine and address)

`ops/setup-server.sh` re-applied (Ponder cap 1318 M / 1464 M, kubo running, health-check cron), then from the VM with
the per-IP limit lifted for the test, heaviest query, 30 s per step, then five minutes sustained:

| Step | Requests/s | Success | p50 | p99 | Server |
| --- | --- | --- | --- | --- | --- |
| 300 connections | 1,439 | 100 % | 0.19 s | 0.40 s | Ponder 453 MB, Caddy 275 MB, 437 MB free |
| 1,000 connections | 1,179 | 100 % | 0.83 s | 1.9 s | Caddy 510 MB, 145 MB free |
| 2,000 connections | 1,077 | 99.6 % | 1.7 s | 5.2 s | Caddy 549 MB, 132 MB free; the misses are client-side (one VM through a VPN) |
| 200 connections, 5 min | 1,468 | 100 % | 0.12 s | 0.37 s | 440,348 answers, no restart, 545-604 MB free |

The indexer kept syncing throughout: it trailed the chain head by about a minute while both cores were busy with
TLS and gzip, and was 20 s behind right after the test (equal before it). No health-check restart was logged.
Statement: the upgraded server serves well over a thousand simultaneous connections of the heaviest query with
sub-second medians, roughly three times the realistic peak of a thousand open tabs, with a gigabyte of headroom.

## Addresses

| Network | Chain id | Date | Deployer | Note |
| --- | --- | --- | --- | --- |
| Base Sepolia | 84532 | 2026-10-15 (redeploys 2026-10-13 and 2026-10-09; first 2026-10-05) | `0x61bAE910AdF32fFa0d27160E7dF29B217A107cb7` | founder buy 0.0005 ETH (testnet); treasury = guardian = deployer (testnet) |
| Base | 8453 | 2026-10-19 | `0x74B762a3f0e953501111657804D52081b1189Dc7` | founder buy 2/7 ETH (20 % of the supply at V = 1 ETH); guardian `0x0C984c00475135D5Fd808698CD6b88b995aDf546`, treasury `0x7fa18edE169491D40CeAB81ce38575f0c3432cFc` |

### Base (8453), block 52815684 (mainnet deployment of 2026-10-19)

| Contract | Address | Explorer |
| --- | --- | --- |
| PortraitBase | `0x6cD133FE3fd12Fc42BE36e48B569ef6fCa317d98` | [Blockscout](https://base.blockscout.com/address/0x6cD133FE3fd12Fc42BE36e48B569ef6fCa317d98) · [Basescan](https://basescan.org/address/0x6cD133FE3fd12Fc42BE36e48B569ef6fCa317d98#code) |
| PortraitBody | `0x174a555c0416Cca5cD7f83Dea89e8F4fCca613Bd` | [Blockscout](https://base.blockscout.com/address/0x174a555c0416Cca5cD7f83Dea89e8F4fCca613Bd) · [Basescan](https://basescan.org/address/0x174a555c0416Cca5cD7f83Dea89e8F4fCca613Bd#code) |
| PortraitFace | `0x2d400cFE0611C708c063CE16846B9512dFCf2ECb` | [Blockscout](https://base.blockscout.com/address/0x2d400cFE0611C708c063CE16846B9512dFCf2ECb) · [Basescan](https://basescan.org/address/0x2d400cFE0611C708c063CE16846B9512dFCf2ECb#code) |
| PortraitItems | `0xc428C26835943A73485D7677d9Af2896d8640B2C` | [Blockscout](https://base.blockscout.com/address/0xc428C26835943A73485D7677d9Af2896d8640B2C) · [Basescan](https://basescan.org/address/0xc428C26835943A73485D7677d9Af2896d8640B2C#code) |
| PortraitArms | `0x90A3cC29DE1fb55F1C112a6c9BeC7EE33b780115` | [Blockscout](https://base.blockscout.com/address/0x90A3cC29DE1fb55F1C112a6c9BeC7EE33b780115) · [Basescan](https://basescan.org/address/0x90A3cC29DE1fb55F1C112a6c9BeC7EE33b780115#code) |
| CharacterPortrait | `0xe5301248e097B5c7CA567638B9021925d8416bC5` | [Blockscout](https://base.blockscout.com/address/0xe5301248e097B5c7CA567638B9021925d8416bC5) · [Basescan](https://basescan.org/address/0xe5301248e097B5c7CA567638B9021925d8416bC5#code) |
| TLToken | `0x32602ce776A045145e94507030E0C0cA8E92BD18` | [Blockscout](https://base.blockscout.com/address/0x32602ce776A045145e94507030E0C0cA8E92BD18) · [Basescan](https://basescan.org/address/0x32602ce776A045145e94507030E0C0cA8E92BD18#code) |
| LaunchPool | `0x6C58A3ac191fE0f257a9864Ac880527842519d60` | [Blockscout](https://base.blockscout.com/address/0x6C58A3ac191fE0f257a9864Ac880527842519d60) · [Basescan](https://basescan.org/address/0x6C58A3ac191fE0f257a9864Ac880527842519d60#code) |
| CharacterFactory | `0x458747D2a32d1f7480AcFf8F3A06D4f4d9C3624d` | [Blockscout](https://base.blockscout.com/address/0x458747D2a32d1f7480AcFf8F3A06D4f4d9C3624d) · [Basescan](https://basescan.org/address/0x458747D2a32d1f7480AcFf8F3A06D4f4d9C3624d#code) |
| ControllerNFT | `0x7Ae59A229E6944969833EbaBa8A68566DaAf1036` | [Blockscout](https://base.blockscout.com/address/0x7Ae59A229E6944969833EbaBa8A68566DaAf1036) · [Basescan](https://basescan.org/address/0x7Ae59A229E6944969833EbaBa8A68566DaAf1036#code) |
| CreatorVesting | `0x3550c55f5494487dB2ad4B527EB455825B6C67E9` | [Blockscout](https://base.blockscout.com/address/0x3550c55f5494487dB2ad4B527EB455825B6C67E9) · [Basescan](https://basescan.org/address/0x3550c55f5494487dB2ad4B527EB455825B6C67E9#code) |
| RewardPool | `0xC682820c5C4266A2DED2CD2f9ac089A3b118900c` | [Blockscout](https://base.blockscout.com/address/0xC682820c5C4266A2DED2CD2f9ac089A3b118900c) · [Basescan](https://basescan.org/address/0xC682820c5C4266A2DED2CD2f9ac089A3b118900c#code) |
| StakingVault | `0x8DA6efD7251038edBDfc272e37782Ed7a35841b1` | [Blockscout](https://base.blockscout.com/address/0x8DA6efD7251038edBDfc272e37782Ed7a35841b1) · [Basescan](https://basescan.org/address/0x8DA6efD7251038edBDfc272e37782Ed7a35841b1#code) |
| Rating | `0xEa224cDd8597f55546B4Cc2fCd414A6b16F8E9BB` | [Blockscout](https://base.blockscout.com/address/0xEa224cDd8597f55546B4Cc2fCd414A6b16F8E9BB) · [Basescan](https://basescan.org/address/0xEa224cDd8597f55546B4Cc2fCd414A6b16F8E9BB#code) |
| MatchManager | `0xDBb200d80E9Cd6fE886b457C1aE2EA08c49c16D4` | [Blockscout](https://base.blockscout.com/address/0xDBb200d80E9Cd6fE886b457C1aE2EA08c49c16D4) · [Basescan](https://basescan.org/address/0xDBb200d80E9Cd6fE886b457C1aE2EA08c49c16D4#code) |
| Tournament | `0x1Ec83eB5522E2F88f77Ac36D9715706449DEfaB2` | [Blockscout](https://base.blockscout.com/address/0x1Ec83eB5522E2F88f77Ac36D9715706449DEfaB2) · [Basescan](https://basescan.org/address/0x1Ec83eB5522E2F88f77Ac36D9715706449DEfaB2#code) |
| AmmFactory | `0x5e3bf147829aAaE1b1EE585bF8e9065bE8208641` | [Blockscout](https://base.blockscout.com/address/0x5e3bf147829aAaE1b1EE585bF8e9065bE8208641) · [Basescan](https://basescan.org/address/0x5e3bf147829aAaE1b1EE585bF8e9065bE8208641#code) |

External: Uniswap v3 pool TRCH/WETH, fee 1 %, `0xd31a17bEfC5D469b319E3363508D39528322D6fB` (opened 2026-10-20 by the deployer with 0.04 ETH + 21.73 M TRCH
at the curve's spot price, full range; for price trackers only, the LaunchPool stays the primary market).

Seventeen contracts in eighteen transactions from block 52815684, founder buy 285714285714285714 wei (2/7 ETH) executed
in the LaunchPool constructor, `realReserve` 2/7 ETH, 100 M TRCH in the RewardPool, ~200 M TRCH on the deployer, all
wiring read back from the chain (DEPLOY.md 6.3). Code of commit 56c46d5 (the 2026-10-16 review fixes plus the MIT
license). Blockscout verification runs in `verify8453` on the server (Cloudflare in front of base.blockscout.com needs a
browser user agent, so `forge --verify` fails there; the standard-JSON loop works); 17/17 verified. Basescan: 17/17
verified with exact matches on 2026-10-20 through `ops/verify-basescan.sh` (the Etherscan free tier rejects the forge
verifier for Base, the plain API calls pass). Every contract is also an exact match on Sourcify.

### Base Sepolia (84532), block 48148395 (deployment of 2026-10-15, evening: contracts after the security review)

| Contract | Address | Explorer |
| --- | --- | --- |
| PortraitBase | `0xC519b61275b66E075810A9caE83474fe6566a5bb` | [Blockscout](https://base-sepolia.blockscout.com/address/0xC519b61275b66E075810A9caE83474fe6566a5bb) |
| PortraitBody | `0x40b0Da106A380dBc2afcB3B54cCDd2Ca9d7B4D4f` | [Blockscout](https://base-sepolia.blockscout.com/address/0x40b0Da106A380dBc2afcB3B54cCDd2Ca9d7B4D4f) |
| PortraitFace | `0xAF9f2dDa5Ff6dd55353a0268390940599dAe0723` | [Blockscout](https://base-sepolia.blockscout.com/address/0xAF9f2dDa5Ff6dd55353a0268390940599dAe0723) |
| PortraitItems | `0x2eA751575F3e47115fcAfD717062574cEF9d3c10` | [Blockscout](https://base-sepolia.blockscout.com/address/0x2eA751575F3e47115fcAfD717062574cEF9d3c10) |
| PortraitArms | `0xc7d1F74f533759ccCa8e30239057DbD5Abe3aE6C` | [Blockscout](https://base-sepolia.blockscout.com/address/0xc7d1F74f533759ccCa8e30239057DbD5Abe3aE6C) |
| CharacterPortrait | `0x0341a0d80e62c10D6029f79A6256871b0A69F507` | [Blockscout](https://base-sepolia.blockscout.com/address/0x0341a0d80e62c10D6029f79A6256871b0A69F507) |
| TLToken | `0x021E0870f9BB68bB60D4B374063bb7CA1b880e9b` | [Blockscout](https://base-sepolia.blockscout.com/address/0x021E0870f9BB68bB60D4B374063bb7CA1b880e9b) |
| LaunchPool | `0x3b92362131e963eab6233111Aaed33b979fB52cB` | [Blockscout](https://base-sepolia.blockscout.com/address/0x3b92362131e963eab6233111Aaed33b979fB52cB) |
| CharacterFactory | `0xa46e5A3deD518936d52405a85BEBb49Ca6c4e02E` | [Blockscout](https://base-sepolia.blockscout.com/address/0xa46e5A3deD518936d52405a85BEBb49Ca6c4e02E) |
| ControllerNFT | `0x5ECfc9d0466b8FE569CFD9C006A6D0AAe3f25606` | [Blockscout](https://base-sepolia.blockscout.com/address/0x5ECfc9d0466b8FE569CFD9C006A6D0AAe3f25606) |
| CreatorVesting | `0x27393C0D207EdCE54A5C1042006A250C1393a132` | [Blockscout](https://base-sepolia.blockscout.com/address/0x27393C0D207EdCE54A5C1042006A250C1393a132) |
| RewardPool | `0x440a46F80bF41c488A6987268823A663C515690a` | [Blockscout](https://base-sepolia.blockscout.com/address/0x440a46F80bF41c488A6987268823A663C515690a) |
| StakingVault | `0x097b79bEaa02431A794A7912c32C7066CdA42Fb3` | [Blockscout](https://base-sepolia.blockscout.com/address/0x097b79bEaa02431A794A7912c32C7066CdA42Fb3) |
| Rating | `0x5F1dCbf009858bd3a6cDEE45CE83709E88E616bF` | [Blockscout](https://base-sepolia.blockscout.com/address/0x5F1dCbf009858bd3a6cDEE45CE83709E88E616bF) |
| MatchManager | `0x2362CFb3891293BAF333802221c09BFd95890FD3` | [Blockscout](https://base-sepolia.blockscout.com/address/0x2362CFb3891293BAF333802221c09BFd95890FD3) |
| Tournament | `0xBaf31735405c772ecb5c95555fe6c2A5a71BBF81` | [Blockscout](https://base-sepolia.blockscout.com/address/0xBaf31735405c772ecb5c95555fe6c2A5a71BBF81) |
| AmmFactory | `0x3B0b1dAdA4bEc209b6dc545C1cc9bf3b5e72c564` | [Blockscout](https://base-sepolia.blockscout.com/address/0x3B0b1dAdA4bEc209b6dc545C1cc9bf3b5e72c564) |

Seventeen contracts in eighteen transactions (blocks 48148395–48148412), founder buy 0.0003 ETH on testnet. This is
the code of commit 359840e (pre-mainnet security review fixes) and the deployment the indexer follows (schema
`tl_84532_v6`); characters 1–8 were recreated on it by the flow script. Verification runs in `verify5` on the server.

### Superseded: block 48142935 (deployment of 2026-10-15, morning: CharacterArt v2 portraits, before the review)

| Contract | Address | Explorer |
| --- | --- | --- |
| PortraitBase | `0xCbF5737569f67347a5701fD7036Ed3BaD53c3A51` | [Blockscout](https://base-sepolia.blockscout.com/address/0xCbF5737569f67347a5701fD7036Ed3BaD53c3A51) |
| PortraitBody | `0x2298EA6BBE3955843F27D4B1820C653Bc90B3af3` | [Blockscout](https://base-sepolia.blockscout.com/address/0x2298EA6BBE3955843F27D4B1820C653Bc90B3af3) |
| PortraitFace | `0x9aACAbeCE1cAD2937f17284B51B1CBBBcEAE734a` | [Blockscout](https://base-sepolia.blockscout.com/address/0x9aACAbeCE1cAD2937f17284B51B1CBBBcEAE734a) |
| PortraitItems | `0x2E25E8Cb53cf6c03aB6652d0Cd511f75131E5618` | [Blockscout](https://base-sepolia.blockscout.com/address/0x2E25E8Cb53cf6c03aB6652d0Cd511f75131E5618) |
| PortraitArms | `0x2Bf5b4d603860f95230f7d0F78c11D2f1C778027` | [Blockscout](https://base-sepolia.blockscout.com/address/0x2Bf5b4d603860f95230f7d0F78c11D2f1C778027) |
| CharacterPortrait | `0x1108eEF63c09bde37697E74c63Fc4D16C28Bc7b1` | [Blockscout](https://base-sepolia.blockscout.com/address/0x1108eEF63c09bde37697E74c63Fc4D16C28Bc7b1) |
| TLToken | `0x3b7BdaCBF51b6D7B0d3D577030889F170EEd2f42` | [Blockscout](https://base-sepolia.blockscout.com/address/0x3b7BdaCBF51b6D7B0d3D577030889F170EEd2f42) |
| LaunchPool | `0x3e11C554B625BA9eeF70382F97194DeC2A43BFF7` | [Blockscout](https://base-sepolia.blockscout.com/address/0x3e11C554B625BA9eeF70382F97194DeC2A43BFF7) |
| CharacterFactory | `0xF53135Bf5D35686C22C068bAC9A1134D538E9d9C` | [Blockscout](https://base-sepolia.blockscout.com/address/0xF53135Bf5D35686C22C068bAC9A1134D538E9d9C) |
| ControllerNFT | `0xeB09370ce47D3A5Cb6a153C74cb295ABDcbF4429` | [Blockscout](https://base-sepolia.blockscout.com/address/0xeB09370ce47D3A5Cb6a153C74cb295ABDcbF4429) |
| CreatorVesting | `0x9F3FC9eAA608bc1dF44553592f49B76b0314c8CC` | [Blockscout](https://base-sepolia.blockscout.com/address/0x9F3FC9eAA608bc1dF44553592f49B76b0314c8CC) |
| RewardPool | `0x03e17251025888bd3145212740eFA71ea33CAa11` | [Blockscout](https://base-sepolia.blockscout.com/address/0x03e17251025888bd3145212740eFA71ea33CAa11) |
| StakingVault | `0x0CFfe505C1db49348aD4a397A50e224CF41b4E42` | [Blockscout](https://base-sepolia.blockscout.com/address/0x0CFfe505C1db49348aD4a397A50e224CF41b4E42) |
| Rating | `0xeEAA27037d19376A0BDcb83f5DB7Ecf98b06F638` | [Blockscout](https://base-sepolia.blockscout.com/address/0xeEAA27037d19376A0BDcb83f5DB7Ecf98b06F638) |
| MatchManager | `0xE936A7184f757eadc45A3B0702630E64fba65e4B` | [Blockscout](https://base-sepolia.blockscout.com/address/0xE936A7184f757eadc45A3B0702630E64fba65e4B) |
| Tournament | `0xa83e6fbe9573c5E53d5F84Da3F752aBc69e55d73` | [Blockscout](https://base-sepolia.blockscout.com/address/0xa83e6fbe9573c5E53d5F84Da3F752aBc69e55d73) |
| AmmFactory | `0xa24150e4990F7838378fc30a69b8713626F3c119` | [Blockscout](https://base-sepolia.blockscout.com/address/0xa24150e4990F7838378fc30a69b8713626F3c119) |

Seventeen contracts in eighteen transactions (blocks 48142935–48142952, 44.8 M gas, ≈ 0.0004 ETH plus the founder buy of
0.0005 ETH), `realReserve` = 0.0005 ETH, RewardPool 100 M TRCH. The indexer on the server follows this deployment from block
48142935 (schema `tl_84532_v5`); Blockscout verification runs through the standard-input loop (`verify4` on the server).
The exercise of section 7 (characters 1–8, match 1, tournament 1) ran on the previous deployment below; its last step, the
tournament final, is finished against the saved address file with `DEPLOYMENTS_FILE=docs/private/testnet-84532-old.json`.

### Superseded: block 48061726 (deployment of 2026-10-13: V = 1 ETH, frozen constants, AmmFactory; geometric NFT image)

| Contract | Address | Explorer |
| --- | --- | --- |
| TLToken | `0xFBB0269CA5E6DbCAeF682e897B19B78a4F73EAF5` | [Blockscout](https://base-sepolia.blockscout.com/address/0xFBB0269CA5E6DbCAeF682e897B19B78a4F73EAF5) |
| LaunchPool | `0x63f197115438D82efA561437fB99280E75288a61` | [Blockscout](https://base-sepolia.blockscout.com/address/0x63f197115438D82efA561437fB99280E75288a61) |
| CharacterFactory | `0x61247e6ab83d1f15645eC1aeB92FefdB1064fb71` | [Blockscout](https://base-sepolia.blockscout.com/address/0x61247e6ab83d1f15645eC1aeB92FefdB1064fb71) |
| ControllerNFT | `0xe88b590F1c5F83a22110C846c31c7CD498F7CDe8` | [Blockscout](https://base-sepolia.blockscout.com/address/0xe88b590F1c5F83a22110C846c31c7CD498F7CDe8) |
| CreatorVesting | `0x8Ed0C6991459169e0A264eeda9c7E54613f2F528` | [Blockscout](https://base-sepolia.blockscout.com/address/0x8Ed0C6991459169e0A264eeda9c7E54613f2F528) |
| RewardPool | `0xBE8c74Ca7d70C6a3f76dAb524A5EC963045cb565` | [Blockscout](https://base-sepolia.blockscout.com/address/0xBE8c74Ca7d70C6a3f76dAb524A5EC963045cb565) |
| StakingVault | `0xE43Cd70092627Ede4623018162cdE70355dB1d81` | [Blockscout](https://base-sepolia.blockscout.com/address/0xE43Cd70092627Ede4623018162cdE70355dB1d81) |
| Rating | `0xa7DD52D8040998BF1DDE14f7aDC5Df1D32285674` | [Blockscout](https://base-sepolia.blockscout.com/address/0xa7DD52D8040998BF1DDE14f7aDC5Df1D32285674) |
| MatchManager | `0xb9A0F82a244b6a051fa12DE1b163Fc50E1D75a6f` | [Blockscout](https://base-sepolia.blockscout.com/address/0xb9A0F82a244b6a051fa12DE1b163Fc50E1D75a6f) |
| Tournament | `0xe042F9D59cda6E4B03a778B6a3f6dA7f66786bC2` | [Blockscout](https://base-sepolia.blockscout.com/address/0xe042F9D59cda6E4B03a778B6a3f6dA7f66786bC2) |
| AmmFactory | `0xBcB36A653b1b86e282CD5E294A6e78CCB4657f99` | [Blockscout](https://base-sepolia.blockscout.com/address/0xBcB36A653b1b86e282CD5E294A6e78CCB4657f99) |

Eleven contracts in twelve transactions (blocks 48061726–48061737), founder buy 0.005 ETH on testnet (the deployer held
0.0098 ETH), `realReserve` = 0.005 ETH, RewardPool 100 M TRCH. Source verification runs through the Blockscout v2
standard-input loop (`verify3` on the server, one contract per ~30 min window).

The source of truth is `contracts/deployments/84532.json`; the broadcast record with transaction hashes is
`contracts/broadcast/Deploy.s.sol/84532/run-latest.json`. Source verification on Blockscout runs after the deploy
(the public API rate-limits to roughly one submission per 30 minutes; see the procedure above).

Superseded: the deployment of 2026-10-09 (block 47891722, TLToken `0xD11cB55244ec0bF6b603Fd8338324e7314E33D1A`, LaunchPool
`0x2a2625e82b2271F74a782dBa2D5988f326ba6F61`, CharacterFactory `0x0957561dA2FCcd45e1D38eF1559997e54830Ad48`; V = 5 ETH, no AmmFactory)
and the first testnet deployment of 2026-10-05 (blocks 47715924–47715934, token symbol TL, LaunchPool
`0x8e169a2a08d380c9C33D76a7b630c4E273A4C1F2`, TLToken `0x50dEaa4667704CdBDEBD220D5E0560c5bf94c29C`) stays on chain but
is no longer indexed or linked from the site.
The local anvil (31337) is deployed on every start of `anvil` + the script; the addresses are deterministic for the
default key (TLToken `0x5FbD…0aa3`, LaunchPool `0xe7f1…0512`, CharacterFactory `0x9fE4…a6e0`, AmmFactory
`0xB7f8…4F5e`: nonce 11, because `bind()` is the deployer's transaction 10).
