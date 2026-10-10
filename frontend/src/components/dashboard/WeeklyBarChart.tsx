import { Award, RotateCcw, Flame } from 'lucide-react';

export interface DayStudyStat {
  dayName: string; // 'Mon', 'Tue', ...
  fullDate: string; // YYYY-MM-DD
  hours: number;
  isToday: boolean;
  completedCount: number;
}

interface WeeklyBarChartProps {
  days: DayStudyStat[];
  topicsMastered: number;
  reviewsDue: number;
  dayStreak: number;
}

export function WeeklyBarChart({
  days,
  topicsMastered,
  reviewsDue,
  dayStreak,
}: WeeklyBarChartProps) {
  const maxHours = Math.max(4.0, ...days.map((d) => d.hours));
  const totalWeekHours = days.reduce((sum, d) => sum + d.hours, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Weekly Bar Chart (Cols 1–8) */}
      <div className="lg:col-span-8 rounded-3xl bg-surface border border-border shadow-clay-card dark:shadow-clay-dark-card p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-text-primary">
              Weekly Study Capacity & Distribution
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Daily study allocation across Monday–Sunday horizon.
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono text-base font-black text-primary">
              {totalWeekHours.toFixed(1)} hrs
            </span>
            <span className="block text-[10px] text-text-muted font-bold uppercase">
              This Week
            </span>
          </div>
        </div>

        {/* Monday - Sunday Bars */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end pt-6 pb-2 min-h-[140px]">
          {days.map((day) => {
            const heightPercent = maxHours > 0 ? (day.hours / maxHours) * 100 : 0;
            const hasHours = day.hours > 0;
            const barHeight = hasHours ? Math.max(14, Math.round(heightPercent)) : 0;

            return (
              <div key={day.dayName} className="flex flex-col items-center gap-2 group">
                {/* Hours tooltip / label */}
                <span className="font-mono text-[10px] font-bold text-text-muted group-hover:text-primary transition-colors">
                  {day.hours > 0 ? `${day.hours.toFixed(1)}h` : '0h'}
                </span>

                {/* Recessed Track and Bar */}
                <div className="w-full max-w-[32px] sm:max-w-[36px] h-28 bg-teal-100/50 dark:bg-teal-950/60 rounded-full border border-teal-200/40 dark:border-teal-800/30 overflow-hidden p-1 flex flex-col justify-end shadow-clay-inset dark:shadow-clay-dark-inset relative">
                  {/* Subtle baseline for zero-hour days */}
                  {!hasHours && (
                    <div className="w-full h-1 bg-teal-200/50 dark:bg-teal-800/40 rounded-full" />
                  )}

                  {/* Active Data Bar */}
                  {hasHours && (
                    <div
                      className="w-full rounded-full bg-[#12BFA5] dark:bg-[#35E0BE] transition-all duration-500 shadow-sm"
                      style={{
                        height: `${barHeight}%`,
                        minHeight: '8px',
                      }}
                    />
                  )}
                </div>

                {/* Day label */}
                <div className="flex flex-col items-center">
                  <span
                    className={`text-xs font-bold ${
                      day.isToday
                        ? 'text-primary font-black underline decoration-2 underline-offset-4'
                        : 'text-text-secondary'
                    }`}
                  >
                    {day.dayName}
                  </span>
                  {day.isToday && (
                    <span className="text-[9px] font-extrabold text-primary uppercase">
                      Today
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalWeekHours === 0 && (
          <div className="text-center pt-2 pb-1 text-xs text-text-muted font-medium">
            No study sessions logged for this week yet.
          </div>
        )}
      </div>

      {/* 3 Metric Chips (Cols 9–12) - Compact & Secondary */}
      <div className="lg:col-span-4 grid grid-cols-1 gap-3">
        {/* Topics Mastered */}
        <div className="rounded-2xl bg-surface border border-border shadow-clay-pill dark:shadow-clay-dark-pill p-3.5 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-status-fresh/15 text-status-fresh border border-status-fresh/25 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Topics Mastered
              </div>
              <div className="text-lg font-black text-text-primary mt-0.5">
                {topicsMastered} Units
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-status-fresh px-2 py-0.5 rounded-full bg-status-fresh/10 border border-status-fresh/20">
            FSRS Retained
          </span>
        </div>

        {/* Reviews Due */}
        <div className="rounded-2xl bg-surface border border-border shadow-clay-pill dark:shadow-clay-dark-pill p-3.5 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-status-fading/15 text-status-fading border border-status-fading/25 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Reviews Due
              </div>
              <div className="text-lg font-black text-text-primary mt-0.5">
                {reviewsDue} Pending
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-status-fading px-2 py-0.5 rounded-full bg-status-fading/10 border border-status-fading/20">
            Spaced Queue
          </span>
        </div>

        {/* Day Streak */}
        <div className="rounded-2xl bg-surface border border-border shadow-clay-pill dark:shadow-clay-dark-pill p-3.5 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/25 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Study Streak
              </div>
              <div className="text-lg font-black text-text-primary mt-0.5">
                {dayStreak} {dayStreak === 1 ? 'Day' : 'Days'}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-rose-500 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
            {dayStreak > 0 ? 'Active 🔥' : 'Start Today'}
          </span>
        </div>
      </div>
    </div>
  );
}

