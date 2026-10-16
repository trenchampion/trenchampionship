"use client";

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { Callout } from "@/components/Callout";
import { Card, CardBody, CardHead } from "@/components/Card";
import { Skeleton } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { TxButton } from "@/components/TxButton";
import { WalletGate } from "@/components/WalletGate";
import { CONFIG } from "@/lib/config";
import { ammPairAbi, characterTokenAbi, contracts } from "@/lib/contracts";
import { pct, price, tl, units } from "@/lib/format";

const ZERO = "0x0000000000000000000000000000000000000000";
const SLIPPAGE_BPS = 100n; // 1 % on every quote, like the curve card

function safeUnits(s: string): bigint {
  try {
    return parseUnits(s || "0", 18);
  } catch {
    return 0n;
  }
}

function minOut(quote: bigint | undefined): bigint {
  return ((quote ?? 0n) * (10_000n - SLIPPAGE_BPS)) / 10_000n;
}

/**
 * Secondary market of a character: its TL/token AmmPair (WP11). Live state comes from the chain so
 * trading works without the indexer; history lives on the marketplace page. Hidden on deployments
 * without an AmmFactory.
 */
export function AmmPanel({ characterId, token, symbol }: { characterId: string; token: `0x${string}`; symbol: string }) {
  const c = contracts();
  const factoryAddr = c.amm.address;
  const pairRead = useReadContract({ abi: c.amm.abi, address: factoryAddr, functionName: "pairOfCharacter", args: [BigInt(characterId)], query: { enabled: !!factoryAddr } });
  if (!factoryAddr) return null;
  const pair = pairRead.data && pairRead.data !== ZERO ? pairRead.data : undefined;
  return (
    <Card pad={false}>
      <CardHead title={`AMM pool · ${symbol} / TRCH`} description="Secondary market: a constant-product pool with LP shares, open to anyone. The curve stays the primary market and the liquidity guarantee." />
      <CardBody className="flex flex-col gap-4">
        {pairRead.isLoading ? <Skeleton lines={3} /> : pair ? <PairPanel pair={pair} token={token} symbol={symbol} /> : <CreatePair token={token} symbol={symbol} />}
      </CardBody>
    </Card>
  );
}

function CreatePair({ token, symbol }: { token: `0x${string}`; symbol: string }) {
  const c = contracts();
  return (
    <>
      <p className="muted text-sm leading-relaxed">
        Nobody has opened an AMM pool for {symbol} yet. Anyone can create it (one per character, no fee); the first deposit then sets its price. Swaps pay {pct(CONFIG.ammLpFeeBps)} to the liquidity providers and {pct(CONFIG.ammProtocolFeeBps)} in TRCH to the protocol ({pct(CONFIG.treasuryAmmBps, 0)} treasury, the rest RewardPool).
      </p>
      <WalletGate what="create the pool">
        <TxButton label={`Create the ${symbol} / TRCH pool`} size="sm" build={() => ({ ...c.amm, address: c.amm.address!, functionName: "createPair", args: [token] })} hint="Deploys the pair contract; you pay only gas." />
      </WalletGate>
    </>
  );
}

type Tab = "swap" | "add" | "remove";

