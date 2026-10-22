import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/Section";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What this website does and does not collect: no accounts, no cookies, no analytics; everything you do happens on a public blockchain through your own wallet.",
};

const UPDATED = "22 October 2026";

export default function PrivacyPage() {
  return (
    <div className="wrap-narrow mx-auto flex flex-col gap-8">
      <PageHeader eyebrow="Privacy" title="Privacy notice" lead="This site has no accounts, no cookies and no analytics. What it cannot hide is the blockchain itself: everything you do with the contracts is public, forever." />

      <div className="card card-pad prose">
        <h3>1. Nothing is collected by the site</h3>
        <p>
          The website is a static set of files. It has no sign-up, no accounts, no cookies, no tracking pixels, no analytics and no advertising. Fonts and scripts are shipped with the site; nothing is loaded from Google or other third parties at runtime. The project does not know who you are and has no way to find out.
        </p>

        <h3>2. What stays in your browser</h3>
        <p>
          When you commit tactics for a match, the site stores the secret (your tactics and a random salt) in your browser&apos;s local storage, under a key tied to the match and your address, so that you can reveal it later. It never leaves your device unless you copy it yourself. Clearing site data deletes it.
        </p>

        <h3>3. What the blockchain shows</h3>
        <p>
          Every transaction you send, every character you create, every match, stake, trade and claim is recorded on Base, publicly and permanently, together with your wallet address. Anyone can read it, including through this site and through block explorers. Names, symbols and stories you give a character are published on chain by you. Do not put personal data there; it cannot be removed.
        </p>

        <h3>4. Who sees your connection</h3>
        <ul>
          <li>
            <strong>Your wallet and its RPC node.</strong> The wallet you choose talks to a node operated by a third party (the public Base node by default, or whatever your wallet is configured with). That provider sees your IP address and the requests, under its own privacy policy.
          </li>
          <li>
            <strong>The indexer.</strong> Pages that list characters, matches and trades read from an indexer run for this site. Like any web server it keeps ordinary access logs (IP address, time, requested path) for operation and abuse protection only; they are not analysed, shared or linked to wallet addresses, and are rotated automatically. The indexer stores only public chain data.
          </li>
          <li>
            <strong>Hosting.</strong> The site is served from the project&apos;s server (same logs as above) and from IPFS through gateways such as eth.limo when you open the ENS name; gateways have their own policies.
          </li>
          <li>
            <strong>Block explorers, Uniswap and other links.</strong> Links marked as external lead to third-party sites with their own rules.
          </li>
        </ul>

        <h3>5. Email</h3>
        <p>
          If you write to <a href="mailto:contact@trenchampionship.com">contact@trenchampionship.com</a>, your message and address are handled by the email providers involved and kept only as long as needed to answer. Nothing else is done with them.
        </p>

        <h3>6. Your rights</h3>
        <p>
          Because the project holds no personal data, there is nothing to access, correct or delete on our side. Data on the blockchain is outside anyone&apos;s control, including ours. Questions: the address above.
        </p>

        <h3>7. Changes</h3>
        <p>
          This notice may be updated; the version published on this site applies. See also the <Link href="/terms/">Terms of Service</Link> and the <Link href="/disclaimer/">Disclaimer</Link>. Last updated {UPDATED}.
        </p>
      </div>
    </div>
  );
}
