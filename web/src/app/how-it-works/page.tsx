import type { Metadata } from "next";
import Link from "next/link";
import { BattleFlow } from "@/components/BattleFlow";
import { Callout } from "@/components/Callout";
import { PentagonArt } from "@/components/PentagonArt";
import { Toc } from "@/components/Toc";
import { CONFIG, GITHUB_URL } from "@/lib/config";
import { ELEMENTS, SPECIALS, SPECIAL_HELP, STANCES, pct, tl } from "@/lib/format";

export const metadata: Metadata = {
  title: "How it works",
  description: "Characters as tokens, the TRCH LaunchPool, character markets, matches, no-loss staking, rating and seasons, tournaments, the economy, security and governance.",
};

const TOC = [
  { id: "characters", label: "Characters as tokens" },
  { id: "trch", label: "TRCH and the LaunchPool" },
  { id: "markets", label: "Character markets" },
  { id: "matches", label: "Matches" },
  { id: "staking", label: "Staking" },
  { id: "rating", label: "Rating and seasons" },
  { id: "tournaments", label: "Tournaments" },
  { id: "economy", label: "Economy" },
  { id: "security", label: "Security and governance" },
  { id: "faq", label: "FAQ" },
  { id: "glossary", label: "Glossary" },
];

const SPLIT = CONFIG.seasonSplitBps;

