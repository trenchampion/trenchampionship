import type { ReactNode } from "react";

/**
 * Labelled form control with inline help and an optional error line.
 * Pass the control's `id` so the label is associated for screen readers.
 */
export function Field({ id, label, value, help, error, children, className = "" }: { id: string; label: ReactNode; value?: ReactNode; help?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  const helpId = help ? `${id}-help` : undefined;
  const errId = error ? `${id}-error` : undefined;
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="field-label">
        <span>{label}</span>
        {value !== undefined && <span className="gold num font-semibold">{value}</span>}
      </label>
      {children}
      {help && (
        <p id={helpId} className="field-help">
          {help}
        </p>
      )}
      {error && (
        <p id={errId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Range input that paints its own fill (WebKit) through the --fill custom property. */
export function Range({ id, min, max, step = 1, value, onChange, disabled, ariaDescribedBy }: { id: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void; disabled?: boolean; ariaDescribedBy?: string }) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      id={id}
      type="range"
      className="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-describedby={ariaDescribedBy}
      style={{ ["--fill" as string]: `${fill}%` }}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}
