"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAccount, useReadContract } from "wagmi";
import { AddressLink } from "@/components/AddressLink";
import { AmmPanel } from "@/components/AmmPanel";
import { Badge } from "@/components/Badge";
import { Callout } from "@/components/Callout";
import { Card, CardBody, CardHead } from "@/components/Card";
import { CharacterArt } from "@/components/CharacterArt";
import { CurvePanel } from "@/components/CurvePanel";
import { ElementBadge } from "@/components/ElementBadge";
import { EmptyState, Skeleton } from "@/components/EmptyState";
import { Guide } from "@/components/Guide";
import { IconSwords } from "@/components/Icons";
import { Stat, StatGrid } from "@/components/Stat";
import { Table } from "@/components/Table";
import { CANCELLED, TxButton } from "@/components/TxButton";
import { WalletGate } from "@/components/WalletGate";
import { CONFIG } from "@/lib/config";
import { contracts, poolAbi } from "@/lib/contracts";
import { shortError } from "@/lib/errors";
import { ELEMENTS, MATCH_OUTCOME_LABEL, MATCH_STATUS_LABEL, SPECIALS, SPECIAL_HELP, STANCES, energyOf, ipfsToHttp, pct, tl, when } from "@/lib/format";
import type { MatchRow } from "@/lib/indexer";
import { useCharacter, useMatches } from "@/lib/queries";

export default function CharacterPage() {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <CharacterInner />
    </Suspense>
  );
}

