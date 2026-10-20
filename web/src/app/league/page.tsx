"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { Badge } from "@/components/Badge";
import { Callout } from "@/components/Callout";
import { Card, CardBody, CardHead } from "@/components/Card";
import { CharacterChip } from "@/components/CharacterArt";
import { Skeleton } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { Guide } from "@/components/Guide";
import { PageHeader } from "@/components/Section";
import { Stat, StatGrid } from "@/components/Stat";
import { Table } from "@/components/Table";
import { TxButton } from "@/components/TxButton";
import { CONFIG } from "@/lib/config";
import { contracts } from "@/lib/contracts";
import { shortError } from "@/lib/errors";
import { countdown, pct, tl, when } from "@/lib/format";
import type { CharacterRow } from "@/lib/indexer";
import { useCharacters, useMyCharacters, useSeasons } from "@/lib/queries";

const SPLIT = CONFIG.seasonSplitBps;

export default function LeaguePage() {
  const c = contracts();
  const { address } = useAccount();
  const season = useReadContract({ ...c.rating, functionName: "currentSeason" });
  const closed = useReadContract({ ...c.rating, functionName: "seasonsClosed" });
  const top = useReadContract({ ...c.rating, functionName: "top", args: season.data !== undefined ? [season.data] : undefined, query: { enabled: season.data !== undefined } });
  const end = useReadContract({ ...c.rating, functionName: "seasonEnd", args: season.data !== undefined ? [season.data] : undefined, query: { enabled: season.data !== undefined } });
  const available = useReadContract({ ...c.rewardPool, functionName: "available" });
  const chars = useCharacters("rating", 100);
  const seasons = useSeasons();
  const mine = useMyCharacters(address);
  const byId = new Map(chars.data?.map((x) => [x.id, x]) ?? []);
  const prize = ((available.data ?? 0n) * BigInt(CONFIG.seasonPayoutBps)) / 10_000n;
  const closable = closed.data !== undefined && season.data !== undefined && closed.data < season.data;
  const [nominateId, setNominateId] = useState("");

  const topRows = (top.data ?? []).map((id, i) => ({ id: id.toString(), place: i }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="League" title="Season standings" lead="Elo ratings move only on rated matches; the on-chain top-10 of eligible, licensed characters shares the season reward when the season closes." />

      <Guide
        learnMore="/how-it-works/#rating"
        steps={[
          <>
            Ratings start at {CONFIG.ratingStart}; staked and tournament matches are rated (K = {CONFIG.eloKEarly} for the first {CONFIG.eloEarlyMatches} rated matches, then {CONFIG.eloKLate}). At most {CONFIG.ratedPerPairPerSeason} matches per pair of characters per season count.
          </>,
          <>
            To compete for the season reward a character needs an active <strong>season license</strong> (a refundable {tl(CONFIG.seasonLicense)} deposit, activated on the character page), at least {CONFIG.seasonMinRatedMatches} rated matches this season while licensed, against at least {CONFIG.seasonMinDistinctOpponents} distinct opponents.
          </>,
          <>
            The top-10 updates on chain after every rated result. If your character qualifies but is missing, anyone can <strong>nominate</strong> it.
          </>,
          <>
            After the {CONFIG.seasonLengthDays}-day season ends, anyone can <strong>close</strong> it: {pct(CONFIG.seasonPayoutBps, 0)} of the RewardPool's available balance is booked to the controllers of the top-10 as claims (collected in the Arena under Claims).
          </>,
        ]}
      />

      <StatGrid cols={4}>
        <Stat label="Season" value={season.data !== undefined ? `#${season.data.toString()}` : "—"} loading={season.isLoading} hint={`${CONFIG.seasonLengthDays} days each, from deployment`} />
        <Stat label="Ends in" value={end.data ? countdown(end.data.toString()) : "—"} loading={end.isLoading} hint={end.data ? when(end.data.toString()) : undefined} />
        <Stat label="Season reward now" value={tl(prize)} loading={available.isLoading} hint={`${pct(CONFIG.seasonPayoutBps, 0)} of ${tl(available.data)} available`} />
        <Stat label="Seasons closed" value={closed.data?.toString() ?? "—"} loading={closed.isLoading} hint={closable ? "a season is ready to close" : "up to date"} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card pad={false}>
            <CardHead title={`Top 10 · season ${season.data?.toString() ?? "—"}`} description="Only licensed characters that meet the activity requirements appear here. Estimated rewards use the current RewardPool balance." />
            {top.error ? (
              <div className="card-pad">
                <Callout tone="bad">Could not read the standings: {shortError(top.error)}</Callout>
              </div>
            ) : (
              <Table<{ id: string; place: number }>
                columns={[
                  { key: "n", header: "#", render: (r) => <span className="rank">{r.place + 1}</span> },
                  {
                    key: "name",
                    header: "Character",
                    render: (r) => {
                      const row = byId.get(r.id);
                      return row ? (
                        <CharacterChip character={row} />
                      ) : (
                        <Link href={`/character/?id=${r.id}`} className="strong font-medium hover:text-[var(--accent)]">
                          Character {r.id}
                        </Link>
                      );
                    },
                  },
                  { key: "rating", header: "Rating", align: "right", render: (r) => <span className="num">{byId.get(r.id)?.rating ?? "—"}</span> },
                  { key: "share", header: "Share", align: "right", render: (r) => <span className="num muted">{pct(SPLIT[r.place] ?? 0, 0)}</span> },
                  { key: "reward", header: "≈ reward", align: "right", render: (r) => <span className="num">{tl((prize * BigInt(SPLIT[r.place] ?? 0)) / 10_000n)}</span> },
                  {
                    key: "act",
                    header: "",
                    align: "right",
                    render: (r) => (
                      <Link href={`/arena/?opponent=${r.id}`} className="btn btn-sm whitespace-nowrap">
                        Challenge
                      </Link>
                    ),
                  },
                ]}
                rows={topRows}
                loading={top.isLoading}
                rowKey={(r) => r.id}
                empty="No character meets the requirements this season yet."
              />
            )}
            <CardBody className="flex flex-col gap-4 border-t border-[var(--line)]">
              {closable && (
                <Callout tone="info" title={`Season ${closed.data?.toString()} has ended`} action={<TxButton label={`Close season ${closed.data?.toString()} and book rewards`} primary build={() => ({ ...c.rating, functionName: "closeSeason" })} />}>
                  Anyone can close it. Seasons close in order; the reward is {pct(CONFIG.seasonPayoutBps, 0)} of the RewardPool's available balance at the moment of closing.
                </Callout>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <Field id="nominate" label="Nominate a character" help="Re-evaluates the character's place in the current top-10. Useful when it became eligible without playing since. Anyone may call." className="max-w-xs flex-1">
                  <input id="nominate" className="input num" inputMode="numeric" value={nominateId} onChange={(e) => setNominateId(e.target.value.replace(/\D/g, ""))} placeholder="character id" />
                </Field>
                <TxButton label="Nominate" disabled={!nominateId} build={() => ({ ...c.rating, functionName: "nominate", args: [BigInt(nominateId)] })} />
              </div>
            </CardBody>
          </Card>

          <Card pad={false}>
            <CardHead title="Past seasons" />
            <CardBody>
              {seasons.isLoading && <Skeleton lines={2} />}
              {seasons.error && <p className="muted text-sm">Indexer unavailable.</p>}
              {seasons.data && seasons.data.filter((s) => s.closed).length === 0 && <p className="muted text-sm">No season has been closed yet.</p>}
              <ul className="flex flex-col divide-y divide-[var(--line)] text-sm">
                {seasons.data
                  ?.filter((s) => s.closed)
                  .map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <span>
                        <span className="strong font-medium">Season {s.id}</span> <span className="muted">· closed {when(s.closedAt)}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge tone="accent">{tl(s.prize)}</Badge>
                        <span className="muted text-xs">
                          top:{" "}
                          {s.top
                            ?.split(",")
                            .filter(Boolean)
                            .slice(0, 3)
                            .map((id) => byId.get(id)?.name ?? `#${id}`)
                            .join(", ") || "—"}
                        </span>
                      </span>
                    </li>
                  ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card pad={false}>
            <CardHead title="Your characters" description="Progress toward season eligibility." />
            <CardBody className="text-sm">
              {!address && <p className="muted">Connect a wallet to see your characters.</p>}
              {address && mine.isLoading && <Skeleton lines={2} />}
              {address && mine.data && mine.data.length === 0 && (
                <p className="muted">
                  You control no character.{" "}
                  <Link href="/create/" className="underline hover:text-[var(--accent)]">
                    Create one
                  </Link>
                  .
                </p>
              )}
              {address && mine.data && mine.data.length > 0 && season.data !== undefined && <Eligibility ids={mine.data} season={season.data} />}
            </CardBody>
          </Card>

          <Card pad={false}>
            <CardHead title="Rules in short" />
            <CardBody>
              <ul className="prose list-disc pl-5 text-sm">
                <li>Elo, start {CONFIG.ratingStart}; K = {CONFIG.eloKEarly} for the first {CONFIG.eloEarlyMatches} rated matches, then {CONFIG.eloKLate}. Forfeits count as losses; draws and voids do not move ratings.</li>
                <li>Only staked matches and tournament matches are rated; at most {CONFIG.ratedPerPairPerSeason} per pair of characters per season.</li>
                <li>
                  Seasons last {CONFIG.seasonLengthDays} days; at each boundary ratings are squeezed toward {CONFIG.ratingStart} (× {CONFIG.eloSqueezeBps / 10_000}).
                </li>
                <li>
                  Season reward: {pct(CONFIG.seasonPayoutBps, 0)} of the RewardPool's available balance, split {SPLIT.map((b) => b / 100).join(" / ")} % over the top-10.
                </li>
                <li>The season license ({tl(CONFIG.seasonLicense)}) is a refundable deposit: returned in full whenever the controller withdraws it; it never yields and never enters any payout.</li>
              </ul>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Eligibility({ ids, season }: { ids: CharacterRow[]; season: bigint }) {
  const c = contracts();
  const reads = useReadContracts({
    contracts: ids.flatMap((x) => [
      { ...c.rating, functionName: "seasonRatedMatches", args: [season, BigInt(x.id)] } as const,
      { ...c.rating, functionName: "seasonDistinctOpponents", args: [season, BigInt(x.id)] } as const,
    ]),
  });
  return (
    <ul className="flex flex-col divide-y divide-[var(--line)]">
      {ids.map((x, i) => {
        const rated = Number((reads.data?.[2 * i]?.result as bigint | undefined) ?? 0n);
        const distinct = Number((reads.data?.[2 * i + 1]?.result as bigint | undefined) ?? 0n);
        const ok = x.licensed && rated >= CONFIG.seasonMinRatedMatches && distinct >= CONFIG.seasonMinDistinctOpponents;
        return (
          <li key={x.id} className="py-2.5">
            <div className="flex items-center justify-between gap-2">
              <CharacterChip character={x} size={28} />
              {ok ? <Badge tone="good">eligible</Badge> : x.licensed ? <Badge tone="accent">licensed</Badge> : <Badge>no license</Badge>}
            </div>
            <div className="muted mt-1 text-xs">
              {reads.isLoading ? "…" : `${rated} / ${CONFIG.seasonMinRatedMatches} rated matches · ${distinct} / ${CONFIG.seasonMinDistinctOpponents} distinct opponents`}
              {!x.licensed && " · counters start once licensed"}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
