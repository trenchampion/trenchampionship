"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { AddressLink } from "@/components/AddressLink";
import { Badge } from "@/components/Badge";
import { Callout } from "@/components/Callout";
import { Card, CardBody, CardHead } from "@/components/Card";
import { Skeleton } from "@/components/EmptyState";
import { Guide } from "@/components/Guide";
import { IconExternal } from "@/components/Icons";
import { PageHeader } from "@/components/Section";
import { Stat, StatGrid } from "@/components/Stat";
import { Table } from "@/components/Table";
import { addresses, chain, CHAIN_ID, CONFIG, DEX_POOLS, GITHUB_URL, IS_TESTNET, launchUiUrl } from "@/lib/config";
import { contracts } from "@/lib/contracts";
import { eth, pct, tl, when } from "@/lib/format";
import { useProtocolStats, useTreasuryFlows, type TreasuryFlow } from "@/lib/queries";

const CONTRACT_NOTES: Record<string, string> = {
  TLToken: "TRCH ERC-20; supply minted once in the constructor, burn() by holders only.",
  LaunchPool: "ETH / TRCH curve, 1 ETH virtual reserve, no fee, no owner, launch cap for 30 days.",
  CharacterFactory: "Creates characters in one transaction; pausable (create only) by the guardian for 365 days.",
  ControllerNFT: "1/1 controller per character; locked while busy; retire() burns.",
  CreatorVesting: "Linear vesting of creator allocations, one record per character.",
  RewardPool: "Pays only by formula: ≤ 2 % of available per match, 20 % per season.",
  StakingVault: "No-loss staking per match; withdrawals always work; pausable (stake only).",
  Rating: "Elo, seasons, on-chain top-10, season licenses. Never pausable.",
  MatchManager: "Challenge / accept / commit / reveal, escrow, forfeits, claims; pausable (challenge and accept only).",
  Tournament: "Single-elimination brackets 8 / 16, seeding by rating, prizes as claims. Never pausable.",
  AmmFactory: "Opens one TRCH / character-token AMM pair per character; permissionless, immutable, no fee switch, no pause.",
};

