"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useReadContract, useSignTypedData } from "wagmi";
import { energyBudget, type Stance, type Tactics, type Traits } from "@traitleague/engine";
import { AddressLink } from "@/components/AddressLink";
import { Badge } from "@/components/Badge";
import { Callout } from "@/components/Callout";
import { Card, CardBody, CardHead } from "@/components/Card";
import { CharacterArt, traitsOf } from "@/components/CharacterArt";
import { EmptyState, Skeleton } from "@/components/EmptyState";
import { Field, Range } from "@/components/Field";
import { Guide } from "@/components/Guide";
import { PageHeader } from "@/components/Section";
import { Table } from "@/components/Table";
import { TxButton } from "@/components/TxButton";
import { WalletGate } from "@/components/WalletGate";
import { CHAIN_ID, CONFIG, PLAYER_PRESETS } from "@/lib/config";
import { characterTokenAbi, contracts } from "@/lib/contracts";
import { COMMIT_TYPES, type CommitRecord, backupText, commitDomain, commitHash, decryptTactics, encryptTactics, isReproducibleSignature, loadRecord, parseBackup, randomSalt, recordKey, saltFromSignature, saveRecord, tacticsOfRecord } from "@/lib/commit";
import { shortError } from "@/lib/errors";
import { MATCH_OUTCOME_LABEL, STANCES, countdown, tl, units, when } from "@/lib/format";
import type { CharacterRow, MatchRow } from "@/lib/indexer";
import { useCharacters, useMatch, useMatches, useMyCharacters } from "@/lib/queries";

export default function ArenaPage() {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <ArenaInner />
    </Suspense>
  );
}

type NameMap = Map<string, CharacterRow>;

