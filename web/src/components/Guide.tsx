import type { ReactNode } from "react";
import Link from "next/link";

/** "What happens here" block at the top of every action page. */
export function Guide({ title = "What happens here", steps, note, learnMore }: { title?: string; steps: ReactNode[]; note?: ReactNode; learnMore?: string }) {
  return (
    <aside className="guide" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="eyebrow">{title}</div>
        {learnMore && (
          <Link href={learnMore} className="text-xs font-medium text-[var(--muted)] hover:text-[var(--accent)]">
            Read the full explanation →
          </Link>
        )}
      </div>
      <ol>
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {note && <p className="muted mt-3 text-xs leading-relaxed">{note}</p>}
    </aside>
  );
}
