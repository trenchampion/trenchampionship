"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { chain } from "@/lib/config";
import { short } from "@/lib/format";
import { shortError } from "@/lib/errors";
import { IconWallet } from "./Icons";

export function connectorLabel(name: string): string {
  if (/coinbase/i.test(name)) return "Sign in with passkey";
  if (/injected/i.test(name)) return "Browser wallet";
  return name;
}

/** Connect buttons, one per configured connector. */
export function ConnectButtons({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { connectors, connect, isPending, error } = useConnect();
  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {connectors.map((c, i) => (
          <button key={c.uid} type="button" className={`btn ${i === 0 ? "btn-primary" : ""} ${sizeClass}`} disabled={isPending} onClick={() => connect({ connector: c })}>
            <IconWallet size={16} />
            {connectorLabel(c.name)}
          </button>
        ))}
      </div>
      {error && <span className="bad text-xs">{shortError(error)}</span>}
    </div>
  );
}

/** Network pill: green when the wallet is on the configured chain, red with a switch button otherwise. */
export function NetworkPill() {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  if (!isConnected) return null;
  const ok = chainId === chain.id;
  if (ok) {
    return (
      <span className="badge badge-good badge-dot" title={`Connected to ${chain.name}`}>
        {chain.name}
      </span>
    );
  }
  return (
    <button type="button" className="badge badge-bad badge-dot cursor-pointer" disabled={isPending} onClick={() => switchChain({ chainId: chain.id })} title="Your wallet is on a different network">
      {isPending ? "Switching…" : `Switch to ${chain.name}`}
    </button>
  );
}

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <NetworkPill />
        <span className="badge mono" title={address}>
          {short(address)}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }
  return <ConnectButtons size="sm" />;
}
