import { chain } from "@/lib/config";
import { short } from "@/lib/format";
import { IconExternal } from "./Icons";

const explorer = chain.blockExplorers?.default.url;

/** Address rendered as a block-explorer link when the chain has one, otherwise as monospace text. */
export function AddressLink({ address, full, className = "" }: { address: string | null | undefined; full?: boolean; className?: string }) {
  if (!address) return <span className="muted">—</span>;
  const text = full ? address : short(address);
  if (!explorer) return <code className={`break-all ${className}`}>{text}</code>;
  return (
    <a href={`${explorer}/address/${address}`} target="_blank" rel="noreferrer" className={`mono inline-flex items-center gap-1 break-all hover:text-[var(--accent)] ${className}`} title={address}>
      {text}
      <IconExternal size={12} />
    </a>
  );
}
