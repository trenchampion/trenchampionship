import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: ReactNode;
  align?: "left" | "right";
  render: (row: T, index: number) => ReactNode;
  className?: string;
};

export function Table<T>({ columns, rows, rowKey, empty, loading, caption }: { columns: Column<T>[]; rows: T[] | undefined; rowKey: (row: T) => string; empty?: ReactNode; loading?: boolean; caption?: string }) {
  return (
    <div className="table-wrap">
      <table className="table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.align === "right" ? "right" : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            [0, 1, 2].map((i) => (
              <tr key={`s${i}`}>
                {columns.map((c) => (
                  <td key={c.key}>
                    <div className="skeleton w-20" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading && rows && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="muted py-6 text-center text-sm">
                {empty ?? "Nothing here yet."}
              </td>
            </tr>
          )}
          {!loading &&
            rows?.map((r, i) => (
              <tr key={rowKey(r)}>
                {columns.map((c) => (
                  <td key={c.key} className={`${c.align === "right" ? "right" : ""} ${c.className ?? ""}`}>
                    {c.render(r, i)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
