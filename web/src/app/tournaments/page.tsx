"use client";

import Link from "next/link";
import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { AddressLink } from "@/components/AddressLink";
import { Badge } from "@/components/Badge";
import { Callout } from "@/components/Callout";
import { Card, CardBody, CardHead } from "@/components/Card";
import { EmptyState, Skeleton } from "@/components/EmptyState";
import { Field, Range } from "@/components/Field";
import { Guide } from "@/components/Guide";
import { PageHeader } from "@/components/Section";
import { TxButton } from "@/components/TxButton";
import { WalletGate } from "@/components/WalletGate";
import { CONFIG } from "@/lib/config";
import { contracts } from "@/lib/contracts";
import { shortError } from "@/lib/errors";
import { countdown, pct, tl } from "@/lib/format";
import type { CharacterRow, TournamentRow } from "@/lib/indexer";
import { CharacterArt } from "@/components/CharacterArt";
import { useCharacters, useMyCharacters, useTournaments } from "@/lib/queries";

const STATUS_TONE: Record<string, "accent" | "good" | "neutral" | "bad"> = { Open: "accent", Running: "good", Finished: "neutral", Cancelled: "bad" };

export default function TournamentsPage() {
  const { address } = useAccount();
  const list = useTournaments();
  const mine = useMyCharacters(address);
  const chars = useCharacters("rating", 500);
  const names = new Map(chars.data?.map((x) => [x.id, x]) ?? []);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Tournaments" title="Single-elimination brackets" lead="Anyone can organise a bracket of 8 or 16 characters. Seeding is by rating, every round is a Tournament-preset match, and prizes are booked as claims when the final is decided." />

      <Guide
        learnMore="/how-it-works/#tournaments"
        steps={[
          <>
            <strong>Organise</strong>: choose the size (8 or 16), the entry per character ({tl(CONFIG.stakeMin)} – {tl(CONFIG.stakeMax)}) and your organiser fee (0 – {pct(CONFIG.tournamentOrganizerFeeMaxBps, 0)}).
          </>,
          <>
            <strong>Register</strong> one character per controller; the entry is escrowed and refundable until the bracket starts. Registration stays open 72 h; an unfilled bracket can then be cancelled by anyone.
          </>,
          <>
            <strong>Start</strong> (anyone) once full: characters are seeded by rating (ties: lower id), 1 vs 16, 2 vs 15… Each round is a 12 h-window match in the Arena. <strong>Advance</strong> when all matches of a round are resolved.
          </>,
          <>
            Prizes after the {pct(CONFIG.tournamentRakeBps, 0)} rake and the organiser fee: {pct(CONFIG.tournamentPrizeWinnerBps, 0)} winner, {pct(CONFIG.tournamentPrizeFinalistBps, 0)} finalist, {pct(CONFIG.tournamentPrizeSemiBps, 1)} each semi-finalist, collected under Claims.
          </>,
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          {list.isLoading && <Skeleton lines={5} />}
          {list.error && <Callout tone="bad">Indexer unavailable: {shortError(list.error)}</Callout>}
          {list.data && list.data.length === 0 && (
            <EmptyState title="No tournament yet">Open the first bracket with the form on the right.</EmptyState>
          )}
          {list.data?.map((t) => <TournamentCard key={t.id} t={t} mine={mine.data ?? []} names={names} />)}
        </div>
        <aside className="flex flex-col gap-6">
          <CreateTournament />
          <TournamentClaims />
        </aside>
      </div>
    </div>
  );
}

function CreateTournament() {
  const c = contracts();
  const [size, setSize] = useState(8);
  const [entry, setEntry] = useState("500");
  const [fee, setFee] = useState(0);
  const entryWei = parseUnits(entry || "0", 18);
  const entryOk = entryWei >= CONFIG.stakeMin && entryWei <= CONFIG.stakeMax;
  const pot = entryWei * BigInt(size);
  const rake = (pot * BigInt(CONFIG.tournamentRakeBps)) / 10_000n;
  const feeAmt = (pot * BigInt(fee)) / 10_000n;
  const prizePool = pot - rake - feeAmt;
  return (
    <Card pad={false}>
      <CardHead eyebrow="Organise" title="Open a bracket" description="Creating costs only gas; entries are paid by the registering controllers." />
      <CardBody className="flex flex-col gap-4">
        <Field id="t-size" label="Size" help="8 characters = 3 rounds; 16 characters = 4 rounds.">
          <select id="t-size" className="select" value={size} onChange={(e) => setSize(Number(e.target.value))}>
            <option value={8}>8 characters</option>
            <option value={16}>16 characters</option>
          </select>
        </Field>
        <Field id="t-entry" label="Entry per character" help={`${tl(CONFIG.stakeMin)} – ${tl(CONFIG.stakeMax)}. Escrowed in the Tournament contract until the bracket finishes or cancels.`} error={!entryOk ? "Out of bounds." : undefined}>
          <div className="input-group">
            <input id="t-entry" className="input num" inputMode="decimal" value={entry} aria-invalid={!entryOk} onChange={(e) => setEntry(e.target.value.replace(/[^\d.]/g, ""))} />
            <span className="input-addon">TRCH</span>
          </div>
        </Field>
        <Field id="t-fee" label="Organiser fee" value={pct(fee)} help="0 – 2 % of the pot, booked to you as a claim when the bracket finishes.">
          <Range id="t-fee" min={0} max={CONFIG.tournamentOrganizerFeeMaxBps} step={25} value={fee} onChange={setFee} />
        </Field>
        <dl className="kv card-sub p-4">
          <dt>Pot (entry × size)</dt>
          <dd>{tl(pot)}</dd>
          <dt>Rake 5 % (3 % RewardPool, 2 % burn)</dt>
          <dd>{tl(rake)}</dd>
          <dt>Organiser fee</dt>
          <dd>{tl(feeAmt)}</dd>
          <dt className="strong">Prize pool</dt>
          <dd className="gold">{tl(prizePool)}</dd>
          <dt>Winner / finalist / semi-finalists</dt>
          <dd>
            {tl((prizePool * BigInt(CONFIG.tournamentPrizeWinnerBps)) / 10_000n)} / {tl((prizePool * BigInt(CONFIG.tournamentPrizeFinalistBps)) / 10_000n)} / {tl((prizePool * BigInt(CONFIG.tournamentPrizeSemiBps)) / 10_000n)} each
          </dd>
        </dl>
        <WalletGate what="open a tournament">
          <TxButton label="Open bracket" primary disabled={!entryOk} build={() => ({ ...c.tournament, functionName: "create", args: [size, entryWei, fee] })} hint="Registration window: 72 h. Draws in a round are replayed once; a second draw or a void is decided by rating, then lower id." />
        </WalletGate>
      </CardBody>
    </Card>
  );
}

function TournamentClaims() {
  const { address } = useAccount();
  const c = contracts();
  const claimable = useReadContract({ ...c.tournament, functionName: "claimable", args: address ? [address] : undefined, query: { enabled: !!address } });
  if (!address) return null;
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="stat-label">Tournament claims</div>
          <div className="strong num text-lg font-semibold">{tl(claimable.data, 2)}</div>
          <div className="muted text-xs">prizes, refunds and organiser fees booked to you</div>
        </div>
        <TxButton label="Claim" size="sm" disabled={!claimable.data} build={() => ({ ...c.tournament, functionName: "claim" })} />
      </div>
    </Card>
  );
}

