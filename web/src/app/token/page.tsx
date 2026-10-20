"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useReadContract, useWalletClient } from "wagmi";
import { Badge } from "@/components/Badge";
import { Callout } from "@/components/Callout";
import { Card, CardBody, CardHead } from "@/components/Card";
import { Guide } from "@/components/Guide";
import { IconExternal } from "@/components/Icons";
import { PageHeader } from "@/components/Section";
import { Stat, StatGrid } from "@/components/Stat";
import { addresses, CHAIN_ID, chain, CONFIG, DEX_POOLS, GITHUB_URL, IS_TESTNET, launchUiUrl } from "@/lib/config";
import { contracts } from "@/lib/contracts";
import { dateOnly, eth, pct, tl } from "@/lib/format";
import { useFounderBuy, useProtocolStats } from "@/lib/queries";

const BLOCKSCOUT: Record<number, string> = { 8453: "https://base.blockscout.com", 84532: "https://base-sepolia.blockscout.com" };
const BASESCAN: Record<number, string> = { 8453: "https://basescan.org", 84532: "https://sepolia.basescan.org" };

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard blocked: the address is selectable */
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

function AddToWallet({ token }: { token: `0x${string}` }) {
  const { isConnected } = useAccount();
  const { data: wallet } = useWalletClient();
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  if (!isConnected || !wallet) return <span className="muted text-xs">Connect a wallet (top right) to add TRCH with one click.</span>;
  return (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      onClick={async () => {
        try {
          const ok = await wallet.watchAsset({ type: "ERC20", options: { address: token, symbol: "TRCH", decimals: 18 } });
          setState(ok ? "ok" : "err");
        } catch {
          setState("err");
        }
      }}
    >
      {state === "ok" ? "Added to wallet" : state === "err" ? "Wallet declined, add it manually" : "Add TRCH to wallet"}
    </button>
  );
}

function ethPerTl(spot: bigint | undefined): string {
  if (spot === undefined) return "—";
  const n = Number(formatUnits(spot, 18));
  return `${n.toLocaleString("en-US", { maximumSignificantDigits: 4 })} ETH`;
}

