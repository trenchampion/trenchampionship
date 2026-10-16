"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { addresses, CHAIN_ID, launchUiUrl } from "@/lib/config";
import { BrandMark, IconClose, IconExternal, IconMenu } from "./Icons";
import { WalletButton } from "./WalletButton";

const NAV = [
  ["/how-it-works/", "How it works"],
  ["/create/", "Create"],
  ["/arena/", "Arena"],
  ["/league/", "League"],
  ["/tournaments/", "Tournaments"],
  ["/marketplace/", "Marketplace"],
  ["/transparency/", "Transparency"],
] as const;

export function Header() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const buyUrl = launchUiUrl(CHAIN_ID, addresses().LaunchPool);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, "")));

  return (
    <header className="site-header">
      <div className="wrap flex items-center gap-3 py-3">
        <Link href="/" className="brand" aria-label="TRENCHAMPIONSHIP home">
          <BrandMark className="brand-mark" />
          <span>TRENCHAMPIONSHIP</span>
        </Link>
        {/* The full bar needs ~1030 px (brand, seven links, two wallet buttons); below xl the menu button takes over. */}
        <nav className="ml-4 hidden items-center gap-0.5 xl:flex" aria-label="Primary">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="nav-link" aria-current={isActive(href) ? "page" : undefined}>
              {label}
            </Link>
          ))}
          <a href={buyUrl} className="nav-link" target="_blank" rel="noreferrer">
            Get TRCH <IconExternal className="ml-1" />
          </a>
        </nav>
        <div className="ml-auto hidden xl:block">
          <WalletButton />
        </div>
        <button type="button" className="btn btn-ghost btn-sm ml-auto xl:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((v) => !v)}>
          {open ? <IconClose /> : <IconMenu />}
          <span className="sr-only">Toggle navigation</span>
        </button>
      </div>
      {open && (
        <div id="mobile-nav" className="wrap border-t border-[var(--line)] pb-4 pt-2 xl:hidden">
          <nav className="flex flex-col gap-0.5" aria-label="Primary (mobile)">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="nav-link" aria-current={isActive(href) ? "page" : undefined} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))}
            <a href={buyUrl} className="nav-link" target="_blank" rel="noreferrer">
              Get TRCH <IconExternal className="ml-1" />
            </a>
          </nav>
          <div className="mt-3 border-t border-[var(--line)] pt-3">
            <WalletButton />
          </div>
        </div>
      )}
    </header>
  );
}
