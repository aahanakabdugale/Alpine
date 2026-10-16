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
          className="stroke-slate-200/80 dark:stroke-sky-500/20"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Arc — glowing ocean sky */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#skyGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: clamped > 0 ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))' : 'none',
          }}
        />
        <defs>
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center Percentage Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="font-mono text-3xl font-black tracking-tight text-slate-900 dark:text-sky-100">
          {Math.round(clamped)}%
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 text-slate-500 dark:text-sky-300/80">
          Complete
        </span>
      </div>
    </div>
  );
}