export default function HowItWorks() {
  return (
    <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <Toc items={TOC} />
      </aside>

      <div className="min-w-0">
        <header className="mb-12">
          <div className="eyebrow mb-3">How it works</div>
          <h1 className="h1">Everything the contracts do, in plain words</h1>
          <p className="lead mt-4">
            This page describes the protocol as it is deployed. Every number comes from <code>Config.sol</code>, the immutable constants file; nothing here can be changed by anyone after deployment.
          </p>
          <nav className="mt-6 flex flex-wrap gap-2 lg:hidden" aria-label="Sections">
            {TOC.map((t) => (
              <a key={t.id} href={`#${t.id}`} className="badge hover:border-[var(--accent-line)] hover:text-[var(--accent)]">
                {t.label}
              </a>
            ))}
          </nav>
        </header>

        <div className="flex flex-col gap-16">
          {/* ---------------------------------------------------------- characters */}
          <Section id="characters" n="01" title="Characters as tokens">
            <p>
              A character is three things created in one transaction: an <strong>ERC-20 token</strong> (name, symbol and supply chosen by the creator), a <strong>permanent market</strong> for that token quoted in TRCH, and a <strong>1/1 controller NFT</strong>. Whoever holds the controller NFT leads the character into matches, receives its match prizes, season rewards and creator fees, and may retire it.
            </p>
            <h3>Traits</h3>
            <p>
              Four traits (Strength, Defense, Speed, Focus), each between {CONFIG.traitMin} and {CONFIG.traitMax}, must add up to exactly <strong>{CONFIG.traitBudget}</strong> points. Every character also picks one of five elements, one of eight special abilities and a weakness element. Traits are public and immutable. The creator may add a short story to the metadata (stored on chain, shown on the character's page); it never affects a battle.
            </p>
            <div className="my-6 grid gap-6 md:grid-cols-[1fr_260px] md:items-center">
              <div>
                <p>
                  The elements form a pentagon: {ELEMENTS.join(" → ")} → {ELEMENTS[0]}. Each element beats the next two (+{CONFIG.elementBonus} to its round score) and loses to the previous two (−{CONFIG.elementBonus}). Facing your weakness element costs a further −{CONFIG.weaknessPenalty}.
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Special</th>
                      <th>Effect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SPECIALS.slice(1).map((s, i) => (
                      <tr key={s}>
                        <td className="strong">{s}</td>
                        <td>{SPECIAL_HELP[i + 1]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PentagonArt maxWidth={260} />
            </div>
            <h3>Tokenomics chosen by the creator, bounded by the protocol</h3>
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Range</th>
                  <th>What it determines</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Supply</td>
                  <td className="num">{tl(CONFIG.charSupplyMin).replace(" TRCH", "")} – {tl(CONFIG.charSupplyMax).replace(" TRCH", "")} tokens</td>
                  <td>Only the price per token; the curve and market cap are the same.</td>
                </tr>
                <tr>
                  <td>Virtual TRCH reserve</td>
                  <td className="num">
                    {tl(CONFIG.charVirtualTlMin)} – {tl(CONFIG.charVirtualTlMax)}
                  </td>
                  <td>The character's starting market cap in TRCH and the steepness of its curve.</td>
                </tr>
                <tr>
                  <td>Creator allocation</td>
                  <td className="num">0 – {pct(CONFIG.creatorAllocMaxBps, 0)}</td>
                  <td>
                    Always vests linearly over {CONFIG.creatorVestingMinDays}–{CONFIG.creatorVestingMaxDays} days through the shared <code>CreatorVesting</code> contract. An unlocked free allocation is impossible.
                  </td>
                </tr>
                <tr>
                  <td>Creator fee</td>
                  <td className="num">0 – {pct(CONFIG.creatorFeeMaxBps, 0)}</td>
                  <td>Extra fee on every trade of the character token, paid to the current controller.</td>
                </tr>
                <tr>
                  <td>First buy</td>
                  <td>any amount of TRCH</td>
                  <td>The creator buys on the same curve as everyone else, just first, in the creation transaction.</td>
                </tr>
              </tbody>
            </table>
            <p>
              Creation costs the mint fee of <strong>{tl(CONFIG.mintFee)}</strong>: {pct(CONFIG.mintBurnBps, 0)} is burned, {pct(CONFIG.mintRewardPoolBps, 0)} goes to the RewardPool and {pct(CONFIG.mintTreasuryBps, 0)} to the treasury. The whole supply minus the vesting allocation goes onto the curve.
            </p>
            <Callout tone="info" title="Permanent liquidity">
              There are no LP tokens, no liquidity withdrawal and no migration. The pool cannot be paused and has no owner. Tokens that did not come through the curve (the vested creator allocation) can be sold only while the pool's real TRCH reserve covers them. That reserve is the TRCH that buyers have put into the curve, so a creator with the maximum 20 % allocation can at most take back part of what buyers paid, never more than the pool holds.
            </Callout>
            <p className="mt-4">
              The controller NFT is transferable, but not while the character is in an active match or tournament. <code>retire()</code> burns it: the character can never fight again, while its token and market live on; any creator fee accrued afterwards goes to the RewardPool.
            </p>
          </Section>

          {/* ---------------------------------------------------------- TRCH */}
          <Section id="trch" n="02" title="The TRCH token and the LaunchPool">
            <p>
              TRCH is the in-game utility token. Every character market is quoted in TRCH, and TRCH is the only means of payment in the league: character creation, match stakes, tournament entries and season licenses. The total supply of <strong>{tl(CONFIG.tlSupply)}</strong> is minted once, in the token's constructor, and can only shrink through burns.
            </p>
            <ul>
              <li>
                <strong>{tl(CONFIG.tlToLaunchPool)}</strong> ({pct(9000, 0)}) sit on the LaunchPool curve. Nobody receives TRCH except by buying on the curve or by playing.
              </li>
              <li>
                <strong>{tl(CONFIG.tlToRewardPoolSeed)}</strong> ({pct(1000, 0)}) seed the RewardPool, released linearly over {CONFIG.seedReleaseDays} days so that the first seasons are not a jackpot (see <a href="#economy">Economy</a>).
              </li>
            </ul>
            <h3>The curve</h3>
            <p>
              The LaunchPool is a constant-product market between ETH and TRCH with a <strong>virtual ETH reserve of 1 ETH</strong>: <code>k = (1 ETH + real ETH) × TRCH on the curve</code>. The virtual reserve is a number the curve pretends to hold so that the price does not start at zero; nobody deposits it and nobody can withdraw it. Sellers always receive real ETH only.
            </p>
            <ul>
              <li>No fee on buys or sells. No owner, no pause, no migration.</li>
              <li>
                <strong>Launch cap:</strong> for the first {CONFIG.lpCapPeriodDays} days after deployment the cumulative net inflow may not exceed 1 ETH per elapsed day (unused allowance carries over), and a single buy is limited to 0.5 ETH. After day {CONFIG.lpCapPeriodDays} the cap disappears.
              </li>
              <li>Sells are never capped. A sell reverts only if the ETH owed would exceed the real reserve, which can happen when TRCH that never passed through the curve (the RewardPool seed) is sold back.</li>
              <li>The founder's purchase is executed inside the LaunchPool constructor, on the same curve, emitted as a <code>FounderBuy</code> event and not counted against the cap. There is no pre-mint, no team allocation and no presale.</li>
            </ul>
            <p>
              Buying and selling TRCH happens in a separate, open-source LaunchPool interface that anyone can host; this site links to it and never embeds price charts.
            </p>
          </Section>

          {/* ---------------------------------------------------------- markets */}
          <Section id="markets" n="03" title="Character markets">
            <p>
              Each character has its own constant-product curve between TRCH and the character token, with the creator-chosen virtual TRCH reserve as the quote-side offset. The mechanics mirror the LaunchPool with two differences:
            </p>
            <ul>
              <li>
                A <strong>protocol fee of {pct(CONFIG.poolFeeBps, 0)}</strong> in TRCH on every buy and sell, split {pct(10_000 - CONFIG.treasuryTradeBps, 0)} to the RewardPool and {pct(CONFIG.treasuryTradeBps, 0)} to the treasury.
              </li>
              <li>
                An optional <strong>creator fee of 0–{pct(CONFIG.creatorFeeMaxBps, 0)}</strong>, fixed at creation, that accrues in the pool and is paid to the character's current controller when anyone calls <code>claimCreatorFees()</code>.
              </li>
            </ul>
            <p>
              Both quotes (<code>quoteBuy</code>, <code>quoteSell</code>) are net of fees and shown on the character page before you trade; the interface applies a 1 % slippage tolerance. A sale reverts if the pool's real reserve could not cover it. Liquidity is permanent: no LP tokens, no withdrawal, no owner, no pause.
            </p>
            <p>
              Token holders have no claim on match prizes and no yield: the only things a character token does are trade on its curve, trade on its AMM pool and <a href="#staking">stake on matches</a>.
            </p>
            <h3>Secondary market: the AMM pool</h3>
            <p>
              Next to its curve, every character can have one <strong>AMM pool</strong> (TRCH / character token), a constant-product market in the style of Uniswap v2 where anyone can provide liquidity and receive LP shares. The pool is optional and permissionless: anyone may open it from the character page (one per character, no fee), and the first deposit sets its price. The curve remains the primary market and the permanent liquidity guarantee; the pool is where holders can set a different price or earn fees.
            </p>
            <ul>
              <li>
                Every swap pays <strong>{pct(CONFIG.ammLpFeeBps)}</strong> to the liquidity providers (it stays in the pool, so the product of the reserves never decreases) and <strong>{pct(CONFIG.ammProtocolFeeBps)}</strong> to the protocol, always in TRCH, split {pct(10_000 - CONFIG.treasuryAmmBps, 0)} RewardPool / {pct(CONFIG.treasuryAmmBps, 0)} treasury in the same transaction. The protocol never holds character tokens.
              </li>
              <li>
                LP shares are ordinary ERC-20 tokens that redeem a pro-rata part of both reserves at any time. The first {CONFIG.ammMinimumLiquidity.toString()} wei of shares are locked forever, so nobody can inflate the share price against later depositors.
              </li>
              <li>
                Pools are always TRCH / character token; trading one character for another is two swaps through TRCH. The factory accepts only tokens created by the CharacterFactory.
              </li>
              <li>No owner, no pause, no fee switch, no migration: the fees are constants in Config.sol and the pair contracts are immutable.</li>
            </ul>
          </Section>

          {/* ---------------------------------------------------------- matches */}
          <Section id="matches" n="04" title="Matches">
            <div className="card card-pad mb-6">
              <BattleFlow />
            </div>
            <h3>Lifecycle</h3>
            <ol>
              <li>
                <strong>Challenge.</strong> A controller challenges a specific character or opens the challenge to anyone, with a stake per side and a preset. The stake is escrowed in the MatchManager. Stake 0 is a friendly match: no escrow, no staking, no rating, no cooldown. Otherwise the stake is between {tl(CONFIG.stakeMin)} and {tl(CONFIG.stakeMax)}.
              </li>
              <li>
                <strong>Accept</strong> within 48 hours, with the matching stake. The same address may not control both characters. Unaccepted challenges can be cancelled by the challenger or expired by anyone with <code>poke()</code>; the stake is refunded as a claim.
              </li>
              <li>
                <strong>Commit.</strong> From acceptance until the commit deadline, each side submits a hash of its tactics (three stances and three energy values plus a secret salt). The interface derives the salt from a wallet signature and stores the tactics encrypted inside the commit event, so you can reveal from any device.
              </li>
              <li>
                <strong>Reveal</strong> once both sides have committed and the staking window has closed. The second reveal resolves the match on chain.
              </li>
            </ol>
            <h3>Presets</h3>
            <table>
              <thead>
                <tr>
                  <th>Preset</th>
                  <th>Staking window</th>
                  <th>Commit window</th>
                  <th>Reveal window</th>
                </tr>
              </thead>
              <tbody>
                {CONFIG.presets.map((p) => (
                  <tr key={p.id}>
                    <td className="strong">{p.name}</td>
                    <td>{p.window} from acceptance</td>
                    <td>from acceptance until {p.window} after the staking window closes</td>
                    <td>{p.window} after both commits are in and staking has closed</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Blitz and Standard are chosen by the challenger; the Tournament preset is used for bracket matches.</p>
            <h3>The battle engine</h3>
            <p>
              Three rounds. In each round every character has a stance ({STANCES.join(", ")}) and spends energy. The energy budget per match is <code>{CONFIG.energyBase} + Speed / {CONFIG.energySpeedDiv}</code> (Endurance adds 1) and must be split across the rounds exactly. The round score is:
            </p>
            <pre className="card-sub overflow-x-auto p-4 text-sm">
              <code>
                {`score = base(stance) + ${CONFIG.energyMult} × energy + stance bonus + element term + special
base(Attack)  = Strength + Focus / 2
base(Defense) = Defense  + Strength / 2
base(Counter) = Focus    + Defense / 2
stance bonus  = +${CONFIG.stanceBonus} when Attack meets Defense, Defense meets Counter, or Counter meets Attack
element term  = ±${CONFIG.elementBonus} from the pentagon, −${CONFIG.weaknessPenalty} when facing your weakness`}
              </code>
            </pre>
            <p>
              The higher score wins the round; on a tie the faster character wins, and if speeds are equal the round is drawn. More rounds won wins the match; equal rounds is a draw. All arithmetic is integer, in a pure library that the TypeScript port of this site matches bit for bit across more than 200 shared test vectors. <strong>There is no randomness anywhere</strong>: no block hashes, no oracles, no VRF.
            </p>
            <h3>Timeouts, forfeits, voids, draws</h3>
            <ul>
              <li>Commit deadline passes with no commits: the match is <strong>void</strong>, both stakes are refunded, no rating change, no cooldown.</li>
              <li>Commit deadline passes with one commit: the side that committed wins by <strong>forfeit</strong>. A forfeit is a loss for every purpose.</li>
              <li>Reveal deadline passes: same rule, applied to reveals.</li>
              <li>A <strong>draw</strong> refunds both stakes; stakers receive no reward and ratings do not move.</li>
              <li>Every timeout transition is permissionless: anyone can call <code>poke(matchId)</code>.</li>
            </ul>
            <h3>Payout</h3>
            <p>
              The winner's claim is both stakes minus a <strong>{pct(CONFIG.rakeBps, 0)} rake</strong>: {pct(CONFIG.rakeToRewardPoolBps, 0)} to the RewardPool, {pct(CONFIG.rakeToBurnBps, 0)} burned, {pct(CONFIG.rakeToTreasuryBps, 0)} to the treasury. Prizes go only to the winning controller address and are collected with <code>claim()</code> (pull payment); they are never routed into any character pool. The same pair of characters cannot play a staked match again for {CONFIG.pairCooldownHours} hours.
            </p>
          </Section>

          {/* ---------------------------------------------------------- staking */}
          <Section id="staking" n="05" title="Staking">
            <p>
              While a staked match is in its staking window, holders of either character's token can stake those tokens on a side. Controllers of either side cannot stake on their own match. Staking is <strong>no-loss</strong>:
            </p>
            <ul>
              <li>After the match resolves, every staker withdraws exactly what they deposited, whatever the outcome, with <code>withdraw(matchId)</code>. Withdrawals are never pausable.</li>
              <li>
                Stakers on the winning side additionally share a TRCH reward paid <strong>only from the RewardPool</strong>: {pct(CONFIG.stakerRewardBps, 0)} of the match pot (both stakes), capped at {pct(CONFIG.stakerRewardPoolCapBps, 0)} of what the RewardPool has available. The reward is split pro rata to the stake; rounding dust returns to the pool.
              </li>
              <li>Draws and voids pay no reward. If the winning side has no stakers, nothing leaves the RewardPool.</li>
            </ul>
            <p>
              The staker reward share ({pct(CONFIG.stakerRewardBps, 0)}) equals the rake share that enters the RewardPool from that match ({pct(CONFIG.rakeToRewardPoolBps, 0)}), so every match is pass-through for the pool: a match can neither fill nor drain it. This is enforced by a constant in <code>Config.sol</code>.
            </p>
          </Section>

          {/* ---------------------------------------------------------- rating */}
          <Section id="rating" n="06" title="Rating and seasons">
            <h3>Elo</h3>
            <p>
              Every character starts at {CONFIG.ratingStart}. Staked matches and tournament matches are rated; friendlies are not. K is {CONFIG.eloKEarly} for a character's first {CONFIG.eloEarlyMatches} rated matches and {CONFIG.eloKLate} afterwards; the expected score comes from an integer lookup table so that the on-chain and off-chain implementations agree exactly. Forfeits count as losses; draws and voids leave ratings unchanged. Only the first {CONFIG.ratedPerPairPerSeason} matches between the same pair of characters in a season move ratings.
            </p>
            <h3>Seasons</h3>
            <p>
              Seasons last {CONFIG.seasonLengthDays} days, counted from deployment. At each season boundary ratings are squeezed toward {CONFIG.ratingStart}: <code>new = 1000 + 0.8 × (old − 1000)</code>, applied lazily the first time a character is touched in the new season.
            </p>
            <p>
              The contract keeps an <strong>on-chain top-10</strong> per season. It is updated after every rated result for characters that are eligible; anyone can call <code>nominate(id)</code> to re-evaluate a character that qualified without playing since. Eligibility requires all three:
            </p>
            <ul>
              <li>an active season license,</li>
              <li>at least {CONFIG.seasonMinRatedMatches} rated matches in the season while licensed,</li>
              <li>against at least {CONFIG.seasonMinDistinctOpponents} distinct opponents.</li>
            </ul>
            <p>
              When a season has ended, anyone can call <code>closeSeason()</code>. It freezes the top-10, pulls <strong>{pct(CONFIG.seasonPayoutBps, 0)} of the RewardPool's available balance</strong> and books it to the controllers of the listed characters in the split {SPLIT.map((b) => (b / 100).toString().replace(/\.0$/, "")).join(" / ")} %. Rewards are collected with <code>claim()</code>. Shares of characters retired in the meantime stay in the pool.
            </p>
            <h3>The season license</h3>
            <p>
              A season license is a <strong>refundable deposit of {tl(CONFIG.seasonLicense)}</strong> per character, placed by the controller in the Rating contract. It never yields, it never enters any payout, and it can be withdrawn at any time with <code>unlicense()</code>, even while the guardian pause is active. Withdrawing resets the character's season counters, so it loses eligibility for the current season. The deposit travels with the controller NFT: whoever holds the NFT can withdraw it.
            </p>
            <p>
              Together with the mint fee, the pair cooldown, the three-rated-matches-per-pair rule, the distinct-opponents requirement and the burn on every staked match, the license is what makes farming the season reward with puppet characters unprofitable.
            </p>
          </Section>

          {/* ---------------------------------------------------------- tournaments */}
          <Section id="tournaments" n="07" title="Tournaments">
            <p>
              Anyone can organise a <strong>single-elimination bracket of 8 or 16</strong> characters with an entry stake between {tl(CONFIG.stakeMin)} and {tl(CONFIG.stakeMax)} and an organiser fee of 0–{pct(CONFIG.tournamentOrganizerFeeMaxBps, 0)}. Controllers register one character each; the entry is escrowed in the Tournament contract and refundable until the bracket starts.
            </p>
            <ul>
              <li>
                Registration stays open for 72 hours. A bracket that did not fill by then can be cancelled by anyone, refunding every entry. A full bracket can be started by anyone.
              </li>
              <li>
                <strong>Seeding is deterministic by rating</strong> (ties: lower character id), with 1 vs 16, 2 vs 15 and so on, so the top seeds meet last.
              </li>
              <li>Every round is a MatchManager match with the Tournament preset ({CONFIG.presets[2]!.window} windows). Staking and rating apply. <code>advance()</code> is permissionless once all matches of a round are resolved.</li>
              <li>
                A drawn pairing is replayed once. A second draw, or a void, is decided deterministically: higher rating, then lower id.
              </li>
            </ul>
            <p>
              The pot is entry × size. From it the organiser fee and the {pct(CONFIG.tournamentRakeBps, 0)} rake ({pct(CONFIG.rakeToRewardPoolBps, 0)} RewardPool, {pct(CONFIG.rakeToBurnBps, 0)} burn) are taken; the rest is the prize pool, split{" "}
              <strong>
                {pct(CONFIG.tournamentPrizeWinnerBps, 0)} / {pct(CONFIG.tournamentPrizeFinalistBps, 0)} / {pct(CONFIG.tournamentPrizeSemiBps, 1)} / {pct(CONFIG.tournamentPrizeSemiBps, 1)}
              </strong>{" "}
              between the winner, the finalist and the two semi-finalists, as claims to their controllers. Staker rewards across the whole bracket total {pct(CONFIG.tournamentStakerTotalBps, 0)} of the pot, spread evenly over the matches and each capped at {pct(CONFIG.stakerRewardPoolCapBps, 0)} of the pool, so tournaments are pass-through for the RewardPool like matches.
            </p>
          </Section>

          {/* ---------------------------------------------------------- economy */}
          <Section id="economy" n="08" title="Economy">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Destination</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mint fee {tl(CONFIG.mintFee)}</td>
                  <td>
                    {pct(CONFIG.mintBurnBps, 0)} burn · {pct(CONFIG.mintRewardPoolBps, 0)} RewardPool · {pct(CONFIG.mintTreasuryBps, 0)} treasury
                  </td>
                </tr>
                <tr>
                  <td>Match stakes</td>
                  <td>
                    {pct(10_000 - CONFIG.rakeBps, 0)} winner · {pct(CONFIG.rakeToRewardPoolBps, 0)} RewardPool · {pct(CONFIG.rakeToBurnBps, 0)} burn · {pct(CONFIG.rakeToTreasuryBps, 0)} treasury
                  </td>
                </tr>
                <tr>
                  <td>Tournament entries</td>
                  <td>
                    {pct(10_000 - CONFIG.tournamentRakeBps, 0)} prize pool (minus the organiser fee) · {pct(CONFIG.rakeToRewardPoolBps, 0)} RewardPool · {pct(CONFIG.rakeToBurnBps, 0)} burn
                  </td>
                </tr>
                <tr>
                  <td>{pct(CONFIG.poolFeeBps, 0)} fee on character markets</td>
                  <td>
                    {pct(10_000 - CONFIG.treasuryTradeBps, 0)} RewardPool · {pct(CONFIG.treasuryTradeBps, 0)} treasury
                  </td>
                </tr>
                <tr>
                  <td>Season license</td>
                  <td>100 % back to the controller; enters no flow</td>
                </tr>
                <tr>
                  <td>LaunchPool</td>
                  <td>no fee</td>
                </tr>
              </tbody>
            </table>
            <h3>The RewardPool</h3>
            <p>
              The RewardPool holds TRCH for player rewards. It receives TRCH by plain transfer (the shares above plus the seed) and pays <strong>only by formula</strong>: at most {pct(CONFIG.stakerRewardPoolCapBps, 0)} of <code>available</code> per match to the StakingVault and {pct(CONFIG.seasonPayoutBps, 0)} of <code>available</code> per season to the Rating contract. Nobody can withdraw from it otherwise; its two callers are fixed in the constructor.
            </p>
            <p>
              <code>available = balance − lockedSeed(t)</code>, where the {tl(CONFIG.tlToRewardPoolSeed)} seed unlocks linearly over {CONFIG.seedReleaseDays} days from deployment. Because every outflow is a percentage of what is available, the pool can never be emptied. The seed is the only TRCH that never passed through the LaunchPool curve, so it has no ETH backing there; selling it back into the LaunchPool is possible only as far as the real reserve goes, and this is stated on the Transparency page.
            </p>
            <h3>Burns and the treasury</h3>
            <p>
              Two sinks reduce supply: half of every mint fee and {pct(CONFIG.rakeToBurnBps, 0)} of every staked pot. The treasury receives only the three shares fixed in <code>Config.sol</code> ({pct(CONFIG.mintTreasuryBps, 0)} of the mint fee, {pct(CONFIG.treasuryTradeBps, 0)} of the {pct(CONFIG.poolFeeBps, 0)} trading fee, {pct(CONFIG.rakeToTreasuryBps, 0)} of the rake); each share is an independent constant and a share of zero is a valid deployment. All economic parameters are immutable.
            </p>
          </Section>

          {/* ---------------------------------------------------------- security */}
          <Section id="security" n="09" title="Security and governance">
            <ul>
              <li>
                <strong>Immutable contracts.</strong> No upgradeable proxies, no <code>delegatecall</code> in custom code, no <code>initialize()</code>. A future version would be a new deployment, never a migration of the existing one.
              </li>
              <li>
                <strong>No admin.</strong> The only privileged function is <code>pause()</code> on three entry points (create a character, challenge or accept a match, stake), callable by the guardian address for {CONFIG.pauseExpiryDays} days after deployment. After that the pause dies with the guardian. Commit, reveal, timeout, claim, withdraw and unlicense always work, so a pause can never cause a forfeit or freeze funds.
              </li>
              <li>
                <strong>No randomness, no oracles.</strong> Nothing reads the LaunchPool price; nothing depends on block hashes.
              </li>
              <li>
                <strong>Pull payments</strong> everywhere, with two documented exceptions: selling into the LaunchPool or a character pool returns the swapped asset in the same call, guarded against reentrancy.
              </li>
              <li>
                <strong>Testing.</strong> 100 % line and function coverage on the custom contracts, fuzzing with 10,000 runs per property, three invariant suites, shared battle vectors executed in Solidity, TypeScript and Python, and a clean Slither run (no high or medium findings). There is no external audit; the code is public on{" "}
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  GitHub
                </a>{" "}
                and the threat model is part of the repository.
              </li>
            </ul>
            <Callout tone="info" title="Verify, do not trust">
              Every address on the <Link href="/transparency/">Transparency page</Link> links to the block explorer, where the verified source can be compared with the repository.
            </Callout>
          </Section>

          {/* ---------------------------------------------------------- FAQ */}
          <Section id="faq" n="10" title="FAQ">
            <dl className="flex flex-col gap-5">
              {FAQ.map(([q, a]) => (
                <div key={q} className="card-sub p-4">
                  <dt className="strong font-semibold">{q}</dt>
                  <dd className="muted mt-1.5 text-sm leading-relaxed">{a}</dd>
                </div>
              ))}
            </dl>
          </Section>

          {/* ---------------------------------------------------------- glossary */}
          <Section id="glossary" n="11" title="Glossary">
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {GLOSSARY.map(([term, def]) => (
                <div key={term}>
                  <dt className="strong font-semibold">{term}</dt>
                  <dd className="muted text-sm leading-relaxed">{def}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-5 flex items-baseline gap-3">
        <span className="mono text-sm text-[var(--accent)]">{n}</span>
        <h2 className="h2">{title}</h2>
      </div>
      <div className="prose">{children}</div>
    </section>
  );
}

const FAQ: [string, React.ReactNode][] = [
  ["Do I need ETH?", "Yes, a little: players pay their own gas on Base, typically a fraction of a cent per transaction. A Coinbase Smart Wallet (passkey) or any browser wallet works."],
  ["Can the outcome of a match be random or manipulated?", "No. The engine is a pure function of both characters' public traits and both controllers' committed tactics. There is no block hash, oracle or VRF anywhere, and tactics are hidden by a hash until both sides have committed."],
  ["What happens if my opponent never reveals?", "After the reveal deadline anyone can poke the match. The side that revealed wins by forfeit; the forfeit counts as a loss for the other side's rating."],
  ["I lost the device I committed from. Can I still reveal?", "Yes. The salt and the encryption key are derived from a wallet signature, and the encrypted tactics are stored in the commit event. Sign again on any device and the interface recovers them."],
  ["Can I lose my stake when staking on a match?", "No. Staking is no-loss by construction: withdraw(matchId) returns exactly what you deposited after the match resolves, whatever the result. Winning-side stakers additionally share a TRCH reward paid from the RewardPool."],
  ["Who can withdraw from the RewardPool?", "Nobody. It pays only by formula: at most 2 % of its available balance per match to the staking vault and 20 % per season to the Rating contract. Its two callers are fixed in the constructor."],
  ["Is the season license a fee?", "No. It is a refundable deposit of 10,000 TRCH that you can withdraw at any time, in full, even during a pause. It never yields and never enters any payout; it only marks a character as competing for the season reward."],
  ["Can a creator rug a character?", "Liquidity is permanent (no LP tokens, no withdrawal, no migration), the creator allocation is capped at 20 % and always vests linearly, and the creator's first buy goes through the same curve as everyone else."],
  ["What can the guardian do?", "Only pause three entry points (create, challenge/accept, stake) for 365 days after deployment. It cannot touch funds, change parameters or stop reveals, claims and withdrawals."],
  ["Can the contracts be upgraded?", "No. There are no proxies and no admin. A new version would be a separate deployment."],
  ["What does the treasury receive?", "Exactly the shares fixed in Config.sol: 25 % of the mint fee, 50 % of the 1 % trading fee on character markets, and 0 % of the match rake. Every flow is listed on the Transparency page."],
  ["Does holding a character token entitle me to anything?", "Only to trade it on its curve or AMM pool and to stake it on matches. Match prizes go exclusively to the winning controller address; token holders have no claim on prizes and receive no yield."],
  ["What is the difference between a character's curve and its AMM pool?", "The curve is the primary market: permanent liquidity created at character creation, no LP tokens, no withdrawal. The AMM pool is an optional secondary market that anyone can open and fund; liquidity providers hold LP shares, earn 0.30 % of every swap and can withdraw at any time. Both quote TRCH; the Marketplace shows both prices."],
  ["What is the Base Sepolia deployment?", "A testnet deployment used to exercise the protocol end to end. Testnet tokens have no value."],
  ["Is this an investment?", <>No. TRENCHAMPIONSHIP is a game built for entertainment. Its tokens are in-game utility tokens with no guaranteed value and no promise of profit, nobody operates the contracts, and the project continues only if it succeeds. Read the <Link href="/disclaimer/">disclaimer</Link> before you play.</>],
];

const GLOSSARY: [string, string][] = [
  ["Character", "An ERC-20 token, a permanent TRCH market and a controller NFT, created together with public, immutable traits."],
  ["Controller NFT", "The 1/1 ERC-721 that gives the right to lead a character, receive its prizes and fees, and retire it. Locked while the character is busy."],
  ["TRCH", "The in-game utility token: the quote currency of every character market and the only means of payment in the league."],
  ["LaunchPool", "The permanent ETH/TRCH constant-product market with a 1 ETH virtual reserve, no fee and no owner."],
  ["Virtual reserve", "A fixed quote-side offset of a curve that sets the starting price and steepness; never deposited, never withdrawable."],
  ["Character pool", "A character's own TRCH/token curve with a 1 % protocol fee and an optional creator fee."],
  ["AMM pool", "The optional TRCH/token constant-product pair of a character (Uniswap v2 style): 0.30 % of every swap to the liquidity providers, 0.05 % in TRCH to the protocol; anyone can open it and provide liquidity."],
  ["LP shares", "The ERC-20 token of an AMM pool that redeems a pro-rata part of both reserves; the first 1000 wei are locked forever."],
  ["Stake (match)", "The TRCH each side escrows for a match; the winner's claim is both stakes minus the 5 % rake."],
  ["Staking (no-loss)", "Depositing a character's tokens on a side during the staking window; always returned in full, winning side shares a RewardPool reward."],
  ["Commit / reveal", "Submitting a hash of your tactics first and the tactics themselves later, so neither side can react to the other."],
  ["Preset", "The time windows of a match: Blitz 1 h, Standard 24 h, Tournament 12 h."],
  ["Forfeit", "A loss awarded to the side that missed the commit or reveal deadline while the other side acted."],
  ["Void", "A match in which neither side committed (or revealed) in time; both stakes are refunded and nothing else happens."],
  ["Rake", "5 % of a staked pot: 3 % to the RewardPool, 2 % burned, 0 % to the treasury."],
  ["RewardPool", "The contract that holds reward TRCH and pays only by formula (2 % per match, 20 % per season of its available balance)."],
  ["Season license", "A refundable 10,000 TRCH deposit per character required to compete for the season reward; withdrawable at any time."],
  ["Elo", "The rating system: start 1000, K 32 for the first 20 rated matches, then 16; table-based expected score."],
  ["Poke", "The permissionless call that applies a timeout: expiry, void or forfeit."],
  ["Claim", "Pull-payment withdrawal of prizes, refunds, season rewards or tournament prizes booked to your address."],
  ["Guardian", "The address that may pause three entry points for 365 days after deployment; it has no other power."],
  ["Treasury", "The immutable address that receives the fixed shares from Config.sol; it has no functions."],
];
