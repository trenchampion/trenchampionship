import type { NextConfig } from "next";

/** Static export for IPFS: no server, no image optimisation, relative asset paths. */
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ["@traitleague/engine"],
  webpack: (cfg, { webpack }) => {
    cfg.externals.push("pino-pretty", "lokijs", "encoding");
    // Node-only optional payment modules reached through the Coinbase connector; never used in the browser.
    cfg.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// }));
    return cfg;
  },
};

export default config;
