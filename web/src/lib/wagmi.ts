import { http, createConfig } from "wagmi";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { chain, RPC_URL } from "./config";

/**
 * Coinbase Smart Wallet first (passkey, free, Base-native), any injected wallet second.
 * Players pay their own gas; no paymaster in v1.
 */
export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [
    coinbaseWallet({ appName: "Trenchampionship", preference: "smartWalletOnly" }),
    injected(),
  ],
  transports: { [chain.id]: http(RPC_URL) },
  ssr: false,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
