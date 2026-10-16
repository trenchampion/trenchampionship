// Verifies the web commit path against a deployed MatchManager:
//   EIP-712 signature (deterministic) -> salt -> AES-GCM blob roundtrip -> commitHash == MatchManager.commitHash
// Usage: node scripts/commit-check.mjs <MatchManager address> [rpc] [privateKey]
import { createPublicClient, encodeAbiParameters, hexToBytes, http, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const [, , mm, rpc = "http://127.0.0.1:8545", key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"] = process.argv;
if (!mm) throw new Error("usage: node scripts/commit-check.mjs <MatchManager> [rpc] [privateKey]");

const account = privateKeyToAccount(key);
const client = createPublicClient({ transport: http(rpc) });
const chainId = await client.getChainId();
const matchId = 7n;
const typed = {
  domain: { name: "Trenchampionship", version: "1", chainId, verifyingContract: mm },
  types: { Commit: [{ name: "matchId", type: "uint256" }, { name: "purpose", type: "string" }] },
  primaryType: "Commit",
  message: { matchId, purpose: "Trenchampionship commit" },
};
const sig1 = await account.signTypedData(typed);
const sig2 = await account.signTypedData(typed);
console.log("deterministic signature:", sig1 === sig2);

const salt = keccak256(sig1);
const t = { stances: [2, 0, 1], energies: [4, 4, 3] };
const local = keccak256(
  encodeAbiParameters(
    [{ type: "uint256" }, { type: "address" }, { type: "uint8[3]" }, { type: "uint8[3]" }, { type: "bytes32" }],
    [matchId, account.address, t.stances, t.energies, salt],
  ),
);
const onchain = await client.readContract({
  address: mm,
  abi: [
    {
      type: "function",
      name: "commitHash",
      stateMutability: "pure",
      inputs: [{ type: "uint256" }, { type: "address" }, { type: "uint8[3]" }, { type: "uint8[3]" }, { type: "bytes32" }],
      outputs: [{ type: "bytes32" }],
    },
  ],
  functionName: "commitHash",
  args: [matchId, account.address, t.stances, t.energies, salt],
});
console.log("commitHash matches contract:", local === onchain);

// AES-GCM roundtrip exactly as src/lib/commit.ts
const raw = new Uint8Array(hexToBytes(keccak256(`${sig1}656e63`)));
const aes = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
const iv = crypto.getRandomValues(new Uint8Array(12));
const plain = new TextEncoder().encode(JSON.stringify({ s: t.stances, e: t.energies }));
const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, plain));
const blob = new Uint8Array(iv.length + cipher.length);
blob.set(iv);
blob.set(cipher, iv.length);
const dec = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: blob.slice(0, 12) }, aes, blob.slice(12)));
console.log("AES roundtrip:", new TextDecoder().decode(dec));
