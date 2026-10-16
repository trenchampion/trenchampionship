"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { AddressLink } from "@/components/AddressLink";
import { AmmPanel } from "@/components/AmmPanel";
import { Badge } from "@/components/Badge";
import { Card, CardBody, CardHead } from "@/components/Card";
import { CharacterArt, CharacterChip } from "@/components/CharacterArt";
import { CurvePanel } from "@/components/CurvePanel";
import { ElementBadge } from "@/components/ElementBadge";
import { EmptyState, Skeleton } from "@/components/EmptyState";
import { Guide } from "@/components/Guide";
import { PageHeader } from "@/components/Section";
import { Stat, StatGrid } from "@/components/Stat";
import { Table } from "@/components/Table";
import { WalletGate } from "@/components/WalletGate";
import { ammPairAbi, characterTokenAbi, contracts } from "@/lib/contracts";
import { num, price, short, tl, units, when } from "@/lib/format";
import type { CharacterRow } from "@/lib/indexer";
import { useAmmPairs, useCharacters, useTrades, type AmmPairRow, type TradeRow } from "@/lib/queries";

const E18 = 10n ** 18n;
type Sort = "newest" | "rating" | "name";

/** AMM spot price in TRCH per token scaled by 1e18, from the indexed reserves; 0 for an empty pool. */
function ammPrice(p: AmmPairRow | undefined): bigint {
  if (!p) return 0n;
  const rTl = BigInt(p.reserveTl);
  const rTok = BigInt(p.reserveToken);
  return rTok === 0n ? 0n : (rTl * E18) / rTok;
}

