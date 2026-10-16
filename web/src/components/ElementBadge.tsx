import { ELEMENTS } from "@/lib/format";

/** Element name in the engine's colour for that element (Fire, Air, Earth, Water, Shadow). */
export function ElementBadge({ element, prefix, className = "" }: { element: number; prefix?: string; className?: string }) {
  return (
    <span className={`badge badge-el badge-el-${element} ${className}`}>
      <span className="badge-swatch" aria-hidden="true" />
      {prefix ? `${prefix} ` : ""}
      {ELEMENTS[element] ?? "?"}
    </span>
  );
}
