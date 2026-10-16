"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { energyBudget, validTraits, type Traits } from "@traitleague/engine";
import { Badge } from "@/components/Badge";
import { Callout } from "@/components/Callout";
import { Card, CardBody, CardHead } from "@/components/Card";
import { CharacterArt } from "@/components/CharacterArt";
import { Field, Range } from "@/components/Field";
import { Guide } from "@/components/Guide";
import { PageHeader } from "@/components/Section";
import { TxButton } from "@/components/TxButton";
import { WalletGate } from "@/components/WalletGate";
import { CONFIG } from "@/lib/config";
import { contracts } from "@/lib/contracts";
import { ELEMENTS, SPECIALS, SPECIAL_HELP, pct, tl, units } from "@/lib/format";
import { estimate, TRAIT_BUDGET, TRAIT_MAX } from "@/lib/simulate";

const TRAITS = [
  ["strength", "Strength", "Attack base = Strength + Focus / 2. Also half of the Defense base."],
  ["defense", "Defense", "Defense base = Defense + Strength / 2. Also half of the Counter base."],
  ["speed", "Speed", "Energy per match = 5 + Speed / 2. Higher Speed also wins tied rounds."],
  ["focus", "Focus", "Counter base = Focus + Defense / 2. Also half of the Attack base."],
] as const;

/** Longest story accepted by the builder: ~22 storage slots of base64 JSON, a few hundred thousand gas on Base. */
const STORY_MAX = 400;
/** On-chain bound of the metadata data URI (Config.METADATA_URI_MAX_BYTES); the factory rejects longer ones. */
const METADATA_URI_MAX = 2048;
/** Reference image links are kept short so the metadata stays within the on-chain bound. */
const IMAGE_URL_MAX = 300;

