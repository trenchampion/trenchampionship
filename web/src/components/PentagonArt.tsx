/**
 * Hero illustration: the five-element pentagon of the battle engine. Each element beats the next
 * two (outer edge and star chord, arrows), loses to the previous two. Pure inline SVG, animated
 * with CSS only; respects prefers-reduced-motion through globals.css. Colours come from the theme
 * tokens so the drawing follows the palette.
 */
const ELEMENTS = ["Fire", "Air", "Earth", "Water", "Shadow"] as const;
const COLORS = ["var(--el-fire)", "var(--el-air)", "var(--el-earth)", "var(--el-water)", "var(--el-shadow)"] as const;

const C = 220;
const R = 150;
const pts = ELEMENTS.map((_, i) => {
  const a = ((-90 + 72 * i) * Math.PI) / 180;
  return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
});
const f = (n: number) => n.toFixed(1);

function labelPos(i: number) {
  const a = ((-90 + 72 * i) * Math.PI) / 180;
  return { x: C + (R + 34) * Math.cos(a), y: C + (R + 34) * Math.sin(a) };
}

/** Line from node i to node j, shortened so it starts and ends at the node circles. */
function edge(i: number, j: number, rad = 20) {
  const a = pts[i]!;
  const b = pts[j]!;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  return { x1: a.x + ux * rad, y1: a.y + uy * rad, x2: b.x - ux * (rad + 4), y2: b.y - uy * (rad + 4) };
}

export function PentagonArt({ className = "", maxWidth }: { className?: string; maxWidth?: number }) {
  return (
    <svg viewBox="0 0 440 440" className={`hero-art ${className}`} style={maxWidth ? { maxWidth } : undefined} role="img" aria-labelledby="pentagon-title pentagon-desc">
      <title id="pentagon-title">The five-element pentagon</title>
      <desc id="pentagon-desc">Fire, Air, Earth, Water and Shadow arranged in a pentagon. Each element beats the next two and loses to the previous two.</desc>
      <defs>
        <radialGradient id="pg-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="60%" stopColor="var(--accent)" stopOpacity="0.06" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <marker id="pg-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" opacity="0.9" />
        </marker>
      </defs>

      {/* ambient core */}
      <circle className="glow-core" cx={C} cy={C} r="150" fill="url(#pg-core)" />

      {/* rotating rings */}
      <g className="ring-slow">
        <circle cx={C} cy={C} r="205" fill="none" stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="2 10" />
      </g>
      <g className="ring-reverse">
        <circle cx={C} cy={C} r="186" fill="none" stroke="var(--accent)" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="40 260" />
      </g>

      {/* star chords: i beats i+2 */}
      <g stroke="var(--accent)" strokeOpacity="0.55" strokeWidth="1.3" markerEnd="url(#pg-arrow)">
        {ELEMENTS.map((_, i) => {
          const e = edge(i, (i + 2) % 5);
          return <line key={`c${i}`} className="dash-flow" x1={f(e.x1)} y1={f(e.y1)} x2={f(e.x2)} y2={f(e.y2)} />;
        })}
      </g>
      {/* outer edges: i beats i+1 */}
      <g stroke="var(--text-strong)" strokeOpacity="0.35" strokeWidth="1.6" markerEnd="url(#pg-arrow)">
        {ELEMENTS.map((_, i) => {
          const e = edge(i, (i + 1) % 5);
          return <line key={`e${i}`} x1={f(e.x1)} y1={f(e.y1)} x2={f(e.x2)} y2={f(e.y2)} />;
        })}
      </g>

      {/* nodes */}
      <g>
        {pts.map((p, i) => (
          <g key={ELEMENTS[i]} className="node-pulse" style={{ transformOrigin: `${f(p.x)}px ${f(p.y)}px` }}>
            <circle cx={f(p.x)} cy={f(p.y)} r="25" fill={COLORS[i]} opacity="0.16" />
            <circle cx={f(p.x)} cy={f(p.y)} r="19" fill={COLORS[i]} stroke="#ffffff" strokeWidth="2.5" />
            <text x={f(p.x)} y={f(p.y + 4.5)} textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff" fontFamily="var(--font-mono)">
              {ELEMENTS[i]!.slice(0, 2).toUpperCase()}
            </text>
          </g>
        ))}
      </g>

      {/* labels */}
      <g fontSize="13" fontWeight="600" fill="var(--text)" fontFamily="var(--font-sans)">
        {ELEMENTS.map((name, i) => {
          const p = labelPos(i);
          const anchor = i === 0 ? "middle" : i < 3 ? "start" : "end";
          const x = i === 1 || i === 2 ? p.x - 8 : i === 3 || i === 4 ? p.x + 8 : p.x;
          return (
            <text key={name} x={f(x)} y={f(p.y + 4)} textAnchor={anchor}>
              {name}
            </text>
          );
        })}
      </g>

      {/* centre */}
      <g>
        <circle cx={C} cy={C} r="40" fill="#ffffff" stroke="var(--line-strong)" strokeWidth="1" />
        <circle cx={C} cy={C} r="33" fill="none" stroke="var(--accent)" strokeOpacity="0.4" strokeWidth="1" />
        <text x={C} y={C - 4} textAnchor="middle" fontSize="11" fontWeight="700" letterSpacing="2" fill="var(--accent)" fontFamily="var(--font-sans)">
          3 ROUNDS
        </text>
        <text x={C} y={C + 12} textAnchor="middle" fontSize="9" fill="var(--muted)" letterSpacing="1.5" fontFamily="var(--font-sans)">
          NO RANDOMNESS
        </text>
      </g>
    </svg>
  );
}
