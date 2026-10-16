import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number, rest: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
  ...rest,
});

export const IconArrow = ({ size = 16, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconExternal = ({ size = 14, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
  </svg>
);
export const IconInfo = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
export const IconWarning = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M12 3 2.5 20h19L12 3ZM12 10v4M12 17h.01" />
  </svg>
);
export const IconCheck = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="m5 12 4 4L19 6" />
  </svg>
);
export const IconShield = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export const IconSwords = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="m3 3 6 6M21 3l-6 6M4 20l7-7M20 20l-7-7M3 3h4v4M21 3h-4v4M4 20H8v-4M20 20h-4v-4" />
  </svg>
);
export const IconCoins = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <ellipse cx="9" cy="7" rx="6" ry="3" />
    <path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7M3 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
    <path d="M15 9.5c3.3 0 6 1.3 6 3v5c0 1.7-2.7 3-6 3" />
  </svg>
);
export const IconUser = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
export const IconTrophy = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
  </svg>
);
export const IconLock = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
export const IconClock = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IconLayers = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5M3 17l9 5 9-5" />
  </svg>
);
export const IconMenu = ({ size = 20, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const IconClose = ({ size = 20, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconWallet = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H5a2 2 0 0 0 0 4h14v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    <path d="M19 9h2v4h-2" />
  </svg>
);
export const IconSpark = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
);

/**
 * Brand mark: the pentagon with the five element colours flowing along its ring (Fire, Air, Earth, Water, Shadow)
 * and a Fire-to-Shadow core. The same shape and colours are used by app/icon.svg, launch-ui and every logo file;
 * literal hex values on purpose, so that the standalone SVG files render identically.
 */
export const BrandMark = ({ size = 28, ...r }: P) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden focusable={false} {...r}>
    <defs>
      <linearGradient id="bm-ring" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#e4552a" />
        <stop offset="0.25" stopColor="#1796b8" />
        <stop offset="0.5" stopColor="#2c9a58" />
        <stop offset="0.75" stopColor="#2b7bd4" />
        <stop offset="1" stopColor="#7b45c2" />
      </linearGradient>
      <linearGradient id="bm-core" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#e4552a" />
        <stop offset="1" stopColor="#7b45c2" />
      </linearGradient>
    </defs>
    <polygon points="20,3 36.2,14.8 30,34 10,34 3.8,14.8" fill="none" stroke="url(#bm-ring)" strokeWidth="2" strokeLinejoin="round" />
    <polygon points="20,11 29,17.5 25.5,28 14.5,28 11,17.5" fill="url(#bm-core)" opacity="0.9" />
  </svg>
);
