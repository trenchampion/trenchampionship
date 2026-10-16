# launch-ui — open interface for the LaunchPool

One HTML file, no build step. It reads from and writes to the `LaunchPool` contract directly through
viem loaded from a CDN. No intermediary, no fee, no admin; the pool is immutable. The page uses the
same light "arena" palette as the main site and links back to it and to the disclaimer.

## Self-hosting

Copy `index.html` anywhere (IPFS, GitHub Pages, a local disk) and open it. The chain and the pool
address can be passed in the URL:

```
index.html?chain=84532&pool=0x...
```

Without parameters the page uses the addresses built into `NETWORKS` (Base Sepolia, local anvil; the
Base mainnet entry is filled in at mainnet launch). The official addresses are in `docs/DEPLOY.md`;
compare them with the Transparency page of the app.

## Deploy to IPFS

The main site's build publishes this file under `/launch-ui/` of the same directory, so one CID covers
both. For a separate deployment:

```
# npx ipfs-deploy launch-ui/index.html   or any pinning service upload
```

The CID is published in `docs/DEPLOY.md`; anyone can check that the content matches this repository.
