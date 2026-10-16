import type { ReactNode } from "react";

export function Stat({ label, value, hint, loading, className = "" }: { label: ReactNode; value: ReactNode; hint?: ReactNode; loading?: boolean; className?: string }) {
  return (
    <div className={`stat ${className}`}>
      <div className="stat-label">{label}</div>
      {loading ? <div className="skeleton h-7 w-2/3" aria-busy="true" /> : <div className="stat-value">{value}</div>}
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function StatGrid({ children, cols = 4, className = "" }: { children: ReactNode; cols?: 2 | 3 | 4; className?: string }) {
  const colClass = cols === 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";
  return <div className={`grid gap-3 ${colClass} ${className}`}>{children}</div>;
}