function CharacterInner() {
  const id = useSearchParams().get("id");
  const { data: ch, isLoading, error } = useCharacter(id);
  const matches = useMatches(id ? { OR: [{ idA: id }, { idB: id }] } : {}, 30);
  const { address } = useAccount();
  const c = contracts();

  const pool = ch?.pool as `0x${string}` | undefined;
  const creatorFeeOwed = useReadContract({ abi: poolAbi, address: pool, functionName: "creatorFeeOwed", query: { enabled: !!pool } });
  const licenseAllowance = useReadContract({ ...c.tl, functionName: "allowance", args: address ? [address, c.rating.address] : undefined, query: { enabled: !!address } });

  if (!id) {
    return (
      <EmptyState title="No character selected" action={<Link href="/league/" className="btn btn-primary">Browse the league</Link>}>
        Open a character from the league table, the Arena or a match page. The URL looks like <code>/character/?id=1</code>.
      </EmptyState>
    );
  }
  if (isLoading) return <Skeleton lines={8} />;
  if (error) {
    return (
      <Callout tone="bad" title="Could not load the character">
        {shortError(error)} The indexer may be syncing; on-chain actions still work from the Arena.
      </Callout>
    );
  }
  if (!ch) {
    return (
      <EmptyState title={`Character #${id} not found`} action={<Link href="/league/" className="btn">Browse the league</Link>}>
        Either it does not exist yet or the indexer is still syncing.
      </EmptyState>
    );
  }

  const meta = parseMeta(ch.metadataURI);
  const isController = !!address && ch.controller?.toLowerCase() === address.toLowerCase();

  return (
    <div className="flex flex-col gap-8">
      <Guide
        learnMore="/how-it-works/#markets"
        steps={[
          <>Traits, element, special and weakness are public and immutable; they decide every battle together with the committed tactics.</>,
          <>
            The market is a permanent TRCH / {ch.symbol} curve: buy with TRCH, sell for TRCH. A 1 % protocol fee and the creator fee ({pct(ch.creatorFeeBps)}) apply to every trade.
          </>,
          <>The controller (holder of the NFT) can activate a season license, retire the character and collects the accrued creator fee.</>,
          <>Anyone can challenge this character from the Arena; token holders can stake on it during a match's staking window.</>,
        ]}
      />

      {/* ---------------------------------------------------------- header */}
      <Card className="flex flex-col gap-5 md:flex-row md:items-start">
        <CharacterArt character={ch} size={192} className="art-lg mx-auto md:mx-0" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="h1">{ch.name}</h1>
            <span className="mono muted text-lg">{ch.symbol}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <ElementBadge element={ch.element} />
            <Badge>{SPECIALS[ch.special]}</Badge>
            <ElementBadge element={ch.weakness} prefix="weak to" />
            {ch.licensed && <Badge tone="accent">season license</Badge>}
            {ch.retired && <Badge tone="bad">retired</Badge>}
            {ch.creatorAllocBps === 0 && <Badge tone="good">fair launch</Badge>}
          </div>
          {meta.story && (
            <div className="card-sub mt-4 px-4 py-3">
              <div className="eyebrow mb-1">The creator&apos;s story</div>
              <p className="whitespace-pre-line text-sm leading-relaxed">{meta.story}</p>
            </div>
          )}
          <p className="muted mt-3 text-sm">
            Character #{ch.id} · creator <AddressLink address={ch.creator} /> · controller {ch.controller ? <AddressLink address={ch.controller} /> : <span>none (retired)</span>} · created {when(ch.createdAt)}
          </p>
          <p className="muted mt-1.5 text-xs leading-relaxed">
            The artwork is generated on chain from the traits and the name by <code>ControllerNFT.tokenURI</code>, so every wallet and marketplace shows this exact image.
            {meta.image && (
              <>
                {" "}
                Creator&apos;s reference image:{" "}
                <a href={ipfsToHttp(meta.image)} target="_blank" rel="noreferrer" className="underline hover:text-[var(--accent)]">
                  open ↗
                </a>
              </>
            )}
          </p>
        </div>
        <div className="shrink-0">
          <Link href={`/arena/?opponent=${ch.id}`} className="btn btn-primary" aria-disabled={ch.retired}>
            <IconSwords size={16} /> Challenge in the Arena
          </Link>
        </div>
      </Card>

      <StatGrid cols={4}>
        <Stat label="Rating" value={ch.rating} hint={`${ch.ratedMatches} rated matches`} />
        <Stat label="Record" value={`${ch.wins} W · ${ch.losses} L · ${ch.draws} D`} />
        <Stat label="TRCH won" value={tl(ch.tlWon)} hint="match prizes claimed by the controller" />
        <Stat label="Energy per match" value={energyOf(ch.speed, ch.special)} hint="5 + Speed / 2, +1 for Endurance" />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          {/* -------------------------------------------------------- traits */}
          <Card pad={false}>
            <CardHead title="Traits" description="Public and immutable." />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["Strength", ch.strength],
                    ["Defense", ch.defense],
                    ["Speed", ch.speed],
                    ["Focus", ch.focus],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="muted">{k}</span>
                      <span className="strong num font-semibold">{v}</span>
                    </div>
                    <div className="trait-bar mt-1.5">
                      <span style={{ width: `${(v / CONFIG.traitMax) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <dl className="kv mt-5">
                <dt>Attack / Defense / Counter base</dt>
                <dd>
                  {ch.strength + Math.floor(ch.focus / 2)} / {ch.defense + Math.floor(ch.strength / 2)} / {ch.focus + Math.floor(ch.defense / 2)}
                </dd>
                <dt>Special</dt>
                <dd>
                  {SPECIALS[ch.special]} <span className="muted">({SPECIAL_HELP[ch.special]})</span>
                </dd>
                <dt>Element / weakness</dt>
                <dd>
                  {ELEMENTS[ch.element]} / {ELEMENTS[ch.weakness]}
                </dd>
              </dl>
            </CardBody>
          </Card>

          {/* -------------------------------------------------------- history */}
          <Card pad={false}>
            <CardHead title="Match history" description="Tactics become public after both reveals." />
            <Table<MatchRow>
              columns={[
                {
                  key: "id",
                  header: "Match",
                  render: (m) => (
                    <Link href={`/arena/?match=${m.id}`} className="mono hover:text-[var(--accent)]">
                      #{m.id}
                    </Link>
                  ),
                },
                {
                  key: "opp",
                  header: "Opponent",
                  render: (m) => {
                    const isA = m.idA === ch.id;
                    const opp = isA ? m.idB : m.idA;
                    return opp ? (
                      <Link href={`/character/?id=${opp}`} className="hover:text-[var(--accent)]">
                        Character {opp}
                      </Link>
                    ) : (
                      <span className="muted">open</span>
                    );
                  },
                },
                { key: "stake", header: "Stake / side", align: "right", render: (m) => (m.stake === "0" ? <span className="muted">friendly</span> : tl(m.stake)) },
                {
                  key: "result",
                  header: "Result",
                  render: (m) => {
                    const isA = m.idA === ch.id;
                    if (!m.outcome) return <Badge>{MATCH_STATUS_LABEL[m.status] ?? m.status}</Badge>;
                    const won = m.outcome === (isA ? "WinA" : "WinB");
                    const lost = m.outcome === (isA ? "WinB" : "WinA");
                    return (
                      <span className="flex items-center gap-2">
                        <Badge tone={won ? "good" : lost ? "bad" : "neutral"}>{won ? "Won" : lost ? "Lost" : (MATCH_OUTCOME_LABEL[m.outcome] ?? m.outcome)}</Badge>
                        {m.roundsA !== null && (
                          <span className="muted num text-xs">
                            {isA ? m.roundsA : m.roundsB}:{isA ? m.roundsB : m.roundsA}
                          </span>
                        )}
                      </span>
                    );
                  },
                },
                {
                  key: "tactics",
                  header: "Tactics A / B",
                  render: (m) => (
                    <span className="muted text-xs">
                      {fmtTactics(m.stancesA, m.energiesA)} / {fmtTactics(m.stancesB, m.energiesB)}
                    </span>
                  ),
                },
              ]}
              rows={matches.data}
              loading={matches.isLoading}
              rowKey={(m) => m.id}
              empty="No matches yet."
            />
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {/* -------------------------------------------------------- curve (primary market) */}
          <CurvePanel ch={ch} />

          {/* -------------------------------------------------------- AMM (WP11) */}
          <AmmPanel characterId={ch.id} token={ch.token as `0x${string}`} symbol={ch.symbol} />

          {/* -------------------------------------------------------- controller */}
          <Card pad={false}>
            <CardHead title="Controller" description={isController ? "You hold this character's controller NFT." : "Actions reserved for the holder of the controller NFT."} />
            <CardBody className="flex flex-col gap-4 text-sm">
              <dl className="kv">
                <dt>Accrued creator fee</dt>
                <dd>{tl(creatorFeeOwed.data, 2)}</dd>
              </dl>
              <p className="muted text-xs">The fee is paid to the current controller; anyone may trigger the payout.</p>
              <WalletGate what="use controller actions">
                <div className="flex flex-wrap gap-2">
                  <TxButton label="Pay out creator fee" size="sm" disabled={!creatorFeeOwed.data} build={() => ({ abi: poolAbi, address: pool!, functionName: "claimCreatorFees" })} />
                </div>
                {isController && (
                  <>
                    <hr />
                    <div>
                      <div className="strong font-semibold">Season license</div>
                      <p className="muted mt-1 text-xs leading-relaxed">
                        A refundable deposit of {tl(CONFIG.seasonLicense)} held in the Rating contract. Required to compete for the season reward; returned in full whenever you withdraw it (withdrawing resets this season's counters).
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {!ch.licensed ? (
                          <>
                            <TxButton label={`Approve ${tl(CONFIG.seasonLicense)}`} size="sm" disabled={(licenseAllowance.data ?? 0n) >= CONFIG.seasonLicense} build={() => ({ ...c.tl, functionName: "approve", args: [c.rating.address, CONFIG.seasonLicense] })} />
                            <TxButton label="Activate season license" size="sm" primary disabled={(licenseAllowance.data ?? 0n) < CONFIG.seasonLicense} build={() => ({ ...c.rating, functionName: "license", args: [BigInt(ch.id)] })} />
                          </>
                        ) : (
                          <TxButton label="Withdraw license deposit" size="sm" build={() => ({ ...c.rating, functionName: "unlicense", args: [BigInt(ch.id)] })} />
                        )}
                      </div>
                    </div>
                    {!ch.retired && (
                      <>
                        <hr />
                        <div>
                          <div className="strong font-semibold">Retire</div>
                          <p className="muted mt-1 text-xs leading-relaxed">Burns the controller NFT. The character can never fight again; its token and market live on. Not possible while the character is in a match or tournament. Irreversible.</p>
                          <div className="mt-3">
                            <TxButton
                              label="Retire character"
                              size="sm"
                              danger
                              build={() => {
                                if (!confirm("Retiring burns the controller NFT. The character can never enter a match again. Continue?")) throw new Error(CANCELLED);
                                return { ...c.nft, functionName: "retire", args: [BigInt(ch.id)] };
                              }}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </WalletGate>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function fmtTactics(stances: string | null, energies: string | null): string {
  if (!stances) return "—";
  const s = stances
    .split(",")
    .map((x) => STANCES[Number(x)]?.slice(0, 3) ?? "?")
    .join(" ");
  return `${s} | ${energies ?? ""}`;
}

function parseMeta(uri: string): { name?: string; image?: string; story?: string } {
  try {
    if (uri.startsWith("data:application/json;base64,")) {
      const m = JSON.parse(decodeURIComponent(escape(atob(uri.split(",")[1] ?? "")))) as { name?: string; image?: string; story?: string };
      if (typeof m.story === "string") m.story = m.story.slice(0, 1000);
      return m;
    }
  } catch {
    /* ignore */
  }
  return {};
}
