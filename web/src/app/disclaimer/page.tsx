import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/Section";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "TRENCHAMPIONSHIP is a game built for entertainment. It promises no financial gain, has no operator, and its continuation depends on whether it succeeds.",
};

const UPDATED = "13 October 2026";

export default function DisclaimerPage() {
  return (
    <div className="wrap-narrow mx-auto flex flex-col gap-8">
      <PageHeader eyebrow="Disclaimer" title="Please read before you play" lead="TRENCHAMPIONSHIP is a game built for entertainment. Three things matter most: it promises no financial gain, nobody operates it, and whether it continues depends on whether it succeeds." />

      <div className="card card-pad prose">
        <h3>1. A game, built for entertainment</h3>
        <p>
          TRENCHAMPIONSHIP is an open-source, deterministic card-battle league running on immutable smart contracts on Base. It exists for the fun of composing characters, playing matches and competing in seasons and tournaments. It is an experiment in on-chain game design, not a business, a service or a financial product.
        </p>

        <h3>2. No promise of financial gain</h3>
        <p>
          Nothing on this site, in the contracts, in the documentation or in any communication about the project is an offer, a solicitation, investment advice or a promise of profit. TRCH and the character tokens are utility tokens used inside the game: they pay for character creation, match stakes, tournament entries and season licenses, and they can be traded on the project&apos;s own markets. They carry <strong>no guaranteed value and may lose all value</strong>. Nobody, including the founder, promises any price, return, yield, liquidity, buyback or future demand. Prices on the curves and pools result only from what other participants choose to pay. Token holders have no claim on match prizes, fees or anything else. The founder&apos;s own position was bought on the public curve and is disclosed on the <Link href="/transparency/">Transparency page</Link>.
        </p>

        <h3>3. Nobody operates it</h3>
        <p>
          The contracts have no owner, no administrator, no upgrade path and no way to reverse a transaction, recover a lost key, change a rule or return funds. The only privilege is a pause of three entry points, which expires one year after deployment and cannot touch funds. You interact with the contracts directly from your own wallet, at your own risk, and you pay your own network fees. This website is a static interface to the public chain; it holds nothing and can be replaced by anyone.
        </p>

        <h3>4. Continuation depends on success</h3>
        <p>
          The project is built and maintained by a single pseudonymous founder with no company, no employees and no funding. Its continuation, future versions, the website, the indexer and any form of support depend on whether the game attracts players and on the founder&apos;s capacity and interest. The project may be left unmaintained or abandoned at any time without notice. The contracts keep running on their own regardless, but interfaces, documentation and explanations may stop being updated.
        </p>

        <h3>5. Risks you accept</h3>
        <ul>
          <li>Smart-contract risk: the contracts are tested and reviewed but have not been professionally audited; a bug could lock or lose funds permanently.</li>
          <li>Market risk: character tokens and TRCH trade on thin, permanent markets; prices can move violently and liquidity may be insufficient to sell.</li>
          <li>Protocol risk: fixed rules, fixed fees and fixed amounts in TRCH do not adapt to circumstances; a future version would be a separate deployment without migration.</li>
          <li>Testnet builds: tokens on a test network have no value and test deployments may be replaced at any time.</li>
          <li>Legal and tax risk: the treatment of tokens, games and winnings differs by country and may change; you are responsible for complying with your local laws and taxes, and you must not use the game where it is prohibited.</li>
        </ul>

        <h3>6. Eligibility</h3>
        <p>You must be of legal age in your jurisdiction and legally permitted to use blockchain-based games and tokens. If you are not, do not use the game.</p>

        <h3>7. No warranty, limitation of liability</h3>
        <p>
          The contracts, the website, the documentation and the code are provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, availability or non-infringement. To the maximum extent permitted by applicable law, the founder and any contributor shall not be liable for any direct, indirect, incidental, consequential or other loss or damage, including loss of tokens, funds, profits or data, arising from or related to the use of, or inability to use, the game, the contracts or this site, whatever the legal basis.
        </p>

        <h3>8. Changes</h3>
        <p>
          This disclaimer may be updated; the version published on this site applies. By using the site or interacting with the contracts you acknowledge that you have read and understood it. Last updated {UPDATED}.
        </p>
      </div>
    </div>
  );
}
