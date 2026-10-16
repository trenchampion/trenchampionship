import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TestnetBanner } from "@/components/TestnetBanner";

// Self-hosted at build time by next/font: the static export ships the font files, no runtime request to Google.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-sora", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "TRENCHAMPIONSHIP",
    template: "%s · TRENCHAMPIONSHIP",
  },
  description:
    "A deterministic card-battle league on Base. Every player-created character is its own ERC-20 token with a permanent bonding-curve market and a 1/1 controller NFT. No randomness, no admin, no upgrades.",
  applicationName: "TRENCHAMPIONSHIP",
};

export const viewport: Viewport = {
  themeColor: "#f5f6fa",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} ${jetbrains.variable}`}>
      <body>
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-[var(--accent-ink)]">
            Skip to content
          </a>
          <TestnetBanner />
          <Header />
          <main id="main" className="wrap page">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