export default function TokenPage() {
  const a = addresses();
  const c = contracts();
  const token = a.TLToken;
  const buyUrl = launchUiUrl(CHAIN_ID, a.LaunchPool);
  const blockscout = BLOCKSCOUT[CHAIN_ID];
  const basescan = BASESCAN[CHAIN_ID];
  const dexPools = DEX_POOLS[CHAIN_ID] ?? [];

  const supply = useReadContract({ ...c.tl, functionName: "totalSupply" });
  const onCurve = useReadContract({ ...c.launchPool, functionName: "tokenReserve" });
  const rpBalance = useReadContract({ ...c.tl, functionName: "balanceOf", args: [a.RewardPool] });
  const locked = useReadContract({ ...c.rewardPool, functionName: "lockedSeed" });
  const spot = useReadContract({ ...c.launchPool, functionName: "spotPrice" });
  const reserve = useReadContract({ ...c.launchPool, functionName: "realReserve" });
  const capActive = useReadContract({ ...c.launchPool, functionName: "capActive" });
  const capAllowance = useReadContract({ ...c.launchPool, functionName: "capAllowance" });
  const cappedInflow = useReadContract({ ...c.launchPool, functionName: "cappedInflow" });
  const stats = useProtocolStats();
  const founder = useFounderBuy();

  const circulating = supply.data !== undefined && onCurve.data !== undefined && rpBalance.data !== undefined ? supply.data - onCurve.data - rpBalance.data : undefined;
  const burned = supply.data !== undefined ? CONFIG.tlSupply - supply.data : undefined;
  const capLeft = capAllowance.data !== undefined && cappedInflow.data !== undefined ? (capAllowance.data > cappedInflow.data ? capAllowance.data - cappedInflow.data : 0n) : undefined;
  const founderShare = founder.data ? pct(Number((BigInt(founder.data.tlAmount) * 10_000n) / CONFIG.tlSupply), 1) : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="TRCH"
        title="The league's token, officially"
        lead={`Everything about TRCH in one place: the only official contract on ${chain.name}, what the token is for, how much exists, where it sits and how it is bought and sold. Read live from the chain.`}
        actions={
          <a href={buyUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
            Get TRCH <IconExternal />
          </a>
        }
      />

      {/* ---------------------------------------------------------------- official contract */}
      <Card accent>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">Official TRCH contract · {chain.name} (chain id {CHAIN_ID})</span>
            {IS_TESTNET && <Badge tone="accent">testnet, no value</Badge>}
          </div>
          <code className="mono break-all text-base sm:text-lg" aria-label="TRCH contract address">
            {token}
          </code>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton text={token} label="Copy address" />
            <AddToWallet token={token} />
            {blockscout && (
              <a href={`${blockscout}/token/${token}`} target="_blank" rel="noreferrer" className="btn btn-sm">
                Blockscout <IconExternal />
              </a>
            )}
            {basescan && (
              <a href={`${basescan}/token/${token}`} target="_blank" rel="noreferrer" className="btn btn-sm">
                Basescan <IconExternal />
              </a>
            )}
            {dexPools.map((p) => (
              <a key={p.address} href={p.url} target="_blank" rel="noreferrer" className="btn btn-sm">
                Uniswap pool <IconExternal />
              </a>
            ))}
          </div>
          <dl className="spec text-sm">
            <dt>Name / symbol</dt>
            <dd>Trenchampionship / TRCH</dd>
            <dt>Decimals</dt>
            <dd>18</dd>
            <dt>Standard</dt>
            <dd>ERC-20 (OpenZeppelin), burnable by holders only, no mint function after the constructor</dd>
            {dexPools.map((p) => (
              <Fragment key={p.address}>
                <dt>DEX pool</dt>
                <dd>
                  {p.name}: <span className="mono break-all">{p.address}</span>. A small external pool so that price trackers can
                  see TRCH; the LaunchPool curve below is the primary market and has far deeper liquidity.
                </dd>
              </Fragment>
            ))}
            <dt>LaunchPool (where TRCH is bought and sold)</dt>
            <dd className="mono break-all">{a.LaunchPool}</dd>
          </dl>
        </div>
      </Card>

      <Callout tone="bad" title="There is exactly one TRCH">
        This address is the only official TRCH token and the LaunchPool above is its only primary market. There is no presale, no airdrop, no claim site, no team wallet selling and no one who will message you about any of these. Any other token called TRCH or Trenchampionship, and any address sent in a DM or a reply, is a fake. Verify the address here or in the public repository, never from a post.
      </Callout>

      {/* ---------------------------------------------------------------- live numbers */}
      <StatGrid cols={4}>
        <Stat label="Price on the curve" value={ethPerTl(spot.data)} loading={spot.isLoading} hint="ETH per TRCH, right now" />
        <Stat label="ETH in the reserve" value={eth(reserve.data)} loading={reserve.isLoading} hint="real ETH backing sales" />
        <Stat label="In circulation" value={tl(circulating)} loading={supply.isLoading || onCurve.isLoading || rpBalance.isLoading} hint="outside the curve and the RewardPool" />
        <Stat label="Burned" value={tl(burned)} loading={supply.isLoading} hint="gone forever" />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------------------------------------------------------------- what it is for */}
        <Card pad={false}>
          <CardHead title="What TRCH is for" description="The in-game utility token of the league. Every payment in TRENCHAMPIONSHIP is made in it." />
          <CardBody className="flex flex-col gap-3 text-sm leading-relaxed">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Creating a character</strong> costs {tl(CONFIG.mintFee)}: {pct(CONFIG.mintBurnBps, 0)} burned, {pct(CONFIG.mintRewardPoolBps, 0)} to the RewardPool, {pct(CONFIG.mintTreasuryBps, 0)} to the treasury.
              </li>
              <li>
                <strong>Match stakes</strong> ({tl(CONFIG.stakeMin)} to {tl(CONFIG.stakeMax)} per side) and <strong>tournament entries</strong>; the winner's controller takes the pot minus a {pct(CONFIG.rakeBps, 0)} rake ({pct(CONFIG.rakeToRewardPoolBps, 0)} RewardPool, {pct(CONFIG.rakeToBurnBps, 0)} burned).
              </li>
              <li>
                <strong>Season license</strong>: a refundable deposit of {tl(CONFIG.seasonLicense)} that makes a character eligible for the top 10.
              </li>
              <li>
                <strong>Quote currency</strong> of every character market: character tokens are bought and sold against TRCH on their curves and AMM pools.
              </li>
              <li>
                <strong>Staker rewards</strong> and <strong>season rewards</strong> are paid in TRCH from the RewardPool, by fixed formulas.
              </li>
            </ul>
            <p className="muted text-xs leading-relaxed">
              What TRCH is not: it carries no governance, no revenue share, no yield and no promise of anything. It is a game token; its only uses are the ones above.{" "}
              <Link href="/disclaimer/" className="underline">
                Disclaimer
              </Link>
              .
            </p>
          </CardBody>
        </Card>

        {/* ---------------------------------------------------------------- supply */}
        <Card pad={false}>
          <CardHead title="Supply and distribution" description="Minted once, in the token's constructor. Nobody can mint more; burns only shrink it." />
          <CardBody className="flex flex-col gap-3 text-sm">
            <dl className="spec">
              <dt>Total minted</dt>
              <dd>{tl(CONFIG.tlSupply)}</dd>
              <dt>Current supply</dt>
              <dd>{tl(supply.data)}</dd>
              <dt>Put on the LaunchPool curve at deploy</dt>
              <dd>
                {tl(CONFIG.tlToLaunchPool)} ({pct(9000, 0)})
              </dd>
              <dt>Still on the curve</dt>
              <dd>{tl(onCurve.data)}</dd>
              <dt>RewardPool seed</dt>
              <dd>
                {tl(CONFIG.tlToRewardPoolSeed)} ({pct(1000, 0)}), released linearly over {CONFIG.seedReleaseDays} days; {tl(locked.data)} still locked
              </dd>
              <dt>Founder</dt>
              <dd>
                {founder.data ? (
                  <>
                    bought {tl(BigInt(founder.data.tlAmount))} ({founderShare}) for {eth(BigInt(founder.data.ethAmount))} inside the LaunchPool constructor on {dateOnly(founder.data.timestamp)}, on the same curve as everyone else (event <code>FounderBuy</code>)
                  </>
                ) : founder.isLoading ? (
                  "…"
                ) : (
                  <>bought {pct(2000, 0)} on the curve inside the LaunchPool constructor (event <code>FounderBuy</code>)</>
                )}
              </dd>
              <dt>Team, presale, airdrop</dt>
              <dd>none; every other TRCH entered circulation through a purchase on the curve or through play</dd>
            </dl>
            <p className="muted text-xs leading-relaxed">
              Burns so far: {tl(burned)} ({tl(stats.data?.tlBurned)} recorded by the indexer). The RewardPool pays at most {pct(CONFIG.stakerRewardPoolCapBps, 0)} of its available balance per match and {pct(CONFIG.seasonPayoutBps, 0)} per season; nobody can withdraw from it otherwise.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* ---------------------------------------------------------------- how to buy */}
      <Card pad={false}>
        <CardHead
          title="How to buy and sell"
          description="The LaunchPool is a permanent constant-product curve between ETH and TRCH with a 1 ETH virtual reserve. No fee, no owner, no pause, no migration."
          actions={
            <a href={buyUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary">
              Open the LaunchPool <IconExternal />
            </a>
          }
        />
        <CardBody className="grid gap-8 text-sm lg:grid-cols-[1.25fr_1fr]">
          <div className="flex flex-col gap-2 leading-relaxed">
            <p>
              <strong>Buying.</strong> Send ETH on {chain.name}, receive TRCH at the curve price; the more that has been bought, the higher the price. For the first {CONFIG.lpCapPeriodDays} days after deployment the curve accepts at most {eth(CONFIG.lpCapRatePerDayEth, 0)} of net inflow per elapsed day (unused allowance carries over) and {eth(CONFIG.lpMaxBuyPerTxEth, 1)} per purchase: a brake against a rush, not a sale.
            </p>
            <p>
              <strong>Selling.</strong> Send TRCH back, receive ETH from the real reserve at the curve price, any time, never capped. A sale reverts only if it would ask for more ETH than the reserve holds, which can happen only with TRCH that never came through the curve (the RewardPool seed).
            </p>
            <p className="muted text-xs">
              The interface at &quot;Get TRCH&quot; is a separate open-source page anyone can host; it talks to the LaunchPool contract above and nothing else. A secondary DEX market may exist; the curve remains the primary and permanent one.
            </p>
          </div>
          <dl className="spec self-start">
            <dt>Launch cap</dt>
            <dd>{capActive.data === undefined ? "—" : capActive.data ? <Badge tone="accent">active</Badge> : <Badge>expired</Badge>}</dd>
            {capActive.data && (
              <>
                <dt>Room left under the cap now</dt>
                <dd>{eth(capLeft)}</dd>
                <dt>Max per purchase</dt>
                <dd>{eth(CONFIG.lpMaxBuyPerTxEth, 1)}</dd>
              </>
            )}
            <dt>Fee</dt>
            <dd>0</dd>
            <dt>Virtual reserve</dt>
            <dd>{eth(CONFIG.lpVirtualEth, 0)} (a number the curve pretends to hold; nobody deposits or withdraws it)</dd>
            <dt>ETH in / out so far</dt>
            <dd>
              {eth(stats.data?.launchEthIn)} / {eth(stats.data?.launchEthOut)}
            </dd>
          </dl>
        </CardBody>
      </Card>

      <Guide
        title="Before you buy"
        learnMore="/how-it-works/#trch"
        steps={[
          <>Check that your wallet is on {chain.name} and that the token address matches the one at the top of this page.</>,
          <>TRCH is for playing. Its price on the curve moves with every purchase and sale, in both directions, and can go to zero.</>,
          <>
            The contracts are immutable and verified; the code is public at{" "}
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="underline">
              GitHub
            </a>
            . Every address is listed on{" "}
            <Link href="/transparency/" className="underline">
              Transparency
            </Link>
            .
          </>,
        ]}
        note="Entertainment only. No one associated with the league gives financial advice or will ever contact you about buying or selling."
      />
    </div>
  );
}

export const dynamic = "force-static";
