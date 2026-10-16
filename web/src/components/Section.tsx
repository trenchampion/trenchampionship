import type { ReactNode } from "react";

/** Page-level section with an optional eyebrow, heading and lead paragraph. */
export function Section({ id, eyebrow, title, lead, children, className = "", level = 2 }: { id?: string; eyebrow?: string; title?: ReactNode; lead?: ReactNode; children?: ReactNode; className?: string; level?: 1 | 2 }) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <section id={id} className={`scroll-mt-24 ${className}`}>
      {(eyebrow || title || lead) && (
        <div className="mb-6">
          {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
          {title && <Heading className={level === 1 ? "h1" : "h2"}>{title}</Heading>}
          {lead && <p className="lead mt-3">{lead}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Page header: eyebrow, large title, lead, optional right-side actions. */
export function PageHeader({ eyebrow, title, lead, actions }: { eyebrow?: string; title: ReactNode; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="h1">{title}</h1>
        {lead && <p className="lead mt-3">{lead}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
