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

const cardTheme = "transition-all duration-300 bg-[#E0F2FE]/85 text-slate-900 border border-sky-400/20 shadow-[0_10px_30px_rgba(56,189,248,0.08)] backdrop-blur-md dark:bg-[#13293D]/88 dark:text-sky-100 dark:border-sky-400/15 dark:shadow-[0_12px_32px_rgba(0,0,0,0.45)] dark:backdrop-blur-md";

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
      <div className={`lg:col-span-8 rounded-3xl p-6 flex flex-col justify-between ${cardTheme}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Weekly Study Capacity & Distribution
            </h3>
            <p className="text-xs mt-0.5 text-slate-600 dark:text-sky-200/80">
              Planned study hours across this week.
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono text-base font-black text-sky-600 dark:text-sky-400">
              {totalWeekHours.toFixed(1)} hrs
            </span>
            <span className="block text-[10px] font-bold uppercase text-slate-400 dark:text-sky-200/60">
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
                {/* Hours label */}
                <span className="font-mono text-[10px] font-bold text-slate-500 group-hover:text-sky-600 dark:text-sky-200/70 dark:group-hover:text-sky-300 transition-colors">
                  {day.hours > 0 ? `${day.hours.toFixed(1)}h` : '0h'}
                </span>

                {/* Track + Bar */}
                <div className="w-full max-w-[32px] sm:max-w-[36px] h-28 rounded-full overflow-hidden p-1 flex flex-col justify-end relative bg-slate-100 border border-slate-200/70 shadow-inner dark:bg-[#0B1E2D]/70 dark:border-sky-400/15 dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
                  {/* Baseline for zero-hour days */}
                  {!hasHours && (
                    <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-sky-500/15" />
                  )}

                  {/* Active Data Bar */}
                  {hasHours && (
                    <div
                      className={`w-full rounded-full transition-all duration-500 ${
                        day.isToday
                          ? 'bg-gradient-to-t from-sky-500 to-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                          : 'bg-gradient-to-t from-sky-600/70 to-cyan-400/70'
                      }`}
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
                        ? 'text-sky-600 dark:text-sky-400 underline decoration-2 underline-offset-4'
                        : 'text-slate-600 dark:text-sky-200/70'
                    }`}
                  >
                    {day.dayName}
                  </span>
                  {day.isToday && (
                    <span className="text-[9px] font-extrabold uppercase text-sky-600 dark:text-sky-400">
                      Today
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalWeekHours === 0 && (
          <div className="text-center pt-2 pb-1 text-xs font-medium text-slate-500 dark:text-sky-200/60">
            No study sessions logged for this week yet.
          </div>
        )}
      </div>

      {/* 3 Metric Chips (Cols 9–12) */}
      <div className="lg:col-span-4 grid grid-cols-1 gap-3">
        {/* Topics Mastered */}
        <div className={`rounded-2xl p-3.5 sm:p-4 flex items-center justify-between ${cardTheme}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-sky-50 text-sky-600 border border-sky-200/70 dark:bg-sky-500/15 dark:border-sky-400/25 dark:text-sky-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-sky-200/70">
                Topics Mastered
              </div>
              <div className="text-lg font-black mt-0.5 text-slate-900 dark:text-white">
                {topicsMastered} Units
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/70 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-400/25">
            Retained
          </span>
        </div>

        {/* Reviews Due */}
        <div className={`rounded-2xl p-3.5 sm:p-4 flex items-center justify-between ${cardTheme}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600 border border-amber-200/60 dark:bg-amber-500/15 dark:border-amber-500/25 dark:text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-sky-200/70">
                Reviews Due
              </div>
              <div className="text-lg font-black mt-0.5 text-slate-900 dark:text-white">
                {reviewsDue} Pending
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25">
            Spaced Queue
          </span>
        </div>

        {/* Day Streak */}
        <div className={`rounded-2xl p-3.5 sm:p-4 flex items-center justify-between ${cardTheme}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-rose-50 text-rose-600 border border-rose-200/60 dark:bg-rose-500/15 dark:border-rose-500/25 dark:text-rose-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-sky-200/70">
                Study Streak
              </div>
              <div className="text-lg font-black mt-0.5 text-slate-900 dark:text-white">
                {dayStreak} {dayStreak === 1 ? 'Day' : 'Days'}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/25">
            {dayStreak > 0 ? 'Active 🔥' : 'Start Today'}
          </span>
        </div>
      </div>
    </div>
  );
}
