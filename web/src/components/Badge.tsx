import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "good" | "bad";

export function Badge({ children, tone = "neutral", dot, className = "", title }: { children: ReactNode; tone?: BadgeTone; dot?: boolean; className?: string; title?: string }) {
  const toneClass = tone === "neutral" ? "" : `badge-${tone}`;
  return (
    <span className={`badge ${toneClass} ${dot ? "badge-dot" : ""} ${className}`} title={title}>
      {children}
    </span>
  );
}
