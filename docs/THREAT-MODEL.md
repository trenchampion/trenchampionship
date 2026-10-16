# Threat model (WP7)

What can go wrong, who can cause it, what prevents it and how that was tested. Complements
`docs/private/LEGAL-CONSTRAINTS.md` (legal constraints; not in the public repo) and `BALANCE-REPORT.md` (game balance).

## Trust assumptions

| Component | Trust | Note |
| --- | --- | --- |
| Base (sequencer, L1) | full | outside our control; the L2's escape hatch |
| OpenZeppelin 5.x (ERC-20/721, ReentrancyGuard, SafeERC20, Math) | full | audited, unmodified |
| Our contracts | none | everything is checked by tests and invariants |
| Guardian (Safe) | limited | can only pause `create`, `challenge`, `accept`, `stake` until the 365 days expire |
| Indexer / frontend | none | reveal and claim must work by reading logs over RPC |
| Players, creators, stakers | none | every interaction is assumed hostile |

There is no admin, upgrade, oracle, randomness or delegatecall in our code. Privileges: `pause()`
(Guardian, with a deadline), `catalogManager` does not exist in v1, `TREASURY` only receives.

## Assets and who holds them

| Asset | Where | Who can withdraw it | Invariant |
| --- | --- | --- | --- |
| Players' ETH | LaunchPool | only by selling TRCH along the bonding curve | `balance == realReserve`; k never decreases; selling is bounded by the real reserve |
| TRCH in match escrow | MatchManager | winner / refund through `claim()` | `balanceOf(mm) == Σ escrow of open matches + Σ claimable` (invariant suite; it uncovered a 1-wei gap in the rake split) |
| Stakes | StakingVault | only the staker, always in full | `token.balanceOf(vault) ≥ Σ unpaid stakes` (invariant suite) |
| Staker rewards | StakingVault | pro rata to the winning side, dust back to the pool | `TRCH.balanceOf(vault) ≥ Σ unpaid rewards` |
| RewardPool | RewardPool | only by formula (2 % / 20 % of `available`) | `balance ≥ lockedSeed(t)` (invariant); callers immutable |
| Licenses | Rating | only the controller, always in full | `TRCH.balanceOf(Rating) ≥ Σ licenses + Σ claimable` |
| Tournament entry fees | Tournament | prizes / refund through `claim()` | `Σ claimable == balance` after completion (test) |
| TRCH on character curves | CharacterPool | by selling the character token | `TRCH.balanceOf(pool) == realReserve + creatorFeeOwed` (invariant) |
| Creator allocation | CreatorVesting | linearly, only to the beneficiary | `released ≤ vested(t)` |
| AMM reserves (TRCH + character token) | AmmPair | by swapping, or pro rata by burning LP shares | `balances ≥ reserves`; `k` never decreases through a swap; `Σ LP balances == totalSupply ≥ 1000`; TRCH and token conservation (invariant suite) |

## Attacks and defences

### Economic

| Attack | Defence | Status |
| --- | --- | --- |
| Farming the RewardPool with matches between one's own characters | the same controller cannot run both characters; 5 % rake (3 % pool, 2 % burn) ≥ 3 % staker reward → net −2 %; cap of 2 % of the pool per match; a controller cannot stake on their own character | tested; remains possible with Sybil addresses but unprofitable |
| Farming the season prize with puppets | 3 rated matches per pair per season; ≥ 10 matches against ≥ 6 distinct characters; license of 10,000 TRCH per character; mint fee sink; burn per match | tested; economics in BALANCE-REPORT §2 |
| Draining the RewardPool | all payouts are percentages of `available`; the seed is locked linearly | invariant |
| Creator rug | no LP; the allocation ≤ 20 % always vests; selling the allocation is bounded by the real reserve | tested |
| Manipulating the LaunchPool price as an "oracle" | no contract reads the LaunchPool spot price | design |
| Guardian pause and open tournaments | Tournament is never pausable: brackets already registered keep creating and running their matches while MatchManager is paused (create/challenge/accept only). Players can let a bracket void; the pause cannot stop it | verified 2026-10-16 |
| Season license on a transferred NFT | the 10,000 TRCH deposit travels with the controller NFT: a buyer receives it, a seller must unlicense first | verified 2026-10-16 |
| Forced ETH into LaunchPool | accounting is storage-based (realReserve), so ETH forced in by selfdestruct changes neither price, cap nor payouts; it is simply unreachable | tested 2026-10-16 |
| Front-loading the launch | net-inflow cap (buys minus sells, 1 ETH per elapsed day) for 30 days, max 0.5 ETH per buy; the founder buy is atomic in the constructor | tested |
| Selling seed TRCH that has no ETH backing | `sell()` reverts above the real reserve | tested; risk documented publicly |
| AMM first-deposit share inflation (donate, then round later depositors to 0 shares) | the first 1000 wei of LP shares are minted to a dead address forever; reserves are tracked in storage, never read from balances, so a donation cannot move the share price | tested (unit + invariant) |
| Pairing a fake or foreign token with TRCH | `createPair` accepts only a token the CharacterFactory registered for the id the token claims; TRCH, LP tokens and EOAs are rejected | tested |
| Sandwiching AMM swaps | every swap and deposit takes a minimum-output / minimum-amount guard; the UI applies 1 % | design |
| Protocol fee leaving the pool as character tokens | the protocol fee is always taken in TRCH (from the TRCH leg of the swap) and sent in the same call to RewardPool / treasury; the pair never holds fees | tested |