function TournamentCard({ t, mine, names }: { t: TournamentRow; mine: CharacterRow[]; names: Map<string, CharacterRow> }) {
  const { address } = useAccount();
  const c = contracts();
  const players = t.players ? t.players.split(",").filter(Boolean) : [];
  const matches = t.roundMatches ? t.roundMatches.split(",").filter(Boolean) : [];
  const myIds = new Set(mine.map((m) => m.id));
  const registeredMine = players.find((p) => myIds.has(p));
  const eligible = mine.filter((m) => !m.retired);
  const [pick, setPick] = useState("");
  const chosen = pick || eligible[0]?.id || "";
  const entry = BigInt(t.entry);
  const allowance = useReadContract({ ...c.tl, functionName: "allowance", args: address ? [address, c.tournament.address] : undefined, query: { enabled: !!address } });
  const balance = useReadContract({ ...c.tl, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const full = players.length >= t.size;
  const windowEnd = Number(t.createdAt) + CONFIG.tournamentRegistrationWindowSeconds;
  const windowOpen = Date.now() / 1000 <= windowEnd;
  const needsApproval = (allowance.data ?? 0n) < entry;
  const enough = balance.data === undefined || balance.data >= entry;
  const rounds = t.size === 16 ? 4 : 3;
  const pot = entry * BigInt(t.size);

  return (
    <Card pad={false}>
      <CardHead
        eyebrow={`Tournament #${t.id}`}
        title={
          <>
            {t.size} characters · {tl(t.entry)} entry <Badge tone={STATUS_TONE[t.status] ?? "neutral"} className="ml-2 align-middle">{t.status}</Badge>
          </>
        }
        description={
          <>
            organiser <AddressLink address={t.organizer} /> · fee {pct(t.organizerFeeBps)} · pot {tl(pot)}
          </>
        }
        actions={
          t.status === "Open" ? (
            <Badge tone={windowOpen ? "accent" : "bad"}>{windowOpen ? `registration ${countdown(String(windowEnd))}` : "registration window over"}</Badge>
          ) : t.status === "Running" ? (
            <Badge tone="good">
              round {t.round} of {rounds}
            </Badge>
          ) : null
        }
      />
      <CardBody className="flex flex-col gap-4 text-sm">
        <div>
          <div className="field-label">
            <span>
              {t.status === "Open" ? "Registered" : "Players (seeded order)"} {players.length} / {t.size}
            </span>
          </div>
          {players.length === 0 ? (
            <p className="muted text-xs">Nobody has registered yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {players.map((p, i) => (
                <Link key={p} href={`/character/?id=${p}`} className="badge hover:border-[var(--accent-line)] hover:text-[var(--accent)]">
                  {names.get(p) && <CharacterArt character={names.get(p)!} size={18} alt="" />}
                  {t.status !== "Open" && <span className="muted">{i + 1}.</span>} {names.get(p)?.name ?? `#${p}`}
                  {p === t.winner && <span className="gold">winner</span>}
                  {p === t.finalist && <span className="muted">finalist</span>}
                </Link>
              ))}
            </div>
          )}
        </div>
        {matches.length > 0 && (
          <div>
            <div className="field-label">
              <span>Matches of round {t.round}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matches.map((m) => (
                <Link key={m} href={`/arena/?match=${m}`} className="badge mono hover:border-[var(--accent-line)] hover:text-[var(--accent)]">
                  {m === "0" ? "decided by tiebreak" : `match #${m}`}
                </Link>
              ))}
            </div>
          </div>
        )}
        {t.status === "Finished" && (
          <Callout tone="good" title="Finished">
            Winner {names.get(t.winner ?? "")?.name ?? `#${t.winner}`}, finalist {names.get(t.finalist ?? "")?.name ?? `#${t.finalist}`}. Prize pool {tl(t.prizePool)} booked as claims to the controllers.
          </Callout>
        )}
        {t.status === "Cancelled" && <Callout>Cancelled: the bracket did not fill in time. Entries were refunded as claims.</Callout>}

        {(t.status === "Open" || t.status === "Running") && (
          <WalletGate what="take part">
            <div className="flex flex-wrap items-end gap-3">
              {t.status === "Open" && !registeredMine && !full && eligible.length > 0 && (
                <>
                  <Field id={`reg-${t.id}`} label="Register a character" help="One character per controller. The entry is escrowed and refundable until the bracket starts." className="min-w-[14rem] flex-1">
                    <select id={`reg-${t.id}`} className="select" value={chosen} onChange={(e) => setPick(e.target.value)}>
                      {eligible.map((m) => (
                        <option key={m.id} value={m.id}>
                          #{m.id} {m.name} (rating {m.rating})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <TxButton label={needsApproval ? `Approve ${tl(entry)}` : "Approved"} disabled={!needsApproval} build={() => ({ ...c.tl, functionName: "approve", args: [c.tournament.address, entry] })} />
                  <TxButton label="Register" primary disabled={needsApproval || !enough || !chosen} hint={!enough ? `You need ${tl(entry)}.` : undefined} build={() => ({ ...c.tournament, functionName: "register", args: [BigInt(t.id), BigInt(chosen)] })} />
                </>
              )}
              {t.status === "Open" && !registeredMine && !full && eligible.length === 0 && <p className="muted text-xs">You control no character that could register.</p>}
              {t.status === "Open" && registeredMine && <TxButton label="Unregister (refund entry as a claim)" build={() => ({ ...c.tournament, functionName: "unregister", args: [BigInt(t.id), BigInt(registeredMine)] })} />}
              {t.status === "Open" && full && <TxButton label="Start the bracket" primary build={() => ({ ...c.tournament, functionName: "start", args: [BigInt(t.id)] })} hint="Anyone may start a full bracket. Seeding by rating happens on chain." />}
              {t.status === "Open" && !full && !windowOpen && <TxButton label="Cancel (did not fill)" build={() => ({ ...c.tournament, functionName: "cancel", args: [BigInt(t.id)] })} hint="Refunds every entry as a claim." />}
              {t.status === "Running" && <TxButton label="Advance to the next round" primary build={() => ({ ...c.tournament, functionName: "advance", args: [BigInt(t.id)] })} hint="Works once every match of the current round is resolved. Drawn pairings are replayed once." />}
            </div>
          </WalletGate>
        )}
      </CardBody>
    </Card>
  );
}
