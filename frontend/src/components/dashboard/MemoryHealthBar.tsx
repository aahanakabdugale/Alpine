import { ShieldCheck, Quote } from 'lucide-react';

interface MemoryHealthProps {
  freshCount: number;
  fadingCount: number;
  reviewCount: number;
}

export function MemoryHealthBar({
  freshCount,
  fadingCount,
  reviewCount,
}: MemoryHealthProps) {
  const total = freshCount + fadingCount + reviewCount;

  const freshPct = total > 0 ? (freshCount / total) * 100 : 0;
  const fadingPct = total > 0 ? (fadingCount / total) * 100 : 0;
  const reviewPct = total > 0 ? (reviewCount / total) * 100 : 0;

  return (
    <div className="rounded-3xl bg-surface border border-border shadow-clay-card dark:shadow-clay-dark-card p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-text-primary">
              FSRS Memory Health & Retention Distribution
            </h3>
            <p className="text-xs text-text-secondary">
              Predictive retention states tracked across your completed and active curriculum units.
            </p>
          </div>
        </div>

        <div className="text-xs font-bold text-text-secondary self-start sm:self-auto">
          {total} Total Monitored Units
        </div>
      </div>

      {/* Segmented Retention Bar */}
      <div className="space-y-2">
        <div className="w-full h-5 bg-surface-inset border border-border/80 rounded-full overflow-hidden flex shadow-clay-inset dark:shadow-clay-dark-inset p-0.5">
          {total === 0 ? (
            <div className="w-full h-full rounded-full bg-border/40 flex items-center justify-center text-[10px] font-semibold text-text-muted">
              Complete study units to establish memory retention state
            </div>
          ) : (
            <div className="w-full h-full rounded-full overflow-hidden flex">
              {/* Fresh Segment (>= 90%) */}
              {freshCount > 0 && (
                <div
                  className="h-full bg-status-fresh transition-all duration-500"
                  style={{
                    width: `${freshPct}%`,
                    backgroundColor: 'var(--status-fresh)',
                  }}
                  title={`Fresh (R ≥ 90%): ${freshCount} units (${Math.round(freshPct)}%)`}
                />
              )}

              {/* Fading Segment (70% - 89%) */}
              {fadingCount > 0 && (
                <div
                  className="h-full bg-status-fading transition-all duration-500 border-l border-surface/40"
                  style={{
                    width: `${fadingPct}%`,
                    backgroundColor: 'var(--status-fading)',
                  }}
                  title={`Fading (70% ≤ R < 90%): ${fadingCount} units (${Math.round(fadingPct)}%)`}
                />
              )}

              {/* Review Now Segment (< 70%) */}
              {reviewCount > 0 && (
                <div
                  className="h-full bg-status-danger transition-all duration-500 border-l border-surface/40"
                  style={{
                    width: `${reviewPct}%`,
                    backgroundColor: 'var(--status-danger)',
                  }}
                  title={`Review Now (R < 70%): ${reviewCount} units (${Math.round(reviewPct)}%)`}
                />
              )}
            </div>
          )}
        </div>

        {/* Category Legend with Percentages & Unit Counts */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 font-bold text-text-primary">
              <span className="w-2.5 h-2.5 rounded-full bg-status-fresh" />
              <span>Fresh (R ≥ 90%):</span>
              <span className="font-mono text-status-fresh font-bold">
                {freshCount} ({Math.round(freshPct)}%)
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-text-primary">
              <span className="w-2.5 h-2.5 rounded-full bg-status-fading" />
              <span>Fading (70–89%):</span>
              <span className="font-mono text-status-fading font-bold">
                {fadingCount} ({Math.round(fadingPct)}%)
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-text-primary">
              <span className="w-2.5 h-2.5 rounded-full bg-status-danger" />
              <span>Review Now (&lt; 70%):</span>
              <span className="font-mono text-status-danger font-bold">
                {reviewCount} ({Math.round(reviewPct)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Motivational Quote */}
      <div className="pt-3 border-t border-border flex items-start gap-2.5 text-xs text-text-secondary italic">
        <Quote className="w-4 h-4 text-primary shrink-0 not-italic opacity-70" />
        <span>
          &ldquo;Consistency compounds faster than intensity. Small daily steps build permanent mastery.&rdquo;
        </span>
      </div>
    </div>
  );
}

