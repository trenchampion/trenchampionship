"use client";

import Link from "next/link";
import { useReadContract } from "wagmi";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { CharacterArt, CharacterChip } from "@/components/CharacterArt";
import { ElementBadge } from "@/components/ElementBadge";
import { IconArrow, IconCoins, IconExternal, IconLayers, IconLock, IconShield, IconSpark, IconSwords, IconTrophy } from "@/components/Icons";
import { PentagonArt } from "@/components/PentagonArt";
import { Stat, StatGrid } from "@/components/Stat";
import { Table } from "@/components/Table";
import { addresses, CHAIN_ID, chain, IS_TESTNET, launchUiUrl } from "@/lib/config";
import { contracts } from "@/lib/contracts";
import { countdown, tl } from "@/lib/format";
import { useCharacters, useCharactersByIds, useMatches, useProtocolStats } from "@/lib/queries";
import type { CharacterRow } from "@/lib/indexer";

export default function Home() {
  const c = contracts();
  const a = addresses();
  const buyUrl = launchUiUrl(CHAIN_ID, a.LaunchPool);
  const stats = useProtocolStats();
  const supply = useReadContract({ ...c.tl, functionName: "totalSupply" });
  const rewardPool = useReadContract({ ...c.tl, functionName: "balanceOf", args: [a.RewardPool] });
  const top = useCharacters("rating", 5);
  const open = useMatches({ status: "Challenged" }, 5);
  const openIds = open.data?.flatMap((m) => (m.idB ? [m.idA, m.idB] : [m.idA])) ?? [];
  const openChars = useCharactersByIds(openIds);
  const byId = new Map(openChars.data?.map((x) => [x.id, x]) ?? []);

  return (
    <div className="flex flex-col gap-20">
      {/* ------------------------------------------------------------ hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <div className="eyebrow fade-up mb-4">A meme-coin league on Base</div>
          <h1 className="display fade-up">
            Characters are coins.
            <br />
            <span className="text-gradient">Battles are math.</span>
          </h1>
          <p className="lead fade-up-2 mt-6">
            TRENCHAMPIONSHIP is a league where every meme coin has a face and a record. Each player-created character is its own ERC-20 token on a permanent bonding-curve market, a 1/1 controller NFT with an on-chain portrait, and a fighter in the Arena. Matches are decided by traits and tactics alone: no randomness, no admin, no upgrades.
          </p>
          <div className="fade-up-3 mt-8 flex flex-wrap gap-3">
            <Link href="/how-it-works/" className="btn btn-primary btn-lg">
              How it works <IconArrow />
            </Link>
            <Link href="/create/" className="btn btn-lg">
              Create a character
            </Link>
            <Link href="/arena/" className="btn btn-lg">
              Open the Arena
            </Link>
          </div>
          <ul className="fade-up-3 mt-8 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-[var(--muted)] sm:grid-cols-4">
            {[
              ["No randomness", IconSwords],
              ["Immutable contracts", IconShield],
              ["No-loss staking", IconLock],
              ["Pull-payment claims", IconCoins],
            ].map(([label, Icon]) => {
              const I = Icon as typeof IconSwords;
              return (
                <li key={label as string} className="flex items-center gap-2">
                  <span className="text-[var(--accent)]">
                    <I size={16} />
                  </span>
                  {label as string}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="fade-up-2">
          <PentagonArt />
        </div>
      </section>

      {/* ------------------------------------------------------------ the idea */}
      <section aria-labelledby="idea-title">
        <div className="mb-8">
          <div className="eyebrow mb-2">The idea</div>
          <h2 id="idea-title" className="h2">
            Coins with characters, characters with a record
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card hover className="flex flex-col gap-3">
            <span className="text-[var(--accent)]">
              <IconCoins />
            </span>
            <h3 className="h3">Every character is a coin</h3>
            <p className="muted text-sm leading-relaxed">
              Creating a character mints its ERC-20 token and opens a market for it that can never be withdrawn. Anyone can buy the token of a character they want to follow, on its curve or on the AMM. The creator gets nothing for free: at most a capped, vested allocation.
            </p>
          </Card>
          <Card hover className="flex flex-col gap-3">
            <span className="text-[var(--accent)]">
              <IconSwords />
            </span>
            <h3 className="h3">The league gives the coin a story</h3>
            <p className="muted text-sm leading-relaxed">
              Wins, losses, Elo, season titles and tournament runs are public and permanent. What a character achieves in the Arena is the story its holders follow, and the reason to pick one character over another. A plain meme coin has a ticker; a TRENCHAMPIONSHIP character has a portrait, a personality and a fight record.
            </p>
          </Card>
          <Card hover className="flex flex-col gap-3">
            <span className="text-[var(--accent)]">
              <IconTrophy />
            </span>
            <h3 className="h3">The controller fights for it</h3>
            <p className="muted text-sm leading-relaxed">
              The 1/1 controller NFT leads the character into matches, collects its prizes and creator fees, and can change hands. Prizes go to the controller, never into the token's market; the token's price is set only by the people trading it. Token holders can stake on a match without ever losing their stake.
            </p>
          </Card>
        </div>
        <p className="muted mt-4 text-xs leading-relaxed">
          None of this is a promise of value: tokens can go to zero, nobody operates the league, and the battle engine does not know who holds what. Everything above is enforced by immutable contracts, not by a team.
        </p>
      </section>

      {/* ------------------------------------------------------------ three steps */}
      <section aria-labelledby="steps-title">
        <div className="mb-8">
          <div className="eyebrow mb-2">How to play</div>
          <h2 id="steps-title" className="h2">
            Three steps from zero to the league table
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StepCard
            n={1}
            icon={<IconCoins />}
            title="Get TRCH"
            text="TRCH is the in-game utility token. Buy it on the LaunchPool curve with ETH on Base, or receive it by winning matches. The LaunchPool has no fee and no owner. The official contract, supply and live numbers are on the TRCH page."
            action={
              <div className="flex flex-wrap gap-2">
                <Link href="/token/" className="btn btn-sm btn-primary">
                  About TRCH <IconArrow />
                </Link>
                <a href={buyUrl} target="_blank" rel="noreferrer" className="btn btn-sm">
                  Get TRCH <IconExternal />
                </a>
              </div>
            }
          />
          <StepCard
            n={2}
            icon={<IconLayers />}
            title="Create or back a character"
            text="Compose a character from four traits, an element, a special ability and a weakness, give it a name and a story. Creation mints its ERC-20 token, opens its permanent market and gives you the controller NFT with its on-chain portrait. Or buy the token of a character you believe in."
            action={
              <Link href="/create/" className="btn btn-sm">
                Open the builder
              </Link>
            }
          />
          <StepCard
            n={3}
            icon={<IconTrophy />}
            title="Fight, stake, climb the league"
            text="Challenge another character, commit secret tactics, reveal, and let the engine resolve three rounds. Token holders can stake on a side without ever losing their stake. Rated wins move your Elo and the season top 10."
            action={
              <Link href="/arena/" className="btn btn-sm">
                Go to the Arena
              </Link>
            }
          />
        </div>
      </section>

      {/* ------------------------------------------------------------ live stats */}
      <section aria-labelledby="stats-title">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="eyebrow mb-2">Live on {chain.name}</div>
            <h2 id="stats-title" className="h2">
              Protocol at a glance
            </h2>
          </div>
          <Link href="/transparency/" className="btn btn-ghost btn-sm">
            Full transparency page <IconArrow />
          </Link>
        </div>
        {stats.error && (
          <p className="muted mb-4 text-sm">The indexer is unreachable right now; on-chain figures below still load from the RPC, and every action keeps working from your wallet.</p>
        )}
        <StatGrid cols={4}>
          <Stat label="Characters" value={stats.data?.characters ?? "—"} loading={stats.isLoading} hint="created on chain" />
          <Stat label="Matches" value={stats.data?.matches ?? "—"} loading={stats.isLoading} hint={stats.data ? `${stats.data.resolvedMatches} resolved` : undefined} />
          <Stat label="TRCH supply" value={tl(supply.data)} loading={supply.isLoading} hint={stats.data ? `${tl(stats.data.tlBurned)} burned so far` : "after burns"} />
          <Stat label="RewardPool" value={tl(rewardPool.data)} loading={rewardPool.isLoading} hint="pays only by formula" />
        </StatGrid>
      </section>

      {/* ------------------------------------------------------------ live tables */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]" aria-label="Live league data">
        <Card pad={false}>
          <div className="card-head">
            <div>
              <div className="eyebrow mb-1">Season standings</div>
              <h2 className="h3">Top rated characters</h2>
            </div>
            <Link href="/league/" className="btn btn-ghost btn-sm">
              League <IconArrow />
            </Link>
          </div>
          <Table<CharacterRow>
            columns={[
              { key: "n", header: "#", render: (_, i) => <span className="rank">{i + 1}</span> },
              {
                key: "name",
                header: "Character",
                render: (r) => (
                  <CharacterChip character={r}>
                    <ElementBadge element={r.element} />
                    {r.licensed && <Badge tone="accent">licensed</Badge>}
                  </CharacterChip>
                ),
              },
              { key: "rating", header: "Rating", align: "right", render: (r) => <span className="num">{r.rating}</span> },
              { key: "record", header: "W / L / D", align: "right", render: (r) => <span className="num muted">{r.wins} / {r.losses} / {r.draws}</span> },
            ]}
            rows={top.data}
            loading={top.isLoading}
            rowKey={(r) => r.id}
            empty={top.error ? "Indexer unavailable." : "No characters yet. Be the first to create one."}
          />
        </Card>
        <Card pad={false}>
          <div className="card-head">
            <div>
              <div className="eyebrow mb-1">Arena</div>
              <h2 className="h3">Open challenges</h2>
            </div>
            <Link href="/arena/" className="btn btn-ghost btn-sm">
              Arena <IconArrow />
            </Link>
          </div>
          <div className="card-pad">
            {open.isLoading && <div className="skeleton h-16" />}
            {open.data && open.data.length === 0 && <p className="muted text-sm">No challenge is waiting for an opponent right now.</p>}
            {open.error && <p className="muted text-sm">Indexer unavailable.</p>}
            <ul className="flex flex-col divide-y divide-[var(--line)]">
              {open.data?.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link href={`/arena/?match=${m.id}`} className="flex min-w-0 items-center gap-2.5 hover:text-[var(--accent)]">
                    <span className="flex shrink-0 items-center gap-1">
                      {byId.get(m.idA) && <CharacterArt character={byId.get(m.idA)!} size={28} alt="" />}
                      {m.idB && byId.get(m.idB) && <CharacterArt character={byId.get(m.idB)!} size={28} alt="" />}
                    </span>
                    <span className="min-w-0 truncate">
                      <span className="mono muted mr-2">#{m.id}</span>
                      {byId.get(m.idA)?.name ?? `Character ${m.idA}`} vs {m.idB ? (byId.get(m.idB)?.name ?? `Character ${m.idB}`) : "anyone"}
                    </span>
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge tone="accent">{m.stake === "0" ? "friendly" : tl(m.stake)}</Badge>
                    <span className="muted num text-xs">accept within {countdown(String(Number(m.createdAt) + 48 * 3600))}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>

      {/* ------------------------------------------------------------ links */}
      <section aria-label="Explore">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <LinkCard href="/how-it-works/" title="How it works" text="Characters, markets, matches, staking, seasons, tournaments and the economy, with every number from the contracts." icon={<IconSpark />} />
          <LinkCard href="/create/" title="Create" text="Build a character within the 45-point budget and choose its tokenomics within protocol bounds." icon={<IconLayers />} />
          <LinkCard href="/arena/" title="Arena" text="Challenge, accept, commit, reveal. Stake on a side during the staking window." icon={<IconSwords />} />
          <LinkCard href="/marketplace/" title="Marketplace" text="Every character token with its curve and AMM prices in TRCH, your portfolio and the trade history." icon={<IconCoins />} />
          <LinkCard href="/transparency/" title="Transparency" text="Contract addresses, treasury flows and the RewardPool state, live from the chain." icon={<IconShield />} />
        </div>
        <div className="card-sub mt-8 px-5 py-4 text-sm leading-relaxed text-[var(--muted)]" role="note">
          <span className="strong font-semibold">Built for entertainment.</span> TRENCHAMPIONSHIP promises no financial gain: tokens may lose all their value, nobody operates the contracts, and the project continues only if it succeeds.{" "}
          <Link href="/disclaimer/" className="underline hover:text-[var(--accent)]">
            Read the disclaimer
          </Link>
          .{IS_TESTNET && " This deployment runs on the Base Sepolia testnet, where tokens have no value."}
        </div>
      </section>
    </div>
  );
}

function StepCard({ n, icon, title, text, action }: { n: number; icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <Card hover className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="step-number">{n}</span>
        <span className="text-[var(--accent)]">{icon}</span>
      </div>
      <div>
        <h3 className="h3">{title}</h3>
        <p className="muted mt-2 text-sm leading-relaxed">{text}</p>
      </div>
      {action && <div className="mt-auto">{action}</div>}
    </Card>
  );
}

function LinkCard({ href, title, text, icon }: { href: string; title: string; text: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="card card-pad card-hover flex flex-col gap-3 no-underline">
      <span className="text-[var(--accent)]">{icon}</span>
      <span className="h3 flex items-center gap-2">
        {title} <IconArrow size={14} className="text-[var(--muted)]" />
      </span>
      <span className="muted text-sm leading-relaxed">{text}</span>
    </Link>
  );
}
