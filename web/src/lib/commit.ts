import { encodeAbiParameters, hexToBytes, keccak256, type Hex } from "viem";
import type { Stance, Tactics } from "@traitleague/engine";

/**
 * Commit-reveal material.
 *
 * Primary source: a record saved in this browser at commit time (salt + tactics), so the reveal never depends on
 * the indexer or on the wallet reproducing a signature. Backup: the same record as text the player can copy.
 *
 * Cross-device fallback, EOA wallets only: a 65-byte secp256k1 signature of a fixed typed message is
 * deterministic (RFC 6979 in every mainstream wallet), so
 *   sig  = signTypedData(Trenchampionship Commit, matchId)
 *   salt = keccak256(sig)
 *   key  = keccak256(sig || "enc")  -> AES-GCM-256, used to encrypt the tactics into the Commit event.
 * Smart wallets (passkeys, ERC-1271) return a different signature every time, so for them the salt is random,
 * the blob is encrypted under the salt and the local record / backup is the only way to reveal.
 */

export const COMMIT_TYPES = {
  Commit: [
    { name: "matchId", type: "uint256" },
    { name: "purpose", type: "string" },
  ],
} as const;

export function commitDomain(chainId: number, matchManager: Hex) {
  return { name: "Trenchampionship", version: "1", chainId, verifyingContract: matchManager } as const;
}

export function saltFromSignature(sig: Hex): Hex {
  return keccak256(sig);
}

/** True for a plain secp256k1 signature (r, s, v = 65 bytes), the only kind we treat as reproducible. */
export function isReproducibleSignature(sig: Hex): boolean {
  return /^0x[0-9a-fA-F]{130}$/.test(sig);
}

const toHex = (bytes: Uint8Array): Hex => `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;

export function randomSalt(): Hex {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

async function aesKey(secret: Hex): Promise<CryptoKey> {
  const raw = new Uint8Array(hexToBytes(keccak256(`${secret}656e63` as Hex))); // secret || "enc"
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** `secret` is the signature (reproducible wallets) or the salt itself (local mode). */
export async function encryptTactics(secret: Hex, t: Tactics): Promise<Hex> {
  const key = await aesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify({ s: t.stances, e: t.energies }));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv);
  out.set(cipher, iv.length);
  return toHex(out);
}

export async function decryptTactics(secret: Hex, blob: Hex): Promise<Tactics> {
  const key = await aesKey(secret);
  const bytes = hexToBytes(blob);
  const iv = new Uint8Array(bytes.slice(0, 12));
  const cipher = new Uint8Array(bytes.slice(12));
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher));
  const parsed = JSON.parse(new TextDecoder().decode(plain)) as { s: number[]; e: number[] };
  return { stances: parsed.s as [Stance, Stance, Stance], energies: parsed.e as [number, number, number] };
}

/** Must equal MatchManager.commitHash: keccak256(abi.encode(matchId, controller, stances, energies, salt)). */
export function commitHash(matchId: bigint, controller: Hex, t: Tactics, salt: Hex): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "address" },
        { type: "uint8[3]" },
        { type: "uint8[3]" },
        { type: "bytes32" },
      ],
      [matchId, controller, t.stances, t.energies, salt],
    ),
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Local record and backup text

export type CommitRecord = {
  v: 1;
  chainId: number;
  matchId: string;
  controller: Hex;
  salt: Hex;
  s: [Stance, Stance, Stance];
  e: [number, number, number];
  /** "sig": salt derived from a reproducible signature; "local": random salt, this record is the only copy. */
  mode: "sig" | "local";
};

export function recordKey(chainId: number, matchManager: Hex, matchId: bigint, controller: Hex): string {
  return `trch:commit:${chainId}:${matchManager.toLowerCase()}:${matchId.toString()}:${controller.toLowerCase()}`;
}

export function saveRecord(key: string, rec: CommitRecord): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(rec));
    return true;
  } catch {
    return false;
  }
}

export function loadRecord(key: string): CommitRecord | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? parseBackup(raw) : null;
  } catch {
    return null;
  }
}

export function backupText(rec: CommitRecord): string {
  return JSON.stringify(rec);
}

const isStance = (x: unknown): x is Stance => x === 0 || x === 1 || x === 2;
const isEnergy = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 255;

/** Parses a backup (or stored record); throws a readable error on anything malformed. */
export function parseBackup(text: string): CommitRecord {
  let o: unknown;
  try {
    o = JSON.parse(text.trim());
  } catch {
    throw new Error("Backup is not valid JSON.");
  }
  const r = o as Partial<CommitRecord>;
  if (
    !r ||
    r.v !== 1 ||
    typeof r.chainId !== "number" ||
    typeof r.matchId !== "string" ||
    typeof r.controller !== "string" ||
    typeof r.salt !== "string" ||
    !/^0x[0-9a-fA-F]{64}$/.test(r.salt) ||
    !Array.isArray(r.s) ||
    r.s.length !== 3 ||
    !r.s.every(isStance) ||
    !Array.isArray(r.e) ||
    r.e.length !== 3 ||
    !r.e.every(isEnergy) ||
    (r.mode !== "sig" && r.mode !== "local")
  ) {
    throw new Error("Backup is missing fields or has the wrong shape.");
  }
  return r as CommitRecord;
}

export function tacticsOfRecord(rec: CommitRecord): Tactics {
  return { stances: rec.s, energies: rec.e };
}
