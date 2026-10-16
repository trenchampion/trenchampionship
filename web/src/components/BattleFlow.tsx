/**
 * Match lifecycle diagram: challenge -> accept -> (staking + commit) -> reveal -> resolve, with
 * the three rounds shown under the resolution step. Inline SVG, CSS-only animation, theme colours.
 */
const STEPS = [
  { title: "Challenge", sub: "stake escrowed" },
  { title: "Accept", sub: "48 h window" },
  { title: "Commit", sub: "hash of tactics" },
  { title: "Reveal", sub: "after staking closes" },
  { title: "Resolve", sub: "deterministic" },
] as const;

export function BattleFlow({ className = "" }: { className?: string }) {
  const W = 760;
  const step = 150;
  const x0 = 55;
  const y = 58;
  return (
    <svg viewBox={`0 0 ${W} 190`} className={`block h-auto w-full ${className}`} role="img" aria-labelledby="bf-title">
      <title id="bf-title">Match lifecycle: challenge, accept, commit, reveal, resolve; three rounds decide the winner.</title>
      <defs>
        <marker id="bf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
        </marker>
      </defs>
      {/* connectors */}
      {STEPS.slice(0, -1).map((_, i) => (
        <line key={i} className="dash-flow" x1={x0 + i * step + 26} y1={y} x2={x0 + (i + 1) * step - 30} y2={y} stroke="var(--accent)" strokeOpacity="0.6" strokeWidth="1.5" markerEnd="url(#bf-arrow)" />
      ))}
      {/* nodes */}
      {STEPS.map((s, i) => {
        const x = x0 + i * step;
        const last = i === STEPS.length - 1;
        return (
          <g key={s.title}>
            <circle cx={x} cy={y} r="24" fill={last ? "var(--accent)" : "#ffffff"} stroke="var(--accent)" strokeWidth="1.5" />
            <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill={last ? "#ffffff" : "var(--accent)"} fontFamily="var(--font-mono)">
              {i + 1}
            </text>
            <text x={x} y={y + 46} textAnchor="middle" fontSize="13" fontWeight="650" fill="var(--text-strong)" fontFamily="var(--font-sans)">
              {s.title}
            </text>
            <text x={x} y={y + 63} textAnchor="middle" fontSize="10.5" fill="var(--muted)" fontFamily="var(--font-sans)">
              {s.sub}
            </text>
          </g>
        );
      })}
      {/* rounds under resolve */}
      {[0, 1, 2].map((r) => {
        const x = x0 + 4 * step - 36 + r * 36;
        return (
          <g key={r}>
            <rect x={x - 14} y={142} width="28" height="28" rx="6" fill="#ffffff" stroke="var(--line-strong)" />
            <text x={x} y={161} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--accent)" fontFamily="var(--font-mono)">
              R{r + 1}
            </text>
          </g>
        );
      })}
      <text x={x0 + 4 * step} y={184} textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="var(--font-sans)">
        best of three rounds
      </text>
      {/* staking bracket between accept and reveal */}
      <path d={`M ${x0 + step + 30} 100 v 8 h ${2 * step - 60} v -8`} fill="none" stroke="var(--line-strong)" strokeWidth="1" />
      <text x={x0 + 2 * step} y={122} textAnchor="middle" fontSize="10.5" fill="var(--muted)" fontFamily="var(--font-sans)">
        staking window: holders back a side, no-loss
      </text>
    </svg>
  );
}
