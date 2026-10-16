"use client";

import { useEffect, useState } from "react";
import { useAccount, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { chain } from "@/lib/config";
import { shortError } from "@/lib/errors";

type WriteArgs = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

type Props = {
  label: string;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  size?: "sm" | "md" | "lg";
  /** Returns the writeContract arguments (sync or async); may throw to show a validation message. */
  build: () => WriteArgs | Promise<WriteArgs>;
  onDone?: () => void;
  /** Shown under the button while nothing else is (e.g. why it is disabled). */
  hint?: string;
  className?: string;
};

/** Throw this from `build` to abort silently (e.g. the user declined a confirm dialog). */
export const CANCELLED = "cancelled";

/** One-click contract write with pending / mined states and a readable error line. */
export function TxButton({ label, disabled, primary, danger, size = "md", build, onDone, hint, className = "" }: Props) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const qc = useQueryClient();
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (receipt.isSuccess) {
      // give the indexer a moment, then refresh everything
      const t = setTimeout(() => {
        void qc.invalidateQueries();
        onDone?.();
        reset();
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [receipt.isSuccess, qc, onDone, reset]);

  const wrongNetwork = isConnected && chainId !== chain.id;
  const busy = isPending || (!!hash && receipt.isLoading);
  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  const toneClass = primary ? "btn-primary" : danger ? "btn-danger" : "";

  if (wrongNetwork) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <button type="button" className={`btn ${sizeClass}`} disabled={switching} onClick={() => switchChain({ chainId: chain.id })}>
          {switching ? "Switching…" : `Switch to ${chain.name}`}
        </button>
        <span className="muted text-xs">Your wallet is on another network.</span>
      </div>
    );
  }

  const err = localError ?? (error ? shortError(error) : null);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        className={`btn ${toneClass} ${sizeClass}`}
        disabled={disabled || busy || !isConnected}
        aria-busy={busy}
        onClick={async () => {
          setLocalError(null);
          try {
            writeContract(await build());
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg !== CANCELLED) setLocalError(shortError(e));
          }
        }}
      >
        {busy ? (isPending ? "Confirm in wallet…" : "Waiting for confirmation…") : label}
      </button>
      {err && (
        <span className="bad text-xs" role="alert">
          {err}
        </span>
      )}
      {!err && receipt.isSuccess && <span className="good text-xs">Confirmed on chain.</span>}
      {!err && !receipt.isSuccess && !busy && hint && <span className="muted text-xs">{hint}</span>}
      {!isConnected && !hint && <span className="muted text-xs">Connect a wallet to continue.</span>}
    </div>
  );
}
