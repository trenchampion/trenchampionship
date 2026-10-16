"use client";

import type { ReactNode } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { chain } from "@/lib/config";
import { Callout } from "./Callout";
import { ConnectButtons } from "./WalletButton";

/**
 * Renders children only when a wallet is connected on the configured chain; otherwise a clear
 * "not connected" or "wrong network" state with the action that fixes it.
 */
export function WalletGate({ children, what = "do this" }: { children: ReactNode; what?: string }) {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  if (!isConnected) {
    return (
      <Callout tone="info" title="Connect a wallet" action={<ConnectButtons />}>
        You need a wallet on {chain.name} to {what}. A Coinbase Smart Wallet works with a passkey; any browser wallet works too. You pay your own gas (a fraction of a cent on Base).
      </Callout>
    );
  }
  if (chainId !== chain.id) {
    return (
      <Callout
        tone="bad"
        title="Wrong network"
        action={
          <button type="button" className="btn btn-primary" disabled={isPending} onClick={() => switchChain({ chainId: chain.id })}>
            {isPending ? "Switching…" : `Switch to ${chain.name}`}
          </button>
        }
      >
        Your wallet is connected to a different network. This site is built for {chain.name} (chain id {chain.id}).
      </Callout>
    );
  }
  return <>{children}</>;
}
