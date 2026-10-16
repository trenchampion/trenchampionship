"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { Card, CardBody, CardHead } from "@/components/Card";
import { Field } from "@/components/Field";
import { TxButton } from "@/components/TxButton";
import { WalletGate } from "@/components/WalletGate";
import { characterTokenAbi, contracts, poolAbi } from "@/lib/contracts";
import { pct, price, tl, units } from "@/lib/format";
import type { CharacterRow } from "@/lib/indexer";

function safeUnits(s: string): bigint {
  try {
    return parseUnits(s || "0", 18);
  } catch {
    return 0n;
  }
}

/**
 * Primary market of a character: its permanent TRCH/token bonding curve. Quotes and balances come
 * from the chain; the indexer row only supplies the addresses and the displayed pool facts.
 * Used on the character page and inside the marketplace rows.
 */
export function CurvePanel({ ch, compact }: { ch: CharacterRow; compact?: boolean }) {
  const { address } = useAccount();
  const c = contracts();
  const pool = ch.pool as `0x${string}`;
  const token = ch.token as `0x${string}`;
  const [buyTl, setBuyTl] = useState("100");
  const [sellTok, setSellTok] = useState("");
  const buyAmount = safeUnits(buyTl);
  const sellAmount = safeUnits(sellTok);
  const quoteBuy = useReadContract({ abi: poolAbi, address: pool, functionName: "quoteBuy", args: [buyAmount] });
  const myTokens = useReadContract({ abi: characterTokenAbi, address: token, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const quoteSell = useReadContract({ abi: poolAbi, address: pool, functionName: "quoteSell", args: [sellAmount], query: { enabled: sellAmount > 0n } });
  const tlAllowance = useReadContract({ ...c.tl, functionName: "allowance", args: address ? [address, pool] : undefined, query: { enabled: !!address } });
  const tlBalance = useReadContract({ ...c.tl, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const tokAllowance = useReadContract({ abi: characterTokenAbi, address: token, functionName: "allowance", args: address ? [address, pool] : undefined, query: { enabled: !!address } });

  const buyNeedsApproval = (tlAllowance.data ?? 0n) < buyAmount;
  const sellNeedsApproval = (tokAllowance.data ?? 0n) < sellAmount;
  const enoughTl = tlBalance.data === undefined || tlBalance.data >= buyAmount;
  const enoughTok = myTokens.data === undefined || myTokens.data >= sellAmount;
  const ids = `curve-${ch.id}`;

  return (
    <Card pad={false}>
      <CardHead title={`Curve · ${ch.symbol} / TRCH`} description="Primary market: a permanent bonding curve. No LP tokens, no withdrawal." />
      <CardBody className="flex flex-col gap-4">
        <dl className="kv">
          <dt>Spot price</dt>
          <dd>{price(ch.spotPrice)} per token</dd>
          <dt>Real TRCH reserve</dt>
          <dd>{tl(ch.realReserve, 2)}</dd>
          {!compact && (
            <>
              <dt>Virtual reserve</dt>
              <dd>{tl(ch.virtualTl)}</dd>
              <dt>Supply</dt>
              <dd>{units(ch.supply)}</dd>
            </>
          )}
          <dt>Trade volume</dt>
          <dd>{tl(ch.tradeVolumeTl)}</dd>
          <dt>Fees per trade</dt>
          <dd>1 % protocol + {pct(ch.creatorFeeBps)} creator</dd>
          {!compact && (
            <>
              <dt>Creator allocation</dt>
              <dd>{ch.creatorAllocBps === 0 ? "none" : `${pct(ch.creatorAllocBps, 0)}, vesting ${Math.round(ch.vestingDuration / 86400)} d`}</dd>
            </>
          )}
        </dl>
        <hr />
        <WalletGate what="trade this token">
          <Field
            id={`${ids}-buy`}
            label="Buy with TRCH"
            help={
              <>
                You receive ≈ <b className="strong">{quoteBuy.data !== undefined ? units(quoteBuy.data, 2) : "—"} {ch.symbol}</b> after fees; 1 % slippage tolerance. Balance: {tl(tlBalance.data, 2)}.
              </>
            }
            error={!enoughTl ? "Not enough TRCH." : undefined}
          >
            <div className="input-group">
              <input id={`${ids}-buy`} className="input num" inputMode="decimal" value={buyTl} onChange={(e) => setBuyTl(e.target.value.replace(/[^\d.]/g, ""))} />
              <span className="input-addon">TRCH</span>
            </div>
          </Field>
          <div className="flex flex-wrap gap-2">
            <TxButton label="Approve TRCH" size="sm" disabled={!buyNeedsApproval || buyAmount === 0n} build={() => ({ ...c.tl, functionName: "approve", args: [pool, buyAmount] })} />
            <TxButton label="Buy" size="sm" primary disabled={buyNeedsApproval || buyAmount === 0n || !enoughTl} build={() => ({ abi: poolAbi, address: pool, functionName: "buy", args: [buyAmount, ((quoteBuy.data ?? 0n) * 99n) / 100n] })} />
          </div>
          <Field
            id={`${ids}-sell`}
            label={`Sell ${ch.symbol}`}
            help={
              <>
                You hold {myTokens.data !== undefined ? units(myTokens.data, 2) : "—"} {ch.symbol}. You receive ≈ <b className="strong">{quoteSell.data !== undefined ? tl(quoteSell.data, 2) : "—"}</b>
                {quoteSell.data === 0n && sellAmount > 0n ? " (the real reserve cannot cover this sale)" : ""}.
              </>
            }
            error={!enoughTok ? "Not enough tokens." : undefined}
          >
            <div className="input-group">
              <input id={`${ids}-sell`} className="input num" inputMode="decimal" value={sellTok} onChange={(e) => setSellTok(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
              <span className="input-addon">{ch.symbol}</span>
            </div>
          </Field>
          <div className="flex flex-wrap gap-2">
            <TxButton label={`Approve ${ch.symbol}`} size="sm" disabled={sellAmount === 0n || !sellNeedsApproval} build={() => ({ abi: characterTokenAbi, address: token, functionName: "approve", args: [pool, sellAmount] })} />
            <TxButton label="Sell" size="sm" disabled={sellAmount === 0n || sellNeedsApproval || !quoteSell.data || !enoughTok} build={() => ({ abi: poolAbi, address: pool, functionName: "sell", args: [sellAmount, ((quoteSell.data ?? 0n) * 99n) / 100n] })} />
          </div>
        </WalletGate>
      </CardBody>
    </Card>
  );
}
