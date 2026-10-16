import type { ReactNode } from "react";

export function EmptyState({ title, children, action, icon, compact }: { title: string; children?: ReactNode; action?: ReactNode; icon?: ReactNode; compact?: boolean }) {
  return (
    <div className={`card-sub flex flex-col items-center text-center ${compact ? "gap-1 px-4 py-6" : "gap-2 px-6 py-10"}`}>
      {icon && <div className="muted mb-1">{icon}</div>}
      <div className="strong font-semibold">{title}</div>
      {children && <p className="muted max-w-md text-sm">{children}</p>}
      {action && <div className="mt-3 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton h-4" style={{ width: `${90 - (i % 3) * 18}%` }} />
      ))}
    </div>
  );
}
