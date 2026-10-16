import { IS_LOCAL, IS_TESTNET } from "@/lib/config";

export function TestnetBanner() {
  if (!IS_TESTNET && !IS_LOCAL) return null;
  return (
    <div className="border-b border-[var(--warn-line)] bg-[var(--warn-soft)] text-center text-xs font-medium text-[var(--warn)]">
      <div className="wrap py-1.5">
        {IS_TESTNET ? "Base Sepolia testnet: tokens have no value. Everything here is for testing the protocol." : "Local Anvil chain: development build."}
      </div>
    </div>
  );
}
