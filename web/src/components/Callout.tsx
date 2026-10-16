import type { ReactNode } from "react";
import { IconCheck, IconInfo, IconWarning } from "./Icons";

export type CalloutTone = "neutral" | "info" | "good" | "bad";

export function Callout({ children, tone = "neutral", title, className = "", action }: { children: ReactNode; tone?: CalloutTone; title?: string; className?: string; action?: ReactNode }) {
  const Icon = tone === "bad" ? IconWarning : tone === "good" ? IconCheck : IconInfo;
  return (
    <div className={`callout ${tone === "neutral" ? "" : `callout-${tone}`} ${className}`} role={tone === "bad" ? "alert" : undefined}>
      <span className="callout-icon">
        <Icon />
      </span>
      <div className="min-w-0 flex-1">
        {title && <div className="strong mb-0.5 font-semibold">{title}</div>}
        <div>{children}</div>
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}
