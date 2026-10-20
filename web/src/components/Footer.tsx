import Link from "next/link";
import { addresses, CHAIN_ID, chain, ENS_NAME, GITHUB_URL, IS_TESTNET, launchUiUrl, X_URL } from "@/lib/config";
import { BrandMark, IconExternal } from "./Icons";

export function Footer() {
  const buyUrl = launchUiUrl(CHAIN_ID, addresses().LaunchPool);
  return (
    <footer className="mt-16 border-t border-[var(--line)]">
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="brand">
            <BrandMark className="brand-mark" />
            <span>TRENCHAMPIONSHIP</span>
          </div>
          <p className="muted mt-3 max-w-sm text-sm leading-relaxed">Immutable contracts on Base. No upgrades, no randomness, no admin keys beyond a pause switch that expires one year after deployment.</p>
          <p className="muted mt-3 max-w-sm text-xs leading-relaxed">
            Built for entertainment. TRCH and character tokens are in-game utility tokens with no guaranteed value; nothing here is financial advice, an offer or a promise of profit, and the project continues only if it succeeds.{" "}
            <Link href="/disclaimer/" className="underline hover:text-[var(--accent)]">
              Full disclaimer
            </Link>
            .{IS_TESTNET && " This build runs on the Base Sepolia testnet, where tokens have no value."}
          </p>
          <p className="muted mt-2 text-xs">
            Chain: {chain.name} (id {CHAIN_ID}). Built by TRENCHAMPION.
          </p>
        </div>
        <div>
          <div className="eyebrow mb-3">Play</div>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link href="/how-it-works/" className="hover:text-[var(--accent)]">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/create/" className="hover:text-[var(--accent)]">
                Create a character
              </Link>
            </li>
            <li>
              <Link href="/arena/" className="hover:text-[var(--accent)]">
                Arena
              </Link>
            </li>
            <li>
              <Link href="/league/" className="hover:text-[var(--accent)]">
                League
              </Link>
            </li>
            <li>
              <Link href="/tournaments/" className="hover:text-[var(--accent)]">
                Tournaments
              </Link>
            </li>
            <li>
              <Link href="/marketplace/" className="hover:text-[var(--accent)]">
                Marketplace
              </Link>
            </li>
            <li>
              <Link href="/token/" className="hover:text-[var(--accent)]">
                TRCH token (official contract, how to buy)
              </Link>
            </li>
            <li>
              <a href={buyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[var(--accent)]">
                Get TRCH (LaunchPool UI) <IconExternal />
              </a>
            </li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-3">Verify</div>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link href="/transparency/" className="hover:text-[var(--accent)]">
                Transparency
              </Link>
            </li>
            <li className="mono text-xs break-all">
              TRCH: <Link href="/token/" className="hover:text-[var(--accent)]">{addresses().TLToken}</Link>
            </li>
            <li>
              <Link href="/disclaimer/" className="hover:text-[var(--accent)]">
                Disclaimer
              </Link>
            </li>
            <li>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[var(--accent)]">
                GitHub repository <IconExternal />
              </a>
            </li>
            {X_URL && (
              <li>
                <a href={X_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[var(--accent)]">
                  Follow on X <IconExternal />
                </a>
              </li>
            )}
            <li>
              <span className="mono">{ENS_NAME}</span>
            </li>
            <li>
              <Link href="/how-it-works/#security" className="hover:text-[var(--accent)]">
                Security and governance
              </Link>
            </li>
            <li>
              <Link href="/how-it-works/#faq" className="hover:text-[var(--accent)]">
                FAQ
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