function ArenaInner() {
  const params = useSearchParams();
  const matchId = params.get("match");
  const { address } = useAccount();
  const mine = useMyCharacters(address);
  const open = useMatches({ status: "Challenged" }, 30);
  const active = useMatches({ status: "Accepted" }, 30);
  const recent = useMatches({ status: "Resolved" }, 15);
  const chars = useCharacters("rating", 500);
  const names: NameMap = useMemo(() => new Map(chars.data?.map((x) => [x.id, x]) ?? []), [chars.data]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Arena" title="Challenge, commit, reveal" lead="Every match is resolved by the deterministic battle engine from both characters' public traits and both controllers' secret tactics. No randomness, no referee." />

      <Guide
        learnMore="/how-it-works/#matches"
        steps={[
          <>
            <strong>Challenge</strong> a specific character or anyone, with a stake per side (0 = friendly: no escrow, staking or rating) and a preset (Blitz 1 h, Standard 24 h windows).
          </>,
          <>
            <strong>Accept</strong> within 48 hours with the matching stake. Token holders may then <strong>stake</strong> on a side during the staking window; stakes are always returned in full.
          </>,
          <>
            <strong>Commit</strong> three stances and an energy split as a hash; <strong>reveal</strong> once both sides committed and staking closed. The second reveal resolves the match.
          </>,
          <>
            Missed deadlines are applied by anyone with <strong>poke</strong>: void when nobody acted, forfeit when one side did. Prizes and refunds are collected from <strong>Claims</strong>.
          </>,
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          {matchId ? <MatchDetail id={matchId} mine={mine.data ?? []} names={names} /> : <ChallengeForm mine={mine.data ?? []} mineLoading={mine.isLoading} names={names} />}
          <Card pad={false}>
            <CardHead title="Challenges awaiting acceptance" description="Open challenges can be accepted by anyone with an eligible character." />
            <MatchList rows={open.data} loading={open.isLoading} error={open.error} names={names} empty="No challenge is waiting right now." me={address?.toLowerCase()} />
          </Card>
          <Card pad={false}>
            <CardHead title="Matches in progress" description="Staking, commit and reveal windows are running." />
            <MatchList rows={active.data} loading={active.isLoading} error={active.error} names={names} empty="No match is in progress." me={address?.toLowerCase()} />
          </Card>
        </div>
        <aside className="flex flex-col gap-6">
          <Card pad={false}>
            <CardHead title="Your characters" />
            <CardBody className="text-sm">
              {!address && <p className="muted">Connect a wallet to see the characters you control.</p>}
              {address && mine.isLoading && <Skeleton lines={2} />}
              {address && mine.data && mine.data.length === 0 && (
                <EmptyState compact title="You control no character yet" action={<Link href="/create/" className="btn btn-sm btn-primary">Create one</Link>} />
              )}
              <ul className="flex flex-col divide-y divide-[var(--line)]">
                {mine.data?.map((ch) => (
                  <li key={ch.id} className="flex items-center justify-between gap-2 py-2">
                    <Link href={`/character/?id=${ch.id}`} className="flex min-w-0 items-center gap-2.5 hover:text-[var(--accent)]">
                      <CharacterArt character={ch} size={32} alt="" />
                      <span className="min-w-0 truncate">
                        <span className="mono muted mr-2">#{ch.id}</span>
                        {ch.name}
                      </span>
                    </Link>
                    <span className="flex shrink-0 items-center gap-2">
                      {ch.licensed && <Badge tone="accent">licensed</Badge>}
                      <span className="muted num text-xs">rating {ch.rating}</span>
                      {!ch.retired && (
                        <a href="#new-challenge" className="btn btn-sm">
                          Challenge
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <Claims />
            </CardBody>
          </Card>
          <Card pad={false}>
            <CardHead title="Recently resolved" />
            <MatchList rows={recent.data} loading={recent.isLoading} error={recent.error} names={names} empty="Nothing resolved yet." compact me={address?.toLowerCase()} />
          </Card>
        </aside>
      </div>
    </div>
  );
}

/** The one thing the viewer can do with this match right now, as a button that opens the match page. */
function MatchAction({ m, me }: { m: MatchRow; me?: string }) {
  const href = `/arena/?match=${m.id}`;
  const isA = !!me && m.controllerA.toLowerCase() === me;
  const isB = !!me && !!m.controllerB && m.controllerB.toLowerCase() === me;
  let label = "View match";
  let primary = false;
  if (m.outcome) {
    label = "View result";
  } else if (m.status === "Challenged") {
    if (isA) label = "Manage challenge";
    else {
      label = "Accept challenge";
      primary = true;
    }
  } else if (m.status === "Accepted") {
    const both = m.committedA && m.committedB;
    if (isA || isB) {
      const myCommitted = isA ? m.committedA : m.committedB;
      const myRevealed = isA ? m.revealedA : m.revealedB;
      if (!myCommitted) {
        label = "Commit tactics";
        primary = true;
      } else if (both && !myRevealed) {
        label = "Reveal";
        primary = true;
      } else {
        label = "View match";
      }
    } else if (m.stake !== "0" && m.stakingCloseAt && Number(m.stakingCloseAt) * 1000 > Date.now()) {
      label = "Stake on a side";
    }
  }
  return (
    <Link href={href} className={`btn btn-sm whitespace-nowrap ${primary ? "btn-primary" : ""}`}>
      {label}
    </Link>
  );
}

const CHAIN_STATUS = ["None", "Challenged", "Accepted", "Resolved"] as const;
const CHAIN_OUTCOME = ["Pending", "WinA", "WinB", "Draw", "Void", "Expired", "Cancelled"] as const;
const ZERO32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

type ChainMatch = {
  idB: bigint;
  controllerB: `0x${string}`;
  status: number;
  outcome: number;
  revealedA: boolean;
  revealedB: boolean;
  commitA: `0x${string}`;
  commitB: `0x${string}`;
};

/** Indexer row with the fields that gate actions replaced by the live contract state. */
function withChainState(row: MatchRow, oc: ChainMatch | undefined): MatchRow {
  if (!oc || oc.status === 0) return row;
  const outcome = oc.outcome === 0 ? null : (CHAIN_OUTCOME[oc.outcome] ?? row.outcome);
  return {
    ...row,
    status: CHAIN_STATUS[oc.status] ?? row.status,
    outcome: outcome as MatchRow["outcome"],
    idB: oc.idB === 0n ? row.idB : oc.idB.toString(),
    controllerB: oc.controllerB === ZERO_ADDR ? row.controllerB : oc.controllerB,
    committedA: oc.commitA !== ZERO32,
    committedB: oc.commitB !== ZERO32,
    revealedA: oc.revealedA,
    revealedB: oc.revealedB,
  };
}

function charName(names: NameMap, id: string | null | undefined): string {
  if (!id) return "anyone";
  return names.get(id)?.name ?? `Character ${id}`;
}

function presetName(preset: number): string {
  return CONFIG.presets[preset]?.name ?? "Tournament";
}

function statusBadge(m: MatchRow) {
  if (m.outcome) {
    const tone = m.outcome === "WinA" || m.outcome === "WinB" ? "good" : m.outcome === "Draw" ? "accent" : "neutral";
    return <Badge tone={tone}>{MATCH_OUTCOME_LABEL[m.outcome] ?? m.outcome}</Badge>;
  }
  if (m.status === "Challenged") return <Badge tone="accent">awaiting acceptance</Badge>;
  const now = Date.now();
  if (m.stakingCloseAt && Number(m.stakingCloseAt) * 1000 > now && m.stake !== "0") return <Badge tone="good">staking · {countdown(m.stakingCloseAt)}</Badge>;
  if (m.committedA && m.committedB) return <Badge tone="accent">reveal phase</Badge>;
  return <Badge tone="accent">commit · {countdown(m.commitDeadline)}</Badge>;
}

function MatchList({ rows, loading, error, names, empty, compact, me }: { rows: MatchRow[] | undefined; loading: boolean; error: Error | null; names: NameMap; empty: string; compact?: boolean; me?: string }) {
  if (error) {
    return (
      <div className="card-pad">
        <p className="muted text-sm">Indexer unavailable: {shortError(error)}</p>
      </div>
    );
  }
  return (
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
          key: "pair",
          header: "Characters",
          render: (m) => {
            const a = names.get(m.idA);
            const b = m.idB ? names.get(m.idB) : undefined;
            return (
              <span className="inline-flex items-center gap-2">
                {a && <CharacterArt character={a} size={24} alt="" />}
                <Link href={`/character/?id=${m.idA}`} className="strong hover:text-[var(--accent)]">
                  {charName(names, m.idA)}
                </Link>
                <span className="muted">vs</span>
                {b && <CharacterArt character={b} size={24} alt="" />}
                {m.idB ? (
                  <Link href={`/character/?id=${m.idB}`} className="strong hover:text-[var(--accent)]">
                    {charName(names, m.idB)}
                  </Link>
                ) : (
                  <span className="muted">anyone</span>
                )}
              </span>
            );
          },
        },
        ...(compact
          ? []
          : [
              { key: "stake", header: "Stake / side", align: "right" as const, render: (m: MatchRow) => (m.stake === "0" ? <span className="muted">friendly</span> : tl(m.stake)) },
              { key: "preset", header: "Preset", render: (m: MatchRow) => <span className="muted">{presetName(m.preset)}</span> },
            ]),
        { key: "status", header: "Status", render: (m) => statusBadge(m) },
        { key: "act", header: "", align: "right" as const, render: (m) => <MatchAction m={m} me={me} /> },
      ]}
      rows={rows}
      loading={loading}
      rowKey={(m) => m.id}
      empty={empty}
    />
  );
}

function Claims() {
  const { address } = useAccount();
  const c = contracts();
  const claimable = useReadContract({ ...c.matchManager, functionName: "claimable", args: address ? [address] : undefined, query: { enabled: !!address } });
  const seasonClaim = useReadContract({ ...c.rating, functionName: "claimable", args: address ? [address] : undefined, query: { enabled: !!address } });
  const tourClaim = useReadContract({ ...c.tournament, functionName: "claimable", args: address ? [address] : undefined, query: { enabled: !!address } });
  if (!address) return null;
  const rows = [
    ["Match prizes and refunds", claimable.data, () => ({ ...c.matchManager, functionName: "claim" as const })],
    ["Season rewards", seasonClaim.data, () => ({ ...c.rating, functionName: "claim" as const })],
    ["Tournament prizes and refunds", tourClaim.data, () => ({ ...c.tournament, functionName: "claim" as const })],
  ] as const;
  return (
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <div className="strong mb-2 font-semibold">Claims</div>
      <p className="muted mb-3 text-xs">Every payout is pull-based: the contracts book what you are owed and you withdraw it here.</p>
      <ul className="flex flex-col gap-2">
        {rows.map(([label, amount, build]) => (
          <li key={label} className="flex items-center justify-between gap-3">
            <span>
              <span className="muted">{label}</span>
              <br />
              <span className="strong num">{tl(amount, 2)}</span>
            </span>
            <TxButton label="Claim" size="sm" disabled={!amount} build={build} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ challenge

function ChallengeForm({ mine, mineLoading, names }: { mine: CharacterRow[]; mineLoading: boolean; names: NameMap }) {
  const params = useSearchParams();
  const { address } = useAccount();
  const c = contracts();
  const [myId, setMyId] = useState("");
  const [opponent, setOpponent] = useState(params.get("opponent") ?? "");
  const [stake, setStake] = useState("1000");
  const [preset, setPreset] = useState(1);
  const amount = parseUnits(stake || "0", 18);
  const allowance = useReadContract({ ...c.tl, functionName: "allowance", args: address ? [address, c.matchManager.address] : undefined, query: { enabled: !!address } });
  const balance = useReadContract({ ...c.tl, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const eligible = mine.filter((m) => !m.retired);
  const chosen = myId || eligible[0]?.id || "";
  const stakeOk = amount === 0n || (amount >= CONFIG.stakeMin && amount <= CONFIG.stakeMax);
  const needsApproval = amount > 0n && (allowance.data ?? 0n) < amount;
  const enough = amount === 0n || balance.data === undefined || balance.data >= amount;
  const sameAsOpponent = !!opponent && opponent === chosen;
  const chosenRow = mine.find((m) => m.id === chosen);
  const opponentRow = opponent ? names.get(opponent) : undefined;

  return (
    <Card pad={false} id="new-challenge">
      <CardHead eyebrow="New challenge" title="Send a challenge" description="The stake is escrowed now and refunded if nobody accepts within 48 hours." />
      <CardBody>
        <WalletGate what="send a challenge">
          {mineLoading && <Skeleton lines={2} />}
          {!mineLoading && eligible.length === 0 && (
            <EmptyState compact title="You need a character to challenge" action={<Link href="/create/" className="btn btn-sm btn-primary">Create a character</Link>}>
              Only the holder of a controller NFT can send a challenge.
            </EmptyState>
          )}
          {eligible.length > 0 && (
            <div className="flex flex-col gap-5">
              <div className="card-sub flex items-center justify-center gap-5 p-4" aria-label="Match-up preview">
                <div className="flex w-28 flex-col items-center gap-1.5 text-center text-xs">
                  {chosenRow ? <CharacterArt character={chosenRow} size={72} alt="" /> : <div className="art" style={{ width: 72, height: 72 }} />}
                  <span className="strong w-full truncate font-medium">{chosenRow?.name ?? "—"}</span>
                </div>
                <span className="eyebrow">vs</span>
                <div className="flex w-28 flex-col items-center gap-1.5 text-center text-xs">
                  {opponentRow ? (
                    <CharacterArt character={opponentRow} size={72} alt="" />
                  ) : (
                    <div className="art grid place-items-center text-lg text-[var(--muted)]" style={{ width: 72, height: 72 }} aria-hidden="true">
                      ?
                    </div>
                  )}
                  <span className="muted w-full truncate">{opponent ? (opponentRow?.name ?? `Character ${opponent}`) : "anyone"}</span>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="my-char" label="Your character" help="A character can be in several matches at once; its NFT is locked while any is active.">
                  <select id="my-char" className="select" value={chosen} onChange={(e) => setMyId(e.target.value)}>
                    {eligible.map((m) => (
                      <option key={m.id} value={m.id}>
                        #{m.id} {m.name} (rating {m.rating})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="opponent" label="Opponent character id" help="Leave empty for an open challenge that anyone may accept. The opponent must have a different controller." error={sameAsOpponent ? "You cannot challenge your own character." : undefined}>
                  <input id="opponent" className="input num" inputMode="numeric" value={opponent} onChange={(e) => setOpponent(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 7 (empty = open)" />
                </Field>
                <Field
                  id="stake"
                  label="Stake per side"
                  help={`0 = friendly match (no escrow, no staking, no rating). Otherwise ${tl(CONFIG.stakeMin)} – ${tl(CONFIG.stakeMax)}. Winner receives both stakes minus the 5 % rake (3 % RewardPool, 2 % burned).`}
                  error={!stakeOk ? "Stake must be 0 or within the bounds." : !enough ? "Not enough TRCH." : undefined}
                >
                  <div className="input-group">
                    <input id="stake" className="input num" inputMode="decimal" value={stake} aria-invalid={!stakeOk} onChange={(e) => setStake(e.target.value.replace(/[^\d.]/g, ""))} />
                    <span className="input-addon">TRCH</span>
                  </div>
                </Field>
                <Field id="preset" label="Preset" help="Each window (staking, commit, reveal) has this length. Blitz for a quick match, Standard for a day-long one.">
                  <select id="preset" className="select" value={preset} onChange={(e) => setPreset(Number(e.target.value))}>
                    {PLAYER_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}: {p.window} windows
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="flex flex-wrap items-start gap-3">
                <TxButton label={amount === 0n ? "No approval needed" : needsApproval ? `Approve ${tl(amount)}` : "Approved"} disabled={!needsApproval} build={() => ({ ...c.tl, functionName: "approve", args: [c.matchManager.address, amount] })} />
                <TxButton
                  label="Send challenge"
                  primary
                  disabled={!chosen || !stakeOk || needsApproval || !enough || sameAsOpponent}
                  hint="Acceptance window 48 h. The same pair may play a staked match once per 24 h."
                  build={() => ({
                    ...c.matchManager,
                    functionName: "challenge",
                    args: [BigInt(chosen), BigInt(opponent || "0"), amount, preset],
                  })}
                />
              </div>
            </div>
          )}
        </WalletGate>
      </CardBody>
    </Card>
  );
}

// ------------------------------------------------------------------ match detail

function MatchDetail({ id, mine, names }: { id: string; mine: CharacterRow[]; names: NameMap }) {
  const { data: indexed, isLoading, error } = useMatch(id);
  const { address } = useAccount();
  const c = contracts();
  // The indexer lags the chain by seconds to minutes. Everything that gates an action (accept, commit, reveal) is
  // read live from the contract every few seconds, so a confirmed transaction hides its button at once and the
  // same action cannot be sent twice.
  const onchain = useReadContract({ ...c.matchManager, functionName: "getMatch", args: [BigInt(id)], query: { refetchInterval: 4000 } });
  const m = indexed ? withChainState(indexed, onchain.data) : indexed;
  const revealDeadline = useReadContract({ ...c.matchManager, functionName: "revealDeadline", args: [BigInt(id)], query: { enabled: !!m && m.status === "Accepted", refetchInterval: 15_000 } });
  const charA = m ? names.get(m.idA) : undefined;
  const charB = m?.idB ? names.get(m.idB) : undefined;
  const now = Date.now();

  if (isLoading) return <Skeleton lines={6} />;
  if (error) {
    return (
      <Callout tone="bad" title={`Could not load match #${id}`}>
        {shortError(error)}
      </Callout>
    );
  }
  if (!m) {
    return (
      <EmptyState title={`Match #${id} not found`} action={<Link href="/arena/" className="btn">All matches</Link>}>
        It may not exist or the indexer is still syncing.
      </EmptyState>
    );
  }

  const me = address?.toLowerCase();
  const isA = !!me && m.controllerA.toLowerCase() === me;
  const isB = !!me && m.controllerB?.toLowerCase() === me;
  const side: 0 | 1 | null = isA ? 0 : isB ? 1 : null;
  const myChar = side === 0 ? charA : side === 1 ? charB : undefined;
  const stakingOpen = m.status === "Accepted" && m.stake !== "0" && !!m.stakingCloseAt && Number(m.stakingCloseAt) * 1000 > now;
  const stakingClosed = !!m.stakingCloseAt && Number(m.stakingCloseAt) * 1000 <= now;
  const bothCommitted = m.committedA && m.committedB;
  const revealWindow = m.status === "Accepted" && bothCommitted && stakingClosed;
  const myCommitted = side === 0 ? m.committedA : side === 1 ? m.committedB : false;
  const myRevealed = side === 0 ? m.revealedA : side === 1 ? m.revealedB : false;
  const myBlob = side === 0 ? m.encryptedTacticsA : side === 1 ? m.encryptedTacticsB : null;
  const commitOpen = m.status === "Accepted" && !!m.commitDeadline && Number(m.commitDeadline) * 1000 > now;
  const revealDl = revealDeadline.data ? Number(revealDeadline.data) : null;

  const phase = m.status === "Resolved" ? 4 : m.status === "Challenged" ? 0 : bothCommitted ? 3 : stakingOpen ? 1 : 2;
  const PHASES = ["Challenged", "Staking", "Commit", "Reveal", "Resolved"];

  return (
    <Card pad={false} accent={m.status !== "Resolved"}>
      <CardHead
        eyebrow={`Match #${m.id} · ${m.stake === "0" ? "friendly" : `${tl(m.stake)} per side`} · ${presetName(m.preset)}${m.tournamentId ? ` · tournament #${m.tournamentId}` : ""}`}
        title={
          <>
            <Link href={`/character/?id=${m.idA}`} className="hover:text-[var(--accent)]">
              {charName(names, m.idA)}
            </Link>
            <span className="muted"> vs </span>
            {m.idB ? (
              <Link href={`/character/?id=${m.idB}`} className="hover:text-[var(--accent)]">
                {charName(names, m.idB)}
              </Link>
            ) : (
              <span className="muted">open</span>
            )}
          </>
        }
        actions={
          <Link href="/arena/" className="btn btn-ghost btn-sm">
            All matches
          </Link>
        }
      />
      <CardBody className="flex flex-col gap-5">
        {/* phase strip */}
        <ol className="grid grid-cols-5 gap-1 text-center text-[0.68rem] font-semibold uppercase tracking-wide" aria-label="Match phase">
          {PHASES.map((p, i) => (
            <li key={p} className={`rounded-md border px-1 py-1.5 ${i === phase ? "border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]" : i < phase ? "border-[var(--line)] text-[var(--text)]" : "border-[var(--line)] text-[var(--muted)]"}`} aria-current={i === phase ? "step" : undefined}>
              {p}
            </li>
          ))}
        </ol>

        <div className="grid gap-3 sm:grid-cols-2">
          <SidePanel label="A" ch={charA} id={m.idA} controller={m.controllerA} committed={m.committedA} revealed={m.revealedA} staked={m.totalStakedA} you={isA} />
          <SidePanel label="B" ch={charB} id={m.idB} controller={m.controllerB} committed={m.committedB} revealed={m.revealedB} staked={m.totalStakedB} you={isB} />
        </div>

        <dl className="kv card-sub p-4">
          <dt>Status</dt>
          <dd>{m.outcome ? (MATCH_OUTCOME_LABEL[m.outcome] ?? m.outcome) : m.status === "Challenged" ? "awaiting acceptance" : "in progress"}</dd>
          {m.status === "Challenged" && (
            <>
              <dt>Accept by</dt>
              <dd>{countdown(String(Number(m.createdAt) + CONFIG.acceptWindowSeconds))}</dd>
            </>
          )}
          {m.status === "Accepted" && (
            <>
              <dt>Staking window</dt>
              <dd>{m.stake === "0" ? "none (friendly)" : stakingOpen ? `${countdown(m.stakingCloseAt)} left` : "closed"}</dd>
              <dt>Commit deadline</dt>
              <dd>{countdown(m.commitDeadline)}</dd>
              {bothCommitted && (
                <>
                  <dt>Reveal deadline</dt>
                  <dd>{revealDl ? countdown(revealDl) : "—"}</dd>
                </>
              )}
            </>
          )}
          {m.resolvedAt && (
            <>
              <dt>Resolved</dt>
              <dd>{when(m.resolvedAt)}</dd>
            </>
          )}
        </dl>

        {m.status === "Resolved" && <ResultPanel m={m} />}

        {m.status === "Challenged" && (
          <div className="flex flex-wrap items-start gap-3">
            {isA && <TxButton label="Withdraw challenge" build={() => ({ ...c.matchManager, functionName: "cancel", args: [BigInt(m.id)] })} hint="Refunds your stake as a claim." />}
            {!isA && address && <AcceptBox m={m} mine={mine} />}
            {!address && <Callout tone="info">Connect a wallet to accept this challenge.</Callout>}
            <Poke m={m} revealDeadline={revealDl} />
          </div>
        )}

        {m.status === "Accepted" && (
          <div className="flex flex-col gap-4">
            {stakingOpen && <StakeBox m={m} charA={charA} charB={charB} isSide={side !== null} />}
            {side !== null && !myCommitted && commitOpen && myChar && <CommitBox m={m} side={side} traits={traitsOf(myChar)} />}
            {side !== null && !myCommitted && commitOpen && !myChar && <Callout tone="info">Loading your character's traits…</Callout>}
            {side !== null && myCommitted && !myRevealed && revealWindow && <RevealBox m={m} side={side} blob={myBlob} revealDeadline={revealDl} />}
            {side !== null && myCommitted && !bothCommitted && (
              <Callout tone="info">
                Your tactics are committed. Waiting for the opponent's commit (deadline {countdown(m.commitDeadline)}).
                <RevealBackup m={m} />
              </Callout>
            )}
            {side !== null && bothCommitted && !stakingClosed && <Callout tone="info">Both sides committed. Reveal opens when the staking window closes ({countdown(m.stakingCloseAt)}).</Callout>}
            {side !== null && myRevealed && <Callout tone="good">You revealed. The match resolves as soon as the opponent reveals, or by forfeit after the reveal deadline.</Callout>}
            {side === null && address && <p className="muted text-sm">You are not a side of this match. {stakingOpen ? "You can stake on a side above." : ""}</p>}
            <Poke m={m} revealDeadline={revealDl} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function SidePanel({ label, ch, id, controller, committed, revealed, staked, you }: { label: string; ch?: CharacterRow; id: string | null; controller: string | null; committed: boolean; revealed: boolean; staked: string; you: boolean }) {
  return (
    <div className={`card-sub p-4 text-sm ${you ? "border-[var(--accent-line)]" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="eyebrow">Side {label}</span>
        {you && <Badge tone="accent">you</Badge>}
      </div>
      <div className="mt-2 flex items-center gap-3">
        {ch && <CharacterArt character={ch} size={56} alt="" />}
        <div className="min-w-0">
          <div className="strong truncate font-semibold">{id ? (ch?.name ?? `Character ${id}`) : "open"}</div>
          <div className="muted text-xs">
            {ch ? `rating ${ch.rating}` : ""} {controller ? <>· controller <AddressLink address={controller} /></> : ""}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone={committed ? "good" : "neutral"}>{committed ? "committed" : "not committed"}</Badge>
        <Badge tone={revealed ? "good" : "neutral"}>{revealed ? "revealed" : "not revealed"}</Badge>
        <Badge>staked {units(staked, 2)}</Badge>
      </div>
    </div>
  );
}

function ResultPanel({ m }: { m: MatchRow }) {
  const scoresA = m.scoreA?.split(",") ?? [];
  const scoresB = m.scoreB?.split(",") ?? [];
  const winners = m.winners?.split(",") ?? [];
  return (
    <div className="card-sub p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="strong font-semibold">Result: {MATCH_OUTCOME_LABEL[m.outcome ?? ""] ?? m.outcome}</span>
        {m.roundsA !== null && (
          <Badge tone="accent">
            rounds {m.roundsA} : {m.roundsB}
          </Badge>
        )}
        {m.stakerReward && m.stakerReward !== "0" && <Badge tone="good">staker reward {tl(m.stakerReward, 2)}</Badge>}
      </div>
      {m.roundsA !== null && scoresA.length === 3 && (
        <div className="table-wrap mt-3">
          <table className="table">
            <thead>
              <tr>
                <th>Round</th>
                <th>A stance · energy</th>
                <th className="right">A score</th>
                <th>B stance · energy</th>
                <th className="right">B score</th>
                <th>Winner</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((r) => (
                <tr key={r}>
                  <td className="mono">R{r + 1}</td>
                  <td>
                    {STANCES[Number(m.stancesA?.split(",")[r])] ?? "—"} · {m.energiesA?.split(",")[r] ?? "—"}
                  </td>
                  <td className="right num">{scoresA[r]}</td>
                  <td>
                    {STANCES[Number(m.stancesB?.split(",")[r])] ?? "—"} · {m.energiesB?.split(",")[r] ?? "—"}
                  </td>
                  <td className="right num">{scoresB[r]}</td>
                  <td>{winners[r] === "1" ? "A" : winners[r] === "-1" ? "B" : "draw"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {m.roundsA === null && m.outcome && ["WinA", "WinB"].includes(m.outcome) && <p className="muted mt-2 text-xs">Decided by forfeit: the other side missed a deadline.</p>}
      <div className="mt-3">
        <WithdrawStake matchId={m.id} />
      </div>
    </div>
  );
}

function Poke({ m, revealDeadline }: { m: MatchRow; revealDeadline: number | null }) {
  const c = contracts();
  const now = Date.now() / 1000;
  const bothCommitted = m.committedA && m.committedB;
  const due =
    (m.status === "Challenged" && Number(m.createdAt) + CONFIG.acceptWindowSeconds < now) ||
    (m.status === "Accepted" && !bothCommitted && !!m.commitDeadline && Number(m.commitDeadline) < now) ||
    (m.status === "Accepted" && bothCommitted && !!revealDeadline && revealDeadline < now);
  if (!due) return null;
  return (
    <TxButton label="Deadline passed: apply timeout (poke)" build={() => ({ ...c.matchManager, functionName: "poke", args: [BigInt(m.id)] })} hint="Anyone may call this. Expired challenges refund the stake; a missed commit or reveal is a void (nobody acted) or a forfeit (one side acted)." />
  );
}

function AcceptBox({ m, mine }: { m: MatchRow; mine: CharacterRow[] }) {
  const { address } = useAccount();
  const c = contracts();
  const eligible = (m.open ? mine : mine.filter((x) => x.id === m.idB)).filter((x) => !x.retired);
  const [pick, setPick] = useState("");
  const stakeAmt = BigInt(m.stake);
  const allowance = useReadContract({ ...c.tl, functionName: "allowance", args: address ? [address, c.matchManager.address] : undefined, query: { enabled: !!address } });
  const balance = useReadContract({ ...c.tl, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  if (eligible.length === 0) {
    return (
      <Callout tone="info">{m.open ? "You control no character that could accept this open challenge." : "This challenge is addressed to a character you do not control."}</Callout>
    );
  }
  const chosen = pick || eligible[0]!.id;
  const needsApproval = stakeAmt > 0n && (allowance.data ?? 0n) < stakeAmt;
  const enough = stakeAmt === 0n || balance.data === undefined || balance.data >= stakeAmt;
  return (
    <div className="flex w-full flex-col gap-3">
      <WalletGate what="accept a challenge">
        {m.open && (
          <Field id="accept-with" label="Accept with" help="Your character must have a different controller than the challenger's.">
            <select id="accept-with" className="select" value={chosen} onChange={(e) => setPick(e.target.value)}>
              {eligible.map((x) => (
                <option key={x.id} value={x.id}>
                  #{x.id} {x.name} (rating {x.rating})
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="flex flex-wrap items-start gap-3">
          {stakeAmt > 0n && <TxButton label={needsApproval ? `Approve ${tl(stakeAmt)}` : "Approved"} disabled={!needsApproval} build={() => ({ ...c.tl, functionName: "approve", args: [c.matchManager.address, stakeAmt] })} />}
          <TxButton label="Accept challenge" primary disabled={needsApproval || !enough} hint={!enough ? `You need ${tl(stakeAmt)}.` : undefined} build={() => ({ ...c.matchManager, functionName: "accept", args: [BigInt(m.id), BigInt(chosen)] })} />
        </div>
      </WalletGate>
    </div>
  );
}

function StakeBox({ m, charA, charB, isSide }: { m: MatchRow; charA?: CharacterRow; charB?: CharacterRow; isSide: boolean }) {
  const { address } = useAccount();
  const c = contracts();
  const [side, setSide] = useState<0 | 1>(0);
  const [amount, setAmount] = useState("");
  const ch = side === 0 ? charA : charB;
  const token = ch?.token as `0x${string}` | undefined;
  const amt = parseUnits(amount || "0", 18);
  const bal = useReadContract({ abi: characterTokenAbi, address: token, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!token && !!address } });
  const allowance = useReadContract({ abi: characterTokenAbi, address: token, functionName: "allowance", args: address ? [address, c.vault.address] : undefined, query: { enabled: !!token && !!address } });
  const needsApproval = (allowance.data ?? 0n) < amt;
  const enough = bal.data === undefined || bal.data >= amt;
  return (
    <div className="card-sub p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="h3">Stake on a side</h3>
        <Badge tone="good">no-loss · window closes in {countdown(m.stakingCloseAt)}</Badge>
      </div>
      <p className="muted mt-1 text-xs leading-relaxed">
        Deposit the token of the side you back. After resolution you withdraw exactly what you staked; winning-side stakers additionally share {tl((BigInt(m.stake) * 2n * BigInt(CONFIG.stakerRewardBps)) / 10_000n)} (3 % of the pot, capped at 2 % of the RewardPool's available balance), paid from the RewardPool. Controllers of either side cannot stake.
      </p>
      {isSide ? (
        <Callout tone="info" className="mt-3">
          You control a side of this match, so you cannot stake on it.
        </Callout>
      ) : (
        <WalletGate what="stake">
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field id="stake-side" label="Side">
              <select id="stake-side" className="select" value={side} onChange={(e) => setSide(Number(e.target.value) as 0 | 1)}>
                <option value={0}>A · {charA?.name ?? m.idA}</option>
                <option value={1}>B · {charB?.name ?? m.idB}</option>
              </select>
            </Field>
            <Field id="stake-amount" label={`Amount (${ch?.symbol ?? "tokens"})`} help={`You hold ${bal.data !== undefined ? units(bal.data, 2) : "—"} ${ch?.symbol ?? ""}.`} error={!enough ? "Not enough tokens." : undefined}>
              <div className="input-group">
                <input id="stake-amount" className="input num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
                <span className="input-addon">{ch?.symbol ?? "tokens"}</span>
              </div>
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-start gap-3">
            <TxButton label={needsApproval || amt === 0n ? "Approve" : "Approved"} size="sm" disabled={amt === 0n || !needsApproval || !token} build={() => ({ abi: characterTokenAbi, address: token!, functionName: "approve", args: [c.vault.address, amt] })} />
            <TxButton label="Stake" size="sm" primary disabled={amt === 0n || needsApproval || !enough} build={() => ({ ...c.vault, functionName: "stake", args: [BigInt(m.id), side, amt] })} />
          </div>
        </WalletGate>
      )}
    </div>
  );
}

function WithdrawStake({ matchId }: { matchId: string }) {
  const { address } = useAccount();
  const c = contracts();
  const s0 = useReadContract({ ...c.vault, functionName: "stakes", args: address ? [BigInt(matchId), 0, address] : undefined, query: { enabled: !!address } });
  const s1 = useReadContract({ ...c.vault, functionName: "stakes", args: address ? [BigInt(matchId), 1, address] : undefined, query: { enabled: !!address } });
  const r0 = useReadContract({ ...c.vault, functionName: "pendingReward", args: address ? [BigInt(matchId), 0, address] : undefined, query: { enabled: !!address } });
  const r1 = useReadContract({ ...c.vault, functionName: "pendingReward", args: address ? [BigInt(matchId), 1, address] : undefined, query: { enabled: !!address } });
  const total = (s0.data ?? 0n) + (s1.data ?? 0n);
  const reward = (r0.data ?? 0n) + (r1.data ?? 0n);
  if (!address || total === 0n) return null;
  return (
    <TxButton label={`Withdraw stake (${units(total, 2)} tokens)${reward > 0n ? ` + ${tl(reward, 2)} reward` : ""}`} primary build={() => ({ ...c.vault, functionName: "withdraw", args: [BigInt(matchId)] })} hint="Your full stake comes back whatever the result." />
  );
}

/** Gas limits sent with the two tactic transactions instead of the wallet's estimate: a lagging RPC node has
 *  under-estimated both (the second reveal resolves the match and costs ~430k). Unused gas is refunded. */
const COMMIT_GAS = 250_000n;
const REVEAL_GAS = 700_000n;

function useCommitRecordKey(m: MatchRow): string | null {
  const { address } = useAccount();
  const c = contracts();
  return address ? recordKey(CHAIN_ID, c.matchManager.address, BigInt(m.id), address) : null;
}

/** The saved salt + tactics as copyable text, shown from the commit until the reveal. */
function RevealBackup({ m, intro }: { m: MatchRow; intro?: string }) {
  const key = useCommitRecordKey(m);
  const [copied, setCopied] = useState(false);
  const rec = useMemo(() => (key ? loadRecord(key) : null), [key]);
  if (!rec) return null;
  const text = backupText(rec);
  return (
    <details className="disclosure mt-2 text-xs">
      <summary>Reveal backup{rec.mode === "local" ? " (keep this: your wallet cannot recreate it)" : ""}</summary>
      <p className="muted mt-2 leading-relaxed">
        {intro ?? "Your tactics and salt are saved in this browser. To reveal from another device, keep a copy of this text and paste it there."}
      </p>
      <textarea readOnly className="input mt-2 h-20 w-full font-mono text-[0.68rem]" value={text} onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="btn btn-sm mt-2"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* selection fallback: the textarea selects on focus */
          }
        }}
      >
        {copied ? "Copied" : "Copy backup"}
      </button>
    </details>
  );
}

function CommitBox({ m, side, traits }: { m: MatchRow; side: 0 | 1; traits: Traits }) {
  const { address } = useAccount();
  const c = contracts();
  const { signTypedDataAsync } = useSignTypedData();
  const budget = energyBudget(traits);
  const [stances, setStances] = useState<[Stance, Stance, Stance]>([0, 1, 2]);
  const [energies, setEnergies] = useState<[number, number, number]>([Math.floor(budget / 3), Math.floor(budget / 3), budget - 2 * Math.floor(budget / 3)]);
  const [saved, setSaved] = useState<CommitRecord | null>(null);
  const sum = energies[0] + energies[1] + energies[2];
  const ok = sum === budget && energies.every((e) => e >= 0);

  return (
    <div className="card-sub p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="h3">Your tactics (side {side === 0 ? "A" : "B"})</h3>
        <Badge tone={ok ? "good" : "bad"}>
          energy {sum} / {budget}
        </Badge>
      </div>
      <p className="muted mt-1 text-xs leading-relaxed">
        Pick a stance and an energy for each of the three rounds. Energy must sum to exactly {budget} (5 + Speed / 2{traits.special === 3 ? ", +1 Endurance" : ""}). Attack beats Defense, Defense beats Counter, Counter beats Attack (+8). Your choice stays secret until you reveal.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((r) => (
          <div key={r} className="rounded-lg border border-[var(--line)] p-3">
            <div className="eyebrow mb-2">Round {r + 1}</div>
            <Field id={`stance-${r}`} label="Stance">
              <select id={`stance-${r}`} className="select" value={stances[r]} onChange={(e) => setStances((p) => p.map((s, i) => (i === r ? (Number(e.target.value) as Stance) : s)) as [Stance, Stance, Stance])}>
                {STANCES.map((s, i) => (
                  <option key={s} value={i}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <div className="mt-3">
              <Field id={`energy-${r}`} label="Energy" value={energies[r]}>
                <Range id={`energy-${r}`} min={0} max={budget} value={energies[r]!} onChange={(v) => setEnergies((p) => p.map((x, i) => (i === r ? v : x)) as [number, number, number])} />
              </Field>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <TxButton
          label="Sign and commit tactics"
          primary
          disabled={!ok || !address}
          hint="You sign a message (no gas) to derive the secret salt, then send the commit transaction. Deadline: see above."
          build={async () => {
            const t: Tactics = { stances, energies };
            const matchId = BigInt(m.id);
            const sig = await signTypedDataAsync({
              domain: commitDomain(CHAIN_ID, c.matchManager.address),
              types: COMMIT_TYPES,
              primaryType: "Commit",
              message: { matchId, purpose: "Trenchampionship commit" },
            });
            // A plain 65-byte signature is reproducible, so the salt can be re-derived on any device. Anything else
            // (smart wallets, passkeys) differs on every signature: use a random salt and rely on the local record.
            const reproducible = isReproducibleSignature(sig);
            const salt = reproducible ? saltFromSignature(sig) : randomSalt();
            const secret = reproducible ? sig : salt;
            const rec: CommitRecord = { v: 1, chainId: CHAIN_ID, matchId: m.id, controller: address!, salt, s: stances, e: energies, mode: reproducible ? "sig" : "local" };
            const stored = saveRecord(recordKey(CHAIN_ID, c.matchManager.address, matchId, address!), rec);
            if (!stored && !reproducible) {
              throw new Error("This browser cannot store your tactics and your wallet's signatures are not reproducible, so you could never reveal. Allow site storage or use another wallet.");
            }
            setSaved(rec);
            const blob = await encryptTactics(secret, t);
            return { ...c.matchManager, functionName: "commit", args: [matchId, commitHash(matchId, address!, t, salt), blob], gas: COMMIT_GAS };
          }}
        />
      </div>
      {saved ? (
        <Callout tone={saved.mode === "local" ? "info" : "neutral"} className="mt-3">
          {saved.mode === "local"
            ? "Your wallet signs differently every time, so the salt was generated here and saved in this browser. Reveal from this browser, or keep the backup below to reveal elsewhere."
            : "Your salt and tactics are saved in this browser and can also be recovered on any device by signing the same message again."}
          <RevealBackup m={m} />
        </Callout>
      ) : (
        <p className="muted mt-2 text-xs">The salt and tactics are saved in this browser (with a copyable backup) and, for standard wallets, can also be recovered on any device by signing the same message again.</p>
      )}
    </div>
  );
}

function RevealBox({ m, side, blob, revealDeadline }: { m: MatchRow; side: 0 | 1; blob: string | null; revealDeadline: number | null }) {
  const { address } = useAccount();
  const c = contracts();
  const { signTypedDataAsync } = useSignTypedData();
  const key = useCommitRecordKey(m);
  const [preview, setPreview] = useState<Tactics | null>(null);
  const [pasted, setPasted] = useState("");
  const [version, setVersion] = useState(0); // bumps after a pasted backup is saved
  const local = useMemo(() => (key ? loadRecord(key) : null), [key, version]);
  const onchain = useReadContract({ ...c.matchManager, functionName: "getMatch", args: [BigInt(m.id)] });
  const expectedHash = onchain.data ? (side === 0 ? onchain.data.commitA : onchain.data.commitB) : null;

  const matches = (rec: CommitRecord): boolean => !expectedHash || commitHash(BigInt(m.id), address!, tacticsOfRecord(rec), rec.salt) === expectedHash;

  return (
    <div className="card-sub p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="h3">Reveal</h3>
        <Badge tone="accent">deadline {revealDeadline ? countdown(revealDeadline) : "—"}</Badge>
      </div>
      <p className="muted mt-1 text-xs leading-relaxed">
        {local
          ? "Your tactics were found in this browser. Send the reveal; the second reveal resolves the match on chain. Missing the deadline is a forfeit."
          : "No saved tactics in this browser. Paste the backup you copied at commit time, or (standard wallets only) sign the same message again to recover them. Missing the deadline is a forfeit."}
      </p>
      {local && expectedHash && !matches(local) && (
        <Callout tone="bad" className="mt-2">
          The tactics saved here do not match your on-chain commit (you may have committed from another browser). Paste the right backup below.
        </Callout>
      )}
      {!local && (
        <div className="mt-3">
          <Field id="reveal-backup" label="Backup from commit time">
            <textarea id="reveal-backup" className="input h-20 w-full font-mono text-[0.68rem]" placeholder='{"v":1,"chainId":…}' value={pasted} onChange={(e) => setPasted(e.target.value)} />
          </Field>
        </div>
      )}
      {preview && (
        <p className="mt-2 text-sm">
          Recovered tactics: {preview.stances.map((s) => STANCES[s]).join(", ")} · energy {preview.energies.join(" / ")}
        </p>
      )}
      <div className="mt-3">
        <TxButton
          label={local && matches(local) ? "Reveal" : pasted.trim() ? "Reveal from backup" : "Sign and reveal"}
          primary
          build={async () => {
            const matchId = BigInt(m.id);
            let rec: CommitRecord | null = local && matches(local) ? local : null;
            if (!rec && pasted.trim()) {
              const p = parseBackup(pasted);
              if (p.chainId !== CHAIN_ID || p.matchId !== m.id || p.controller.toLowerCase() !== address!.toLowerCase()) throw new Error("This backup belongs to another match, chain or account.");
              if (!matches(p)) throw new Error("This backup does not match your on-chain commit.");
              if (key) {
                saveRecord(key, p);
                setVersion((v) => v + 1);
              }
              rec = p;
            }
            let t: Tactics;
            let salt: `0x${string}`;
            if (rec) {
              t = tacticsOfRecord(rec);
              salt = rec.salt;
            } else {
              const sig = await signTypedDataAsync({
                domain: commitDomain(CHAIN_ID, c.matchManager.address),
                types: COMMIT_TYPES,
                primaryType: "Commit",
                message: { matchId, purpose: "Trenchampionship commit" },
              });
              if (!isReproducibleSignature(sig)) throw new Error("This wallet signs differently every time, so the salt cannot be recovered from a signature. Reveal from the browser where you committed, or paste your backup.");
              if (!blob) throw new Error("The indexer is unreachable, so the encrypted tactics cannot be loaded. Try again shortly or paste your backup.");
              salt = saltFromSignature(sig);
              try {
                t = await decryptTactics(sig, blob as `0x${string}`);
              } catch {
                throw new Error("Could not decrypt your tactics with this wallet's signature. Paste your backup, or reveal from the browser where you committed.");
              }
              if (expectedHash && commitHash(matchId, address!, t, salt) !== expectedHash) throw new Error("The recovered tactics do not match your on-chain commit. Paste your backup.");
            }
            setPreview(t);
            return { ...c.matchManager, functionName: "reveal", args: [matchId, { stances: t.stances, energies: t.energies }, salt], gas: REVEAL_GAS };
          }}
        />
      </div>
      {local && <RevealBackup m={m} />}
    </div>
  );
}

export const dynamic = "force-static";
