import { ShieldCheck, Quote } from 'lucide-react';

interface MemoryHealthProps {
  freshCount: number;
  fadingCount: number;
  reviewCount: number;
}

const cardTheme = "transition-all duration-300 bg-[#E0F2FE]/85 text-slate-900 border border-sky-400/20 shadow-[0_10px_30px_rgba(56,189,248,0.08)] backdrop-blur-md dark:bg-[#13293D]/88 dark:text-sky-100 dark:border-sky-400/15 dark:shadow-[0_12px_32px_rgba(0,0,0,0.45)] dark:backdrop-blur-md";

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
    <div className={`rounded-3xl p-6 space-y-5 ${cardTheme}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-sky-50 text-sky-600 border border-sky-200/70 dark:bg-sky-500/15 dark:border-sky-400/25 dark:text-sky-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Memory Health
            </h3>
            <p className="text-xs text-slate-600 dark:text-sky-200/80">
              Based on your spaced repetition retention.
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Retention Bar */}
      <div className="space-y-2">
        <div className="w-full h-5 rounded-full overflow-hidden flex p-0.5 bg-slate-100 border border-slate-200/70 shadow-inner dark:bg-[#0B1E2D]/70 dark:border-sky-400/15 dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]">
          {total === 0 ? (
            <div className="w-full h-full rounded-full flex items-center justify-center text-[10px] font-semibold text-slate-400 dark:text-sky-200/50">
              Complete study units to establish memory retention state
            </div>
          ) : (
            <div className="w-full h-full rounded-full overflow-hidden flex">
              {freshCount > 0 && (
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${freshPct}%`,
                    backgroundColor: 'var(--status-fresh)',
                    boxShadow: '2px 0 6px rgba(56, 189, 248, 0.35)',
                  }}
                  title={`Fresh (${Math.round(freshPct)}%): ${freshCount} topics`}
                />
              )}
              {fadingCount > 0 && (
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${fadingPct}%`,
                    backgroundColor: 'var(--status-fading)',
                    borderLeft: '1px solid rgba(0, 0, 0, 0.2)',
                    boxShadow: '2px 0 6px rgba(245, 158, 11, 0.3)',
                  }}
                  title={`Fading (${Math.round(fadingPct)}%): ${fadingCount} topics`}
                />
              )}
              {reviewCount > 0 && (
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${reviewPct}%`,
                    backgroundColor: 'var(--status-danger)',
                    borderLeft: '1px solid rgba(0, 0, 0, 0.2)',
                    boxShadow: '2px 0 6px rgba(244, 63, 94, 0.3)',
                  }}
                  title={`Review now (${Math.round(reviewPct)}%): ${reviewCount} topics`}
                />
              )}
            </div>
          )}
        </div>

        {/* Category Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-status-fresh" />
              <span>Fresh ({Math.round(freshPct)}%) · {freshCount} topics</span>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-status-fading" />
              <span>Fading ({Math.round(fadingPct)}%) · {fadingCount} topics</span>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-status-danger" />
              <span>Review now ({Math.round(reviewPct)}%) · {reviewCount} topics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Motivational Quote */}
      <div className="pt-3 flex items-start gap-2.5 text-xs italic border-t border-slate-200/60 dark:border-sky-400/10 text-slate-600 dark:text-sky-200/70">
        <Quote className="w-4 h-4 shrink-0 not-italic opacity-70 text-sky-600 dark:text-sky-400" />
        <span>
          &ldquo;Consistency compounds faster than intensity. Small daily steps build permanent mastery.&rdquo;
        </span>
      </div>
    </div>
  );
}
