# TRENCHAMPIONSHIP

A deterministic card-battle league of tokenised characters on Base: every character is an ERC-20 with a
permanent liquidity bonding curve and a 1/1 controller NFT; matches are commit-reveal with no randomness;
staking is no-loss; there is no admin, no upgrade and no oracle.

- `docs/BALANCE-REPORT.md` — balance simulation and frozen constants
- `docs/THREAT-MODEL.md`, `docs/DEPLOY.md`
- the specification, decisions and legal constraints (`docs/private/`) are not part of the public repo
- `CHANGELOG.md` — what has been done, by work package

## Structure

| Directory | What | Status |
| --- | --- | --- |
| `contracts/` | Foundry: 23 contracts (6 of them the stateless portrait renderer), 142 tests, 4 invariant suites, deploy script | green, Slither 0 high/medium |
| `engine/` | TypeScript port of BattleEngine, 220 shared vectors | green |
| `sim/` | Python simulation (Nash solvers, economy, report) | green |
| `indexer/` | Ponder indexer (GraphQL + SQL) | runs on anvil |
| `web/` | Next.js static export (Coinbase Smart Wallet) | builds, 8 routes |
| `launch-ui/` | a single HTML file for the LaunchPool | done |

## Running locally (everything on one machine)

Prerequisites: Foundry, Node **22**, pnpm 12, uv.

```bash
pnpm install && pnpm --filter @traitleague/engine build
```

```bash
# 1) local chain and deploy (second terminal: anvil --block-time 2)
cd contracts
DEPLOYER_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
TREASURY=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 GUARDIAN=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

```bash
# 2) indexer
cd indexer && cp .env.example .env.local && pnpm dev          # http://localhost:42069/graphql
```

```bash
# 3) web
cd web && pnpm build && npx serve out                         # or pnpm dev
```

Import the anvil key into a wallet (chain 31337, RPC http://127.0.0.1:8545), open `launch-ui/index.html`
to buy TRCH, then create a character in the app.

## Checks

```bash
cd contracts && forge test && forge coverage --no-match-coverage "(script|test)" --report summary
cd sim && uv run --python 3.12 pytest -q
cd engine && pnpm test
```

Battle vectors are regenerated from the Python reference: `cd sim && uv run --python 3.12 python -m traitleague_sim.vectors --out ../engine/vectors/battle-vectors.json`; ABIs for the indexer and web: `pnpm abis`.
