"use client";

import { useEffect, useState } from "react";

export type TocItem = { id: string; label: string };

/** Sticky table of contents that highlights the section currently in view. */
export function Toc({ items, title = "On this page" }: { items: TocItem[]; title?: string }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const headings = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
    if (headings.length === 0) return;
    const visible = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.boundingClientRect.top);
          else visible.delete(e.target.id);
        }
        if (visible.size > 0) {
          const top = [...visible.entries()].sort((a, b) => a[1] - b[1])[0]![0];
          setActive(top);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 1] },
    );
    headings.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, [items]);

  return (
    <nav className="toc" aria-label={title}>
      <div className="eyebrow mb-2 pl-3">{title}</div>
      {items.map((i) => (
        <a key={i.id} href={`#${i.id}`} aria-current={active === i.id ? "true" : undefined}>
          {i.label}
        </a>
      ))}
    </nav>
  );
}