export default function TransparencyPage() {
  const a = addresses();
  const c = contracts();
  const stats = useProtocolStats();
  const rpBalance = useReadContract({ ...c.tl, functionName: "balanceOf", args: [a.RewardPool] });
  const rpAvailable = useReadContract({ ...c.rewardPool, functionName: "available" });
  const locked = useReadContract({ ...c.rewardPool, functionName: "lockedSeed" });
  const supply = useReadContract({ ...c.tl, functionName: "totalSupply" });
  const lpReserve = useReadContract({ ...c.launchPool, functionName: "realReserve" });
  const lpTokens = useReadContract({ ...c.launchPool, functionName: "tokenReserve" });
  const capActive = useReadContract({ ...c.launchPool, functionName: "capActive" });
  const capAllowance = useReadContract({ ...c.launchPool, functionName: "capAllowance" });
  const cappedInflow = useReadContract({ ...c.launchPool, functionName: "cappedInflow" });
  const treasuryAddr = useReadContract({ ...c.factory, functionName: "TREASURY" });
  const guardianAddr = useReadContract({ ...c.factory, functionName: "GUARDIAN" });
  const deployTime = useReadContract({ ...c.factory, functionName: "DEPLOY_TIME" });
  const factoryPaused = useReadContract({ ...c.factory, functionName: "isPaused" });
  const mmPaused = useReadContract({ ...c.matchManager, functionName: "isPaused" });
  const vaultPaused = useReadContract({ ...c.vault, functionName: "isPaused" });
  const flows = useTreasuryFlows(20);
  const buyUrl = launchUiUrl(CHAIN_ID, a.LaunchPool);
  const guardianExpiry = deployTime.data ? deployTime.data + BigInt(CONFIG.pauseExpiryDays) * 86_400n : undefined;
  const guardianActive = guardianExpiry !== undefined && Number(guardianExpiry) * 1000 > Date.now();
  const anyPaused = factoryPaused.data || mmPaused.data || vaultPaused.data;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Transparency" title="Everything on chain, in one place" lead={`Treasury flows, RewardPool state, LaunchPool reserves and every contract address on ${chain.name}, read live from the chain and the indexer.`} />

      <Guide
        title="How to verify"
        learnMore="/how-it-works/#security"
        steps={[
          <>Every address below links to the block explorer, where the verified source can be compared with the public repository.</>,
          <>The treasury receives only the shares fixed in <code>Config.sol</code>: {pct(CONFIG.mintTreasuryBps, 0)} of the mint fee, {pct(CONFIG.treasuryTradeBps, 0)} of the 1 % trading fee, {pct(CONFIG.rakeToTreasuryBps, 0)} of the rake.</>,
          <>Nobody can withdraw from the RewardPool; it pays ≤ {pct(CONFIG.stakerRewardPoolCapBps, 0)} of its available balance per match and {pct(CONFIG.seasonPayoutBps, 0)} per season.</>,
        ]}
      />

      <Callout tone="info" title="Official TRCH token and LaunchPool">
        <span className="mono break-all">TRCH {a.TLToken}</span>
        <br />
        <span className="mono break-all">LaunchPool {a.LaunchPool}</span>
        <br />
        {(DEX_POOLS[CHAIN_ID] ?? []).map((p) => (
          <Fragment key={p.address}>
            <span className="mono break-all">
              {p.name}{" "}
              <a href={p.url} target="_blank" rel="noreferrer" className="underline">
                {p.address}
              </a>
            </span>
            <br />
          </Fragment>
        ))}
        <Link href="/token/" className="underline">
          Token page: what TRCH is, supply, how to buy
        </Link>
        . Any other address is a fake.
      </Callout>

      {anyPaused && (
        <Callout tone="bad" title="Guardian pause active">
          {factoryPaused.data && "Character creation is paused. "}
          {mmPaused.data && "Challenges and acceptances are paused. "}
          {vaultPaused.data && "Staking is paused. "}
          Commit, reveal, poke, claims, withdrawals and license withdrawals keep working.
        </Callout>
      )}

      <StatGrid cols={4}>
        <Stat label="TRCH supply" value={tl(supply.data)} loading={supply.isLoading} hint="after burns" />
        <Stat label="Burned so far" value={tl(stats.data?.tlBurned)} loading={stats.isLoading} hint="mint fees and rake" />
        <Stat label="RewardPool balance" value={tl(rpBalance.data)} loading={rpBalance.isLoading} hint={`${tl(locked.data)} seed still locked`} />
        <Stat label="RewardPool available" value={tl(rpAvailable.data)} loading={rpAvailable.isLoading} hint="base for the 2 % / 20 % formulas" />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* ---------------------------------------------------------- launch pool */}
        <Card pad={false}>
          <CardHead
            title="LaunchPool"
            description="Permanent ETH / TRCH curve with a 1 ETH virtual reserve."
            actions={
              <a href={buyUrl} target="_blank" rel="noreferrer" className="btn btn-sm">
                Open LaunchPool UI <IconExternal />
              </a>
            }
          />
          <CardBody className="flex flex-col gap-4 text-sm">
            <dl className="kv">
              <dt>Real ETH reserve</dt>
              <dd>{eth(lpReserve.data)}</dd>
              <dt>TRCH on the curve</dt>
              <dd>{tl(lpTokens.data)}</dd>
              <dt>Launch cap</dt>
              <dd>{capActive.data === undefined ? "—" : capActive.data ? <Badge tone="accent">active (first {CONFIG.lpCapPeriodDays} days)</Badge> : <Badge>expired</Badge>}</dd>
              {capActive.data && (
                <>
                  <dt>Capped inflow used</dt>
                  <dd>
                    {eth(cappedInflow.data)} of {eth(capAllowance.data)}
                  </dd>
                </>
              )}
              <dt>ETH in / out (indexer)</dt>
              <dd>
                {eth(stats.data?.launchEthIn)} / {eth(stats.data?.launchEthOut)}
              </dd>
            </dl>
            <p className="muted text-xs leading-relaxed">
              The {tl(CONFIG.tlToRewardPoolSeed)} RewardPool seed is the only TRCH that never passed through this curve, so it has no ETH backing here. A sale into the LaunchPool reverts if it would exceed the real reserve.
            </p>
          </CardBody>
        </Card>

        {/* ---------------------------------------------------------- treasury */}
        <Card pad={false}>
          <CardHead
            title="Treasury flows"
            description={
              <>
                Address <AddressLink address={treasuryAddr.data} /> · received {tl(stats.data?.tlToTreasury)} in total
              </>
            }
          />
          <Table<TreasuryFlow>
            columns={[
              { key: "when", header: "When", render: (f) => when(f.timestamp) },
              { key: "src", header: "Source", render: (f) => (f.source === "mint" ? "character creation (25 % of the mint fee)" : "character trade (50 % of the 1 % fee)") },
              { key: "amt", header: "Amount", align: "right", render: (f) => <span className="num">{tl(f.amount, 2)}</span> },
            ]}
            rows={flows.data}
            loading={flows.isLoading}
            rowKey={(f) => `${f.timestamp}-${f.amount}-${f.source}`}
            empty={flows.error ? "Indexer unavailable." : "No treasury flow yet."}
          />
        </Card>

        {/* ---------------------------------------------------------- governance */}
        <Card pad={false}>
          <CardHead title="Governance" description="There is no admin. This is the complete list of privileges." />
          <CardBody className="flex flex-col gap-4 text-sm">
            <dl className="kv">
              <dt>Guardian</dt>
              <dd>
                <AddressLink address={guardianAddr.data} />
              </dd>
              <dt>Can pause</dt>
              <dd>create · challenge / accept · stake</dd>
              <dt>Pause power expires</dt>
              <dd>
                {guardianExpiry ? when(guardianExpiry.toString()) : "—"} {guardianExpiry !== undefined && <Badge tone={guardianActive ? "accent" : "neutral"}>{guardianActive ? "active" : "expired"}</Badge>}
              </dd>
              <dt>Treasury</dt>
              <dd>
                <AddressLink address={treasuryAddr.data} />
              </dd>
              <dt>Deployed</dt>
              <dd>{deployTime.data ? when(deployTime.data.toString()) : "—"}</dd>
            </dl>
            <p className="muted text-xs leading-relaxed">
              No upgrades, no proxies, no oracles, no randomness, no minting after deployment. Commit, reveal, timeout, claim, withdraw and license withdrawal can never be paused.{" "}
              <Link href="/how-it-works/#security" className="underline hover:text-[var(--accent)]">
                Security and governance
              </Link>
              .
            </p>
          </CardBody>
        </Card>
      </div>

      {/* ------------------------------------------------------------ contracts (collapsed: for verification, not for reading) */}
      <Card>
        <details className="disclosure">
          <summary>
            <span>
              Contract addresses on {chain.name} <span className="muted text-sm font-normal">· {Object.keys(a).length - 1} contracts, for anyone who wants to verify the source against the chain</span>
            </span>
          </summary>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="muted text-sm">{IS_TESTNET ? `Base Sepolia testnet deployment (chain id ${CHAIN_ID}); tokens have no value.` : `Chain id ${CHAIN_ID}. Every address links to the block explorer.`}</p>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn btn-sm">
              Source on GitHub <IconExternal />
            </a>
          </div>
          <div className="mt-3">
            <Table<[string, string]>
              columns={[
                { key: "name", header: "Contract", render: ([k]) => <span className="strong font-medium">{k}</span> },
                { key: "addr", header: "Address", render: ([, v]) => <AddressLink address={v} full className="text-xs" /> },
                { key: "note", header: "Role", className: "whitespace-normal", render: ([k]) => <span className="muted text-xs">{CONTRACT_NOTES[k]}</span> },
              ]}
              rows={Object.entries(a).filter(([k]) => k !== "chainId") as [string, string][]}
              rowKey={([k]) => k}
            />
          </div>
        </details>
      </Card>
    </div>
  );
}