export default function MarketplacePage() {
  const { address } = useAccount();
  const c = contracts();
  const chars = useCharacters("id", 1000);
  const pairs = useAmmPairs();
  const trades = useTrades(40);
  const [sort, setSort] = useState<Sort>("newest");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const tlBalance = useReadContract({ ...c.tl, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });

  const pairByChar = useMemo(() => new Map((pairs.data ?? []).map((p) => [p.characterId, p])), [pairs.data]);
  const byId = useMemo(() => new Map((chars.data ?? []).map((ch) => [ch.id, ch])), [chars.data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (chars.data ?? []).filter((ch) => !q || ch.name.toLowerCase().includes(q) || ch.symbol.toLowerCase().includes(q) || ch.id === q);
    // sorted by age, rating or name; never by price (no leaderboards by token price)
    if (sort === "rating") list.sort((a, b) => b.rating - a.rating || Number(b.id) - Number(a.id));
    else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => Number(b.id) - Number(a.id));
    return list;
  }, [chars.data, query, sort]);

  const totals = useMemo(() => {
    let curveReserve = 0n;
    let volume = 0n;
    for (const ch of chars.data ?? []) {
      curveReserve += BigInt(ch.realReserve);
      volume += BigInt(ch.tradeVolumeTl);
    }
    let ammReserve = 0n;
    for (const p of pairs.data ?? []) {
      ammReserve += BigInt(p.reserveTl);
      volume += BigInt(p.volumeTl);
    }
    return { curveReserve, ammReserve, volume };
  }, [chars.data, pairs.data]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Marketplace" title="Every character, priced in TRCH" lead="Each character is an ERC-20 with a permanent bonding curve and, optionally, an AMM pool. Prices are quotes of those two markets, read from the chain and the indexer; nothing here is a recommendation." />

      <Guide
        learnMore="/how-it-works/#markets"
        steps={[
          <>
            The <strong>curve</strong> is a character's primary market: permanent liquidity, 1 % protocol fee plus the creator's fee. The <strong>AMM pool</strong> is optional and funded by anyone; 0.30 % of each swap goes to its liquidity providers.
          </>,
          <>Open a row to trade on either market without leaving the page, or open the character for its full profile, matches and controller actions.</>,
          <>Your portfolio lists the character tokens and LP shares the connected wallet holds, valued at the current curve quote; the history shows the latest trades on both venues.</>,
        ]}
        note="Characters are listed by age, rating or name, never by price. Token holders have no claim on prizes and receive no yield."
      />

      <StatGrid cols={4}>
        <Stat label="Characters" value={chars.data ? num(chars.data.length) : "—"} loading={chars.isLoading} hint="each one a token with a market" />
        <Stat label="TRCH on curves" value={tl(totals.curveReserve)} loading={chars.isLoading} hint="real reserves, permanent" />
        <Stat label="AMM pools" value={pairs.data ? num(pairs.data.length) : "—"} loading={pairs.isLoading} hint={`${tl(totals.ammReserve)} on the TRCH side`} />
        <Stat label="Trade volume" value={tl(totals.volume)} loading={chars.isLoading || pairs.isLoading} hint="curves and pools, all time" />
      </StatGrid>

      {/* ------------------------------------------------------------ portfolio */}
      <Card pad={false}>
        <CardHead title="Your portfolio" description="Character tokens and LP shares held by the connected wallet, valued at the current curve quote." />
        <CardBody>
          <WalletGate what="see your portfolio">{address && chars.data && <Portfolio address={address} chars={chars.data} pairs={pairs.data ?? []} tlBalance={tlBalance.data} />}</WalletGate>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------------ all characters */}
      <Card pad={false}>
        <CardHead
          title="All characters"
          description="Curve and pool prices in TRCH per token. Open a row to trade."
          actions={
            <>
              <input className="input" style={{ width: 180 }} placeholder="Search name, ticker or id" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search characters" />
              <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort characters">
                <option value="newest">Newest first</option>
                <option value="rating">By rating</option>
                <option value="name">By name</option>
              </select>
            </>
          }
        />
        {chars.error ? (
          <div className="card-pad">
            <p className="muted text-sm">Indexer unavailable; trading still works from each character's page once it loads.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Character</th>
                  <th scope="col" className="right">
                    Curve price
                  </th>
                  <th scope="col" className="right">
                    Pool price
                  </th>
                  <th scope="col" className="right">
                    Liquidity (TRCH)
                  </th>
                  <th scope="col" className="right">
                    Volume
                  </th>
                  <th scope="col" className="right">
                    Rating
                  </th>
                  <th scope="col" className="right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {chars.isLoading &&
                  [0, 1, 2].map((i) => (
                    <tr key={`s${i}`}>
                      {[0, 1, 2, 3, 4, 5, 6].map((j) => (
                        <td key={j}>
                          <div className="skeleton w-20" />
                        </td>
                      ))}
                    </tr>
                  ))}
                {!chars.isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted py-6 text-center text-sm">
                      {query ? "No character matches the search." : "No characters yet. Be the first to create one."}
                    </td>
                  </tr>
                )}
                {rows.map((ch) => {
                  const pair = pairByChar.get(ch.id);
                  const open = openId === ch.id;
                  return (
                    <MarketRow key={ch.id} ch={ch} pair={pair} open={open} onToggle={() => setOpenId(open ? null : ch.id)} />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------ history */}
      <Card pad={false}>
        <CardHead title="Recent trades" description="Buys and sells on curves and AMM pools, newest first." />
        <TradeTable rows={trades.data} loading={trades.isLoading} error={trades.error} byId={byId} />
      </Card>
    </div>
  );
}

function MarketRow({ ch, pair, open, onToggle }: { ch: CharacterRow; pair?: AmmPairRow; open: boolean; onToggle: () => void }) {
  const pool = ammPrice(pair);
  const liquidity = BigInt(ch.realReserve) + BigInt(pair?.reserveTl ?? "0");
  const volume = BigInt(ch.tradeVolumeTl) + BigInt(pair?.volumeTl ?? "0");
  return (
    <>
      <tr>
        <td>
          <CharacterChip character={ch}>
            <span className="mono muted text-xs">{ch.symbol}</span>
            <ElementBadge element={ch.element} />
            {ch.retired && <Badge tone="bad">retired</Badge>}
          </CharacterChip>
        </td>
        <td className="right num">{price(ch.spotPrice)}</td>
        <td className="right num">{pair ? (pool > 0n ? price(pool) : <span className="muted">empty pool</span>) : <span className="muted">no pool</span>}</td>
        <td className="right num">
          {units(liquidity, 0)}
          <span className="muted text-xs"> ({units(ch.realReserve, 0)} curve)</span>
        </td>
        <td className="right num">{tl(volume)}</td>
        <td className="right num muted">{ch.rating}</td>
        <td className="right">
          <span className="inline-flex gap-1.5">
            <button type="button" className={`btn btn-sm ${open ? "btn-primary" : ""}`} onClick={onToggle} aria-expanded={open}>
              {open ? "Close" : "Trade"}
            </button>
            <Link href={`/character/?id=${ch.id}`} className="btn btn-ghost btn-sm">
              Open
            </Link>
          </span>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="bg-[var(--bg-elev)]" style={{ whiteSpace: "normal" }}>
            <div className="grid gap-4 py-2 lg:grid-cols-2">
              <CurvePanel ch={ch} compact />
              <AmmPanel characterId={ch.id} token={ch.token as `0x${string}`} symbol={ch.symbol} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Portfolio({ address, chars, pairs, tlBalance }: { address: `0x${string}`; chars: CharacterRow[]; pairs: AmmPairRow[]; tlBalance?: bigint }) {
  const tokenReads = useReadContracts({
    contracts: chars.map((ch) => ({ abi: characterTokenAbi, address: ch.token as `0x${string}`, functionName: "balanceOf", args: [address] }) as const),
    query: { enabled: chars.length > 0 },
  });
  const lpReads = useReadContracts({
    contracts: pairs.map((p) => ({ abi: ammPairAbi, address: p.id as `0x${string}`, functionName: "balanceOf", args: [address] }) as const),
    query: { enabled: pairs.length > 0 },
  });
  const pairByChar = new Map(pairs.map((p, i) => [p.characterId, { p, i }]));

  type Holding = { ch: CharacterRow; tokens: bigint; value: bigint; lp: bigint; lpTl: bigint; lpTokens: bigint };
  const holdings: Holding[] = [];
  let totalValue = 0n;
  chars.forEach((ch, i) => {
    const tokens = (tokenReads.data?.[i]?.result as bigint | undefined) ?? 0n;
    const entry = pairByChar.get(ch.id);
    const lp = entry ? ((lpReads.data?.[entry.i]?.result as bigint | undefined) ?? 0n) : 0n;
    if (tokens === 0n && lp === 0n) return;
    const spot = BigInt(ch.spotPrice);
    const value = (tokens * spot) / E18;
    let lpTl = 0n;
    let lpTokens = 0n;
    if (entry && lp > 0n) {
      const supply = BigInt(entry.p.lpSupply);
      if (supply > 0n) {
        lpTl = (lp * BigInt(entry.p.reserveTl)) / supply;
        lpTokens = (lp * BigInt(entry.p.reserveToken)) / supply;
      }
    }
    totalValue += value + lpTl + (lpTokens * spot) / E18;
    holdings.push({ ch, tokens, value, lp, lpTl, lpTokens });
  });
  const loading = tokenReads.isLoading || (pairs.length > 0 && lpReads.isLoading);

  return (
    <div className="flex flex-col gap-4">
      <StatGrid cols={3}>
        <Stat label="TRCH balance" value={tl(tlBalance, 2)} hint={short(address)} />
        <Stat label="Positions" value={loading ? "…" : num(holdings.length)} hint="characters held or provided liquidity for" />
        <Stat label="Value at curve quotes" value={loading ? "…" : tl(totalValue, 2)} hint="tokens plus the underlying of LP shares; not a sale price" />
      </StatGrid>
      {loading && <Skeleton lines={2} />}
      {!loading && holdings.length === 0 && (
        <EmptyState compact title="No character tokens or LP shares in this wallet" action={<Link href="/create/" className="btn btn-sm">Create a character</Link>}>
          Buy a token on a curve below, or provide liquidity to a pool.
        </EmptyState>
      )}
      {!loading && holdings.length > 0 && (
        <Table<Holding>
          columns={[
            { key: "ch", header: "Character", render: (h) => <CharacterChip character={h.ch} size={28} /> },
            { key: "tokens", header: "Tokens", align: "right", render: (h) => <span className="num">{units(h.tokens, 2)} {h.ch.symbol}</span> },
            { key: "value", header: "≈ TRCH", align: "right", render: (h) => <span className="num">{units(h.value, 2)}</span> },
            {
              key: "lp",
              header: "LP shares",
              align: "right",
              render: (h) => (h.lp === 0n ? <span className="muted">—</span> : <span className="num">{units(h.lp, 4)}</span>),
            },
            {
              key: "lpv",
              header: "LP underlying",
              align: "right",
              render: (h) =>
                h.lp === 0n ? (
                  <span className="muted">—</span>
                ) : (
                  <span className="num">
                    {units(h.lpTl, 2)} TRCH + {units(h.lpTokens, 2)} {h.ch.symbol}
                  </span>
                ),
            },
          ]}
          rows={holdings}
          rowKey={(h) => h.ch.id}
        />
      )}
    </div>
  );
}

function TradeTable({ rows, loading, error, byId }: { rows?: TradeRow[]; loading: boolean; error: Error | null; byId: Map<string, CharacterRow> }) {
  if (error) {
    return (
      <div className="card-pad">
        <p className="muted text-sm">Indexer unavailable.</p>
      </div>
    );
  }
  return (
    <Table<TradeRow>
      columns={[
        { key: "when", header: "When", render: (t) => <span className="muted text-xs">{when(t.timestamp)}</span> },
        {
          key: "ch",
          header: "Character",
          render: (t) => {
            const ch = byId.get(t.characterId);
            return ch ? (
              <span className="inline-flex items-center gap-2">
                <CharacterArt character={ch} size={24} alt="" />
                <Link href={`/character/?id=${ch.id}`} className="strong hover:text-[var(--accent)]">
                  {ch.name}
                </Link>
              </span>
            ) : (
              <Link href={`/character/?id=${t.characterId}`} className="strong hover:text-[var(--accent)]">
                Character {t.characterId}
              </Link>
            );
          },
        },
        { key: "venue", header: "Venue", render: (t) => <Badge>{t.venue === "amm" ? "AMM pool" : "Curve"}</Badge> },
        { key: "side", header: "Side", render: (t) => <Badge tone={t.isBuy ? "good" : "neutral"}>{t.isBuy ? "Buy" : "Sell"}</Badge> },
        { key: "tl", header: "TRCH", align: "right", render: (t) => <span className="num">{units(t.tlAmount, 2)}</span> },
        {
          key: "tok",
          header: "Tokens",
          align: "right",
          render: (t) => (
            <span className="num">
              {units(t.tokenAmount, 2)} {byId.get(t.characterId)?.symbol ?? ""}
            </span>
          ),
        },
        { key: "trader", header: "Trader", render: (t) => <AddressLink address={t.trader} /> },
      ]}
      rows={rows}
      loading={loading}
      rowKey={(t) => `${t.venue}-${t.id}`}
      empty="No trades yet."
    />
  );
}