export default function CreatePage() {
  const { address } = useAccount();
  const c = contracts();
  const [t, setT] = useState<Traits>({ strength: 11, defense: 11, speed: 12, focus: 11, element: 0, special: 1, weakness: 3 });
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [image, setImage] = useState("");
  const [story, setStory] = useState("");
  const [supply, setSupply] = useState("1000000000");
  const [virtualTl, setVirtualTl] = useState("10000");
  const [allocBps, setAllocBps] = useState(0);
  const [vestingDays, setVestingDays] = useState(90);
  const [feeBps, setFeeBps] = useState(50);
  const [buyTl, setBuyTl] = useState("0");

  const sum = t.strength + t.defense + t.speed + t.focus;
  const valid = validTraits(t) && t.special >= 1;
  const preview = useMemo(() => (valid ? estimate(t) : []), [t, valid]);

  const allowance = useReadContract({ ...c.tl, functionName: "allowance", args: address ? [address, c.factory.address] : undefined, query: { enabled: !!address } });
  const balance = useReadContract({ ...c.tl, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const count = useReadContract({ ...c.factory, functionName: "characterCount" });
  const nextId = (count.data ?? 0n) + 1n;
  const buyAmount = parseUnits(buyTl || "0", 18);
  const need = CONFIG.mintFee + buyAmount;
  const approved = (allowance.data ?? 0n) >= need;
  const enoughBalance = balance.data === undefined || balance.data >= need;

  const supplyWei = parseUnits(supply || "0", 18);
  const virtualWei = parseUnits(virtualTl || "0", 18);
  const supplyOk = supplyWei >= CONFIG.charSupplyMin && supplyWei <= CONFIG.charSupplyMax;
  const virtualOk = virtualWei >= CONFIG.charVirtualTlMin && virtualWei <= CONFIG.charVirtualTlMax;
  const nameOk = name.trim().length > 0;
  const symbolOk = symbol.trim().length > 0;
  const fieldsOk = valid && supplyOk && virtualOk && nameOk && symbolOk;

  const storyText = story.trim().slice(0, STORY_MAX);
  const metadataURI = `data:application/json;base64,${typeof window === "undefined" ? "" : btoa(unescape(encodeURIComponent(JSON.stringify({ name, image, description: storyText || `Trenchampionship character ${name}`, ...(storyText ? { story: storyText } : {}) }))))}`;
  const metaOk = metadataURI.length <= METADATA_URI_MAX;
  const formOk = fieldsOk && metaOk;

  const tokenomics = {
    name,
    symbol,
    supply: supplyWei,
    virtualTl: virtualWei,
    creatorAllocBps: allocBps,
    vestingDuration: allocBps > 0 ? vestingDays * 86400 : 0,
    creatorFeeBps: feeBps,
  };

  const set = (k: keyof Traits, v: number) => setT((p) => ({ ...p, [k]: v }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Create" title="Build a character" lead="Compose traits within the 45-point budget, choose the tokenomics of its token within protocol bounds, and create everything in one transaction. Nothing about a character can be changed afterwards." />

      <Guide
        learnMore="/how-it-works/#characters"
        steps={[
          <>
            Spend exactly <strong>{TRAIT_BUDGET}</strong> points on Strength, Defense, Speed and Focus (each 1–{TRAIT_MAX}); pick an element, a special ability and a weakness.
          </>,
          <>Choose the token's name, symbol, supply, virtual TRCH reserve, your vested allocation (0–20 %) and your trade fee (0–1 %).</>,
          <>
            Approve <strong>{tl(CONFIG.mintFee)}</strong> (the mint fee: 50 % burned, 25 % RewardPool, 25 % treasury) plus any first buy.
          </>,
          <>Create: the transaction mints the ERC-20, opens its permanent market, schedules the vesting, executes your first buy and mints the controller NFT to you.</>,
        ]}
        note="You pay your own gas. Liquidity is permanent: there are no LP tokens to withdraw and no migration."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------------------------------------------------------- traits */}
        <Card pad={false}>
          <CardHead eyebrow="Step 1" title="Traits" description={<>Budget {TRAIT_BUDGET} points (40 + 5 for the mandatory weakness). Spent: <b className={sum === TRAIT_BUDGET ? "good" : "bad"}>{sum}</b> / {TRAIT_BUDGET}.</>} />
          <CardBody className="flex flex-col gap-5">
            {TRAITS.map(([key, label, help]) => (
              <Field key={key} id={`trait-${key}`} label={label} value={t[key]} help={help}>
                <Range id={`trait-${key}`} min={1} max={TRAIT_MAX} value={t[key]} onChange={(v) => set(key, v)} />
              </Field>
            ))}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="element" label="Element" help="Beats the next two elements on the pentagon (+1), loses to the previous two (−1).">
                <select id="element" className="select" value={t.element} onChange={(e) => set("element", Number(e.target.value))}>
                  {ELEMENTS.map((el, i) => (
                    <option key={el} value={i}>
                      {el}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="special" label="Special" help={SPECIAL_HELP[t.special]}>
                <select id="special" className="select" value={t.special} onChange={(e) => set("special", Number(e.target.value))}>
                  {SPECIALS.slice(1).map((sp, i) => (
                    <option key={sp} value={i + 1}>
                      {sp}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="weakness" label="Weakness" help="−2 to your round score whenever the opponent has this element.">
                <select id="weakness" className="select" value={t.weakness} onChange={(e) => set("weakness", Number(e.target.value))}>
                  {ELEMENTS.map((el, i) => (
                    <option key={el} value={i}>
                      {el}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="card-sub flex flex-col gap-4 p-4 text-sm sm:flex-row sm:items-start">
              <div className="mx-auto flex shrink-0 flex-col items-center gap-2 sm:mx-0">
                <CharacterArt character={{ id: nextId, name: name.trim() || "Unnamed", ...t }} size={176} className="art-lg" alt="Live preview of the character artwork" />
                <div className="muted max-w-[11rem] text-center text-[0.68rem] leading-snug">
                  Live preview · would be <span className="mono">#{nextId.toString()}</span> if created now. Generated on chain from the traits and the name; nothing to upload.
                </div>
              </div>
              <div className="grid flex-1 gap-3">
                <div>
                  <div className="stat-label">Energy per match</div>
                  <div className="strong num text-lg font-semibold">{energyBudget(t)}</div>
                </div>
                <div>
                  <div className="stat-label">Attack / Defense / Counter base</div>
                  <div className="strong num text-lg font-semibold">
                    {t.strength + Math.floor(t.focus / 2)} / {t.defense + Math.floor(t.strength / 2)} / {t.focus + Math.floor(t.defense / 2)}
                  </div>
                </div>
                <div>
                  <div className="stat-label">Pentagon</div>
                  <div className="muted text-xs leading-relaxed">
                    {ELEMENTS[t.element]} beats {ELEMENTS[(t.element + 1) % 5]} and {ELEMENTS[(t.element + 2) % 5]}; loses to {ELEMENTS[(t.element + 3) % 5]} and {ELEMENTS[(t.element + 4) % 5]}.
                  </div>
                </div>
              </div>
            </div>
            {!valid && (
              <Callout tone="bad">
                The four traits must add up to exactly {TRAIT_BUDGET} (currently {sum}).
              </Callout>
            )}
            {valid && (
              <div>
                <div className="field-label">
                  <span>Estimated result against five archetypes</span>
                  <span className="muted text-xs font-normal">random tactics on both sides</span>
                </div>
                <ul className="grid grid-cols-5 gap-2 text-center">
                  {preview.map((p) => (
                    <li key={p.name} className="card-sub px-1 py-3">
                      <div className="muted truncate text-[0.68rem] uppercase tracking-wide">{p.name}</div>
                      <div className="strong num text-lg font-semibold">{Math.round(p.score * 100)} %</div>
                    </li>
                  ))}
                </ul>
                <p className="field-help">This is not the value under optimal play; the real outcome depends on the tactics both controllers commit.</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* ---------------------------------------------------------- tokenomics */}
        <Card pad={false}>
          <CardHead eyebrow="Step 2" title="Name and tokenomics" description="Everything here is fixed at creation and shown on the character's page." />
          <CardBody className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="name" label="Character and token name" help="Used for the ERC-20 name and the character profile." error={name.length > 0 && !nameOk ? "Name must not be empty." : undefined}>
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ember Drake" maxLength={40} />
              </Field>
              <Field id="symbol" label="Ticker" help="Up to 8 characters; uppercased automatically.">
                <input id="symbol" className="input" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="EMBER" maxLength={8} />
              </Field>
              <Field id="story" label="Story (optional)" value={`${story.length} / ${STORY_MAX}`} help="Who is this character? Its origin, its grudge, its catchphrase. Stored on chain with the metadata (gas grows with the length) and shown on the character's page and to anyone reading the token's metadata. It has no effect on battles or abilities." className="sm:col-span-2">
                <textarea id="story" className="input" rows={4} value={story} maxLength={STORY_MAX} onChange={(e) => setStory(e.target.value)} placeholder="Forged in the last furnace of the old city, Ember Drake fights for whoever still remembers its name…" />
              </Field>
              <Field id="image" label="Reference image URL (optional)" help="An external https:// or ipfs:// link kept in the metadata as a reference. The character's artwork itself is generated on chain from its id and traits (see the preview); nothing to upload." className="sm:col-span-2">
                <input id="image" className="input" value={image} maxLength={IMAGE_URL_MAX} onChange={(e) => setImage(e.target.value)} placeholder="https://… or ipfs://…" />
              </Field>
              <Field id="supply" label="Token supply" help={`${units(CONFIG.charSupplyMin)} – ${units(CONFIG.charSupplyMax)} tokens. Only changes the price per token, not the curve or the market cap.`} error={!supplyOk ? "Out of bounds." : undefined}>
                <input id="supply" className="input num" inputMode="numeric" value={supply} aria-invalid={!supplyOk} onChange={(e) => setSupply(e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field id="virtual" label="Virtual TRCH reserve" help={`${tl(CONFIG.charVirtualTlMin)} – ${tl(CONFIG.charVirtualTlMax)}. The character's starting market cap in TRCH and the steepness of its curve.`} error={!virtualOk ? "Out of bounds." : undefined}>
                <div className="input-group">
                  <input id="virtual" className="input num" inputMode="numeric" value={virtualTl} aria-invalid={!virtualOk} onChange={(e) => setVirtualTl(e.target.value.replace(/\D/g, ""))} />
                  <span className="input-addon">TRCH</span>
                </div>
              </Field>
              <Field id="alloc" label="Your allocation" value={pct(allocBps, 0)} help={allocBps === 0 ? "Fair launch: nothing is free; the whole supply goes on the curve." : "Vests linearly through the shared CreatorVesting contract; it cannot be unlocked early."}>
                <Range id="alloc" min={0} max={CONFIG.creatorAllocMaxBps} step={100} value={allocBps} onChange={setAllocBps} />
              </Field>
              <Field id="vesting" label="Vesting" value={`${vestingDays} days`} help={`${CONFIG.creatorVestingMinDays} – ${CONFIG.creatorVestingMaxDays} days, linear, no cliff. Only applies when the allocation is above 0 %.`}>
                <Range id="vesting" min={CONFIG.creatorVestingMinDays} max={CONFIG.creatorVestingMaxDays} value={vestingDays} disabled={allocBps === 0} onChange={setVestingDays} />
              </Field>
              <Field id="fee" label="Your trade fee" value={pct(feeBps)} help="0 – 1 % on every buy and sell of the token, on top of the 1 % protocol fee; paid to whoever holds the controller NFT.">
                <Range id="fee" min={0} max={CONFIG.creatorFeeMaxBps} step={5} value={feeBps} onChange={setFeeBps} />
              </Field>
              <Field id="buy" label="First buy (TRCH)" help="You buy on your own curve like everyone else, just first. 0 skips the buy.">
                <div className="input-group">
                  <input id="buy" className="input num" inputMode="decimal" value={buyTl} onChange={(e) => setBuyTl(e.target.value.replace(/[^\d.]/g, ""))} />
                  <span className="input-addon">TRCH</span>
                </div>
              </Field>
            </div>

            <dl className="kv card-sub p-4">
              <dt>Mint fee</dt>
              <dd>{tl(CONFIG.mintFee)}</dd>
              <dt>First buy</dt>
              <dd>{tl(buyAmount)}</dd>
              <dt className="strong">Total to approve</dt>
              <dd className="gold">{tl(need)}</dd>
              {address && (
                <>
                  <dt>Your TRCH balance</dt>
                  <dd className={enoughBalance ? undefined : "bad"}>{tl(balance.data, 2)}</dd>
                  <dt>Currently approved</dt>
                  <dd>{tl(allowance.data, 2)}</dd>
                </>
              )}
            </dl>

            <WalletGate what="create a character">
              {!enoughBalance && (
                <Callout tone="bad" title="Not enough TRCH">
                  You need {tl(need)} but hold {tl(balance.data, 2)}. Get TRCH from the LaunchPool interface (link in the header).
                </Callout>
              )}
              <div className="flex flex-wrap items-start gap-3">
                <TxButton label={approved ? "Approved" : `1. Approve ${tl(need)}`} disabled={approved || !enoughBalance} build={() => ({ ...c.tl, functionName: "approve", args: [c.factory.address, need] })} hint={approved ? "Allowance is sufficient." : "One-time allowance for the factory."} />
                <TxButton
                  label="2. Create character"
                  primary
                  disabled={!approved || !formOk || !enoughBalance}
                  hint={!formOk ? (metaOk ? "Complete the traits, name, ticker and bounds above." : "The story and image link together are too long for the on-chain metadata.") : !approved ? "Approve first." : undefined}
                  build={() => ({
                    ...c.factory,
                    functionName: "createCharacter",
                    args: [
                      {
                        strength: t.strength,
                        defense: t.defense,
                        speed: t.speed,
                        focus: t.focus,
                        element: t.element,
                        special: t.special,
                        weakness: t.weakness,
                      },
                      metadataURI,
                      tokenomics,
                      buyAmount,
                      0n,
                    ],
                  })}
                />
              </div>
            </WalletGate>
            <p className="muted text-xs leading-relaxed">
              After creation, find your character under{" "}
              <Link href="/arena/" className="underline hover:text-[var(--accent)]">
                Arena → Your characters
              </Link>
              . Traits, tokenomics and the curve are immutable; the controller NFT is yours to keep, transfer or retire. {allocBps === 0 && <Badge tone="good">Fair launch</Badge>}
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