### Match protocol

| Attack | Defence | Status |
| --- | --- | --- |
| Refusing to reveal after seeing the opponent's reveal | the commit is binding; no reveal = forfeit (a loss for rating, the stake goes to the opponent) | tested |
| Copying someone else's commit | the hash includes the matchId and the address | design |
| Changing the controller mid-match | the NFT is locked while the character is busy (match or tournament) | tested |
| Halting a match with a pause | the pause blocks only challenge/accept/stake; commit, reveal, poke and claim keep working | tested |
| Griefing with open challenges | the challenger can `cancel`; 48 h expiry with a refund through `poke` | tested |
| Stuck tournament | all transitions are permissionless (`poke`, `advance`, `cancel`); void and double draw are resolved deterministically | tested |
| Reentrancy | `nonReentrant` on every function that changes state and calls out; CEI; TRCH is an OZ ERC-20 without hooks | Slither: 0 high/medium |
| Overflow / rounding | Solidity 0.8 checked math; the bonding curve rounds in favour of the pool (fuzz 10k); the rake split absorbs the rounding remainder (invariant) | tested |

### Operational

| Risk | Defence |
| --- | --- |
| A player loses their device mid-match | the salt is derived from an EIP-712 signature; the tactic is encrypted in the `Commit` event; reveal from any device |
| Indexer outage | the frontend reads logs over RPC for reveal/claim |
| Wrong deploy (addresses) | `Deploy.s.sol` asserts every precomputed address, the factory binding, the NFT wiring and the portrait renderer against the shared art vector; test `DeployScriptTest`; `RewardPool` and `LaunchPool` refuse to deploy without their token balances; `bind()` is deployer-only so nobody can hijack the factory between the deploy transactions |
| Nonce drift during the broadcast | a wrong predicted address can only make a contract permanently closed, never open; the deployer account is fresh and untouched until the last transaction, and the post-deploy `cast` checks in DEPLOY.md section 6 read the wiring back from the chain before anything is announced |
| Bug after launch | pause (limited), inflow cap, max stake; v2 is a new deploy without migration |
| Wrong or ugly NFT image | the portrait renderer (`CharacterPortrait` + five parts) is pure and stateless, holds no funds and is called only from `tokenURI` with a static call; a byte-identical TypeScript reference and 113 shared vectors check every branch; the image never influences a match or a payout |

## Known limitations (consciously accepted)

- Sybil: the same person with several addresses can run both characters in a match; the defence is economic (net negative), not identity-based. The same address can never control both sides (checked at challenge and again at accept), and a pair of characters holds at most one staked match at a time.
- Rare portrait features (gold eyes, aura) follow the keccak of the sequential id, so anyone can predict which upcoming id gets one and mint at that moment; inherent to the no-randomness rule and harmless (nothing else about the portrait can be influenced).
- A creator's name, symbol and metadata are bounded in length but not validated as UTF-8; a creator who stores invalid bytes only breaks the metadata of their own character on strict decoders.
- Tournament staker rewards are paid per decided match while the 3 % rake reaches the RewardPool only when the bracket finishes; the pool is at most 3 % of the pot behind for the duration of a bracket, which always finishes (`advance` and `poke` are permissionless).
- The seed TRCH (10 %) has no ETH backing in the LaunchPool; the maximum exposure is the seed.
- Tournament: a second drawn match is resolved by rating, then by the lower id (the SPEC's sum of R would require storing the results).
- `RAKE_TO_TREASURY_BPS = 0` leaves one dead branch (`toTreasury > 0`) in MatchManager and Tournament; intentional, a switch for later.
- Tokens sent directly to an AmmPair (not through `addLiquidity`) are unreachable by design: there is no `sync`/`skim`, so reserves never depend on balances.
- No formal verification and no external audit; the substitute is 142 tests, 4 invariant suites, fuzz 10k, Slither 0 high/medium and a public testnet.

## How to verify

```
cd contracts
forge test                              # unit, fuzz (10k) and invariant (1000 x 100) tests
forge coverage --no-match-coverage "(script|test)" --report summary
slither . --filter-paths lib/ --exclude-dependencies
```
