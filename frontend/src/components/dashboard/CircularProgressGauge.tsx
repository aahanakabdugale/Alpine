interface CircularProgressGaugeProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export function CircularProgressGauge({
  percentage,
  size = 148,
  strokeWidth = 12,
}: CircularProgressGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg] overflow-visible"
      >
        {/* Recessed Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-70 dark:opacity-30"
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--primary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>

      {/* Center Percentage Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="font-mono text-3xl font-black text-text-primary tracking-tight">
          {Math.round(clamped)}%
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-0.5">
          Complete
        </span>
      </div>
    </div>
  );
}