function PairPanel({ pair, token, symbol }: { pair: `0x${string}`; token: `0x${string}`; symbol: string }) {
  const c = contracts();
  const { address } = useAccount();
  const [tab, setTab] = useState<Tab>("swap");

  const reserves = useReadContract({ abi: ammPairAbi, address: pair, functionName: "getReserves" });
  const supply = useReadContract({ abi: ammPairAbi, address: pair, functionName: "totalSupply" });
  const spot = useReadContract({ abi: ammPairAbi, address: pair, functionName: "spotPrice" });
  const lpBalance = useReadContract({ abi: ammPairAbi, address: pair, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const tlBalance = useReadContract({ ...c.tl, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const tokBalance = useReadContract({ abi: characterTokenAbi, address: token, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const tlAllowance = useReadContract({ ...c.tl, functionName: "allowance", args: address ? [address, pair] : undefined, query: { enabled: !!address } });
  const tokAllowance = useReadContract({ abi: characterTokenAbi, address: token, functionName: "allowance", args: address ? [address, pair] : undefined, query: { enabled: !!address } });

  const [rTl, rTok] = reserves.data ?? [0n, 0n];
  const empty = rTl === 0n || rTok === 0n;
  const lpShareBps = supply.data && supply.data > 0n && lpBalance.data ? (lpBalance.data * 10_000n) / supply.data : 0n;

  return (
    <>
      <dl className="kv">
        <dt>Reserves</dt>
        <dd>
          {tl(rTl, 2)} · {units(rTok, 2)} {symbol}
        </dd>
        <dt>Pool price</dt>
        <dd>{empty ? "— (empty pool)" : `${price(spot.data)} per token`}</dd>
        <dt>LP shares</dt>
        <dd>
          {units(supply.data, 4)} total{address ? ` · yours ${units(lpBalance.data, 4)} (${pct(Number(lpShareBps))})` : ""}
        </dd>
        <dt>Fees per swap</dt>
        <dd>
          {pct(CONFIG.ammLpFeeBps)} to LPs + {pct(CONFIG.ammProtocolFeeBps)} protocol, in TRCH
        </dd>
      </dl>
      <hr />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Pool actions">
        {(
          [
            ["swap", "Swap"],
            ["add", "Add liquidity"],
            ["remove", "Remove liquidity"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={`btn btn-sm ${tab === k ? "btn-primary" : ""}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      <WalletGate what="use the pool">
        {tab === "swap" && <SwapBox pair={pair} token={token} symbol={symbol} empty={empty} tlBalance={tlBalance.data} tokBalance={tokBalance.data} tlAllowance={tlAllowance.data} tokAllowance={tokAllowance.data} />}
        {tab === "add" && <AddBox pair={pair} token={token} symbol={symbol} rTl={rTl} rTok={rTok} empty={empty} tlBalance={tlBalance.data} tokBalance={tokBalance.data} tlAllowance={tlAllowance.data} tokAllowance={tokAllowance.data} />}
        {tab === "remove" && <RemoveBox pair={pair} symbol={symbol} rTl={rTl} rTok={rTok} supply={supply.data} lpBalance={lpBalance.data} />}
      </WalletGate>
    </>
  );
}

type Balances = { tlBalance?: bigint; tokBalance?: bigint; tlAllowance?: bigint; tokAllowance?: bigint };

function SwapBox({ pair, token, symbol, empty, tlBalance, tokBalance, tlAllowance, tokAllowance }: { pair: `0x${string}`; token: `0x${string}`; symbol: string; empty: boolean } & Balances) {
  const c = contracts();
  const { address } = useAccount();
  const [buy, setBuy] = useState(true);
  const [amount, setAmount] = useState("100");
  const wei = safeUnits(amount);
  const quoteBuy = useReadContract({ abi: ammPairAbi, address: pair, functionName: "quoteTlForToken", args: [wei], query: { enabled: buy && wei > 0n } });
  const quoteSell = useReadContract({ abi: ammPairAbi, address: pair, functionName: "quoteTokenForTl", args: [wei], query: { enabled: !buy && wei > 0n } });
  const quote = buy ? quoteBuy.data : quoteSell.data;
  const balance = buy ? tlBalance : tokBalance;
  const allowance = buy ? tlAllowance : tokAllowance;
  const enough = balance === undefined || balance >= wei;
  const needsApproval = (allowance ?? 0n) < wei;
  if (empty) return <Callout tone="info">The pool is empty. Add liquidity first; the first deposit sets the price.</Callout>;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`btn btn-sm ${buy ? "btn-primary" : ""}`} onClick={() => setBuy(true)}>
          Buy {symbol} with TRCH
        </button>
        <button type="button" className={`btn btn-sm ${!buy ? "btn-primary" : ""}`} onClick={() => setBuy(false)}>
          Sell {symbol} for TRCH
        </button>
      </div>
      <Field
        id="amm-amount"
        label={buy ? "You pay" : "You sell"}
        help={
          <>
            You receive ≈ <b className="strong">{buy ? `${units(quote, 2)} ${symbol}` : tl(quote, 2)}</b> after fees; 1 % slippage tolerance. Balance: {buy ? tl(tlBalance, 2) : `${units(tokBalance, 2)} ${symbol}`}.
          </>
        }
        error={!enough ? `Not enough ${buy ? "TRCH" : symbol}.` : undefined}
      >
        <div className="input-group">
          <input id="amm-amount" className="input num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
          <span className="input-addon">{buy ? "TRCH" : symbol}</span>
        </div>
      </Field>
      <div className="flex flex-wrap gap-2">
        {buy ? (
          <TxButton label="Approve TRCH" size="sm" disabled={!needsApproval || wei === 0n} build={() => ({ ...c.tl, functionName: "approve", args: [pair, wei] })} />
        ) : (
          <TxButton label={`Approve ${symbol}`} size="sm" disabled={!needsApproval || wei === 0n} build={() => ({ abi: characterTokenAbi, address: token, functionName: "approve", args: [pair, wei] })} />
        )}
        <TxButton
          label={buy ? "Buy on the pool" : "Sell on the pool"}
          size="sm"
          primary
          disabled={needsApproval || wei === 0n || !enough || !quote}
          build={() =>
            buy
              ? { abi: ammPairAbi, address: pair, functionName: "swapTlForToken", args: [wei, minOut(quote), address!] }
              : { abi: ammPairAbi, address: pair, functionName: "swapTokenForTl", args: [wei, minOut(quote), address!] }
          }
        />
      </div>
    </div>
  );
}

function AddBox({ pair, token, symbol, rTl, rTok, empty, tlBalance, tokBalance, tlAllowance, tokAllowance }: { pair: `0x${string}`; token: `0x${string}`; symbol: string; rTl: bigint; rTok: bigint; empty: boolean } & Balances) {
  const c = contracts();
  const { address } = useAccount();
  const [tlIn, setTlIn] = useState("1000");
  const [tokIn, setTokIn] = useState("");
  const tlWei = safeUnits(tlIn);
  const tokWei = safeUnits(tokIn);
  const quote = useReadContract({ abi: ammPairAbi, address: pair, functionName: "quoteLiquidity", args: [tlWei, tokWei], query: { enabled: tlWei > 0n && tokWei > 0n } });
  const enoughTl = tlBalance === undefined || tlBalance >= tlWei;
  const enoughTok = tokBalance === undefined || tokBalance >= tokWei;
  const tlApproval = (tlAllowance ?? 0n) < tlWei;
  const tokApproval = (tokAllowance ?? 0n) < tokWei;

  const onTl = (v: string) => {
    const s = v.replace(/[^\d.]/g, "");
    setTlIn(s);
    if (!empty) setTokIn(formatUnits((safeUnits(s) * rTok) / rTl, 18));
  };
  const onTok = (v: string) => {
    const s = v.replace(/[^\d.]/g, "");
    setTokIn(s);
    if (!empty) setTlIn(formatUnits((safeUnits(s) * rTl) / rTok, 18));
  };

  return (
    <div className="flex flex-col gap-4">
      {empty && (
        <Callout tone="info" title="First deposit">
          You set the opening price: the pool starts at the ratio you deposit. {CONFIG.ammMinimumLiquidity.toString()} wei of LP shares stay locked forever (Uniswap v2 rule).
        </Callout>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="amm-add-tl" label="TRCH" help={`Balance ${tl(tlBalance, 2)}.`} error={!enoughTl ? "Not enough TRCH." : undefined}>
          <div className="input-group">
            <input id="amm-add-tl" className="input num" inputMode="decimal" value={tlIn} onChange={(e) => onTl(e.target.value)} />
            <span className="input-addon">TRCH</span>
          </div>
        </Field>
        <Field id="amm-add-tok" label={symbol} help={empty ? `Balance ${units(tokBalance, 2)} ${symbol}.` : `Matched to the pool ratio. Balance ${units(tokBalance, 2)} ${symbol}.`} error={!enoughTok ? `Not enough ${symbol}.` : undefined}>
          <div className="input-group">
            <input id="amm-add-tok" className="input num" inputMode="decimal" value={tokIn} onChange={(e) => onTok(e.target.value)} placeholder="0" />
            <span className="input-addon">{symbol}</span>
          </div>
        </Field>
      </div>
      <p className="muted text-xs">
        You receive ≈ <b className="strong">{units(quote.data, 4)} LP shares</b>. Shares redeem a pro-rata part of both reserves at any time; they are plain ERC-20 tokens.
      </p>
      <div className="flex flex-wrap gap-2">
        <TxButton label="Approve TRCH" size="sm" disabled={!tlApproval || tlWei === 0n} build={() => ({ ...c.tl, functionName: "approve", args: [pair, tlWei] })} />
        <TxButton label={`Approve ${symbol}`} size="sm" disabled={!tokApproval || tokWei === 0n} build={() => ({ abi: characterTokenAbi, address: token, functionName: "approve", args: [pair, tokWei] })} />
        <TxButton
          label="Add liquidity"
          size="sm"
          primary
          disabled={tlApproval || tokApproval || tlWei === 0n || tokWei === 0n || !enoughTl || !enoughTok || !quote.data}
          build={() => ({ abi: ammPairAbi, address: pair, functionName: "addLiquidity", args: [tlWei, tokWei, minOut(tlWei), minOut(tokWei), address!] })}
        />
      </div>
    </div>
  );
}

function RemoveBox({ pair, symbol, rTl, rTok, supply, lpBalance }: { pair: `0x${string}`; symbol: string; rTl: bigint; rTok: bigint; supply?: bigint; lpBalance?: bigint }) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const wei = safeUnits(amount);
  const s = supply ?? 0n;
  const tlOut = s > 0n ? (wei * rTl) / s : 0n;
  const tokOut = s > 0n ? (wei * rTok) / s : 0n;
  const enough = lpBalance === undefined || lpBalance >= wei;
  return (
    <div className="flex flex-col gap-4">
      <Field
        id="amm-remove"
        label="LP shares to redeem"
        help={
          <>
            You hold {units(lpBalance, 4)} shares. You receive ≈ <b className="strong">{tl(tlOut, 2)}</b> and <b className="strong">{units(tokOut, 2)} {symbol}</b> (1 % slippage tolerance). No approval needed: the pair burns its own shares.
          </>
        }
        error={!enough ? "Not enough LP shares." : undefined}
      >
        <div className="input-group">
          <input id="amm-remove" className="input num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
          <span className="input-addon">LP</span>
          <button type="button" className="btn btn-sm" onClick={() => setAmount(formatUnits(lpBalance ?? 0n, 18))} disabled={!lpBalance}>
            Max
          </button>
        </div>
      </Field>
      <div className="flex flex-wrap gap-2">
        <TxButton label="Remove liquidity" size="sm" primary disabled={wei === 0n || !enough || tlOut === 0n || tokOut === 0n} build={() => ({ abi: ammPairAbi, address: pair, functionName: "removeLiquidity", args: [wei, minOut(tlOut), minOut(tokOut), address!] })} />
      </div>
    </div>
  );
}
