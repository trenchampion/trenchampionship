import { formatUnits } from "viem";

const LOCALE = "en-US";

/** Element indices match the engine's pentagon order; names are the English display names. */
export const ELEMENTS = ["Fire", "Air", "Earth", "Water", "Shadow"] as const;
export const STANCES = ["Attack", "Defense", "Counter"] as const;
export const SPECIALS = [
  "—",
  "First Strike",
  "Armor",
  "Endurance",
  "Adaptation",
  "Pressure",
  "Finisher",
  "Counterstrike",
  "Balance",
] as const;
export const SPECIAL_HELP = [
  "",
  "+4 in round 1 when attacking",
  "opponent's Strength −2 (minimum 1)",
  "+1 energy per match",
  "element term never negative; weakness does not apply",
  "+2 in round 1",
  "+2 in round 3",
  "+8 when your Counter meets an Attack",
  "the opponent's stance bonus against you is 6 instead of 8",
] as const;

export const MATCH_OUTCOME_LABEL: Record<string, string> = {
  WinA: "A won",
  WinB: "B won",
  Draw: "Draw",
  Void: "Void",
  Expired: "Expired",
  Cancelled: "Cancelled",
};

export const MATCH_STATUS_LABEL: Record<string, string> = {
  Challenged: "Awaiting acceptance",
  Accepted: "In progress",
  Resolved: "Resolved",
};

/** Plain number with thousands separators. */
export function num(n: number | bigint | null | undefined, digits = 0): string {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString(LOCALE, { maximumFractionDigits: digits });
}

/** Token amount (18 decimals) without a unit. */
export function units(v: bigint | string | null | undefined, digits = 0): string {
  if (v === null || v === undefined) return "—";
  return Number(formatUnits(BigInt(v), 18)).toLocaleString(LOCALE, { maximumFractionDigits: digits });
}

export function tl(v: bigint | string | null | undefined, digits = 0): string {
  if (v === null || v === undefined) return "—";
  return `${units(v, digits)} TRCH`;
}

export function eth(v: bigint | string | null | undefined, digits = 4): string {
  if (v === null || v === undefined) return "—";
  return `${Number(formatUnits(BigInt(v), 18)).toLocaleString(LOCALE, { maximumFractionDigits: digits })} ETH`;
}

/** Basis points to a percentage string, e.g. 250 -> "2.5 %". */
export function pct(bps: number, digits = 2): string {
  return `${(bps / 100).toLocaleString(LOCALE, { maximumFractionDigits: digits })} %`;
}

export function short(addr: string | null | undefined): string {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function when(ts: string | bigint | number | null | undefined): string {
  if (!ts) return "—";
  return new Date(Number(ts) * 1000).toLocaleString(LOCALE, { dateStyle: "medium", timeStyle: "short" });
}

export function dateOnly(ts: string | bigint | number | null | undefined): string {
  if (!ts) return "—";
  return new Date(Number(ts) * 1000).toLocaleDateString(LOCALE, { dateStyle: "medium" });
}

export function countdown(deadline: string | bigint | number | null | undefined, now = Date.now()): string {
  if (!deadline) return "—";
  const ms = Number(deadline) * 1000 - now;
  if (ms <= 0) return "expired";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d} d ${h} h`;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/** Spot price (TRCH per token, scaled 1e18) to a readable string. */
export function price(spot: string | bigint | null | undefined): string {
  if (!spot) return "—";
  const n = Number(formatUnits(BigInt(spot), 18));
  return `${n.toLocaleString(LOCALE, { maximumSignificantDigits: 4 })} TRCH`;
}

export function ipfsToHttp(uri: string): string {
  return uri.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${uri.slice(7)}` : uri;
}

/** Energy budget per match, same formula as the engine (5 + Speed/2, +1 for Endurance). */
export function energyOf(speed: number, special: number): number {
  return 5 + Math.floor(speed / 2) + (special === 3 ? 1 : 0);
}
