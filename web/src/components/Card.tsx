import type { ReactNode } from "react";

export function Card({ children, className = "", pad = true, accent, hover, as: Tag = "section", id }: { children: ReactNode; className?: string; pad?: boolean; accent?: boolean; hover?: boolean; as?: "section" | "div" | "article" | "aside"; id?: string }) {
  return (
    <Tag id={id} className={`card ${pad ? "card-pad" : ""} ${accent ? "card-accent" : ""} ${hover ? "card-hover" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

/** Title row for a card without padding (use `pad={false}` on the Card and wrap the body in `CardBody`). */
export function CardHead({ title, eyebrow, description, actions }: { title: ReactNode; eyebrow?: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="card-head">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 className="h3">{title}</h2>
        {description && <p className="muted mt-1 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card-pad ${className}`}>{children}</div>;
}
