import { CheckCircle2, Flame, ArrowRight, Clock } from 'lucide-react';
import { CircularProgressGauge } from '@/components/dashboard/CircularProgressGauge';

interface DailyProgressCardProps {
  completedTasks: number;
  totalTasks: number;
  scheduledHours: number;
  availableHours: number;
  dayStreak: number;
  onContinueStudying: () => void;
}

export function DailyProgressCard({
  completedTasks,
  totalTasks,
  scheduledHours,
  availableHours,
  dayStreak,
  onContinueStudying,
}: DailyProgressCardProps) {
  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isAllDone = totalTasks > 0 && completedTasks >= totalTasks;

  return (
    <div className="rounded-3xl p-6 sm:p-7 flex flex-col justify-between h-full space-y-6 transition-all duration-300 glass-card">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
            Daily Study Progress
          </h2>
          <p className="text-xs mt-0.5 text-slate-600 dark:text-sky-200/75">
            Your daily targets tailored to your exam dates.
          </p>
        </div>

        {/* Streak Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100/80 text-sky-800 border border-sky-200/60 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-500/20">
          <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
          <span>{dayStreak} Day Streak</span>
        </div>
      </div>

      {/* Main Gauge & Metrics */}
      <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 my-auto">
        {/* SVG Circular Progress Gauge */}
        <div className="relative flex items-center justify-center p-2.5 rounded-full shrink-0 bg-sky-50/70 border border-sky-200/60 shadow-inner dark:bg-[#07131D]/80 dark:border-sky-500/20 dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
          <CircularProgressGauge percentage={completionPercentage} size={136} strokeWidth={11} />
        </div>

        {/* Metric Details */}
        <div className="space-y-3.5 flex-1 min-w-0 text-center sm:text-left">
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {completedTasks} of {totalTasks} Tasks
            </div>
            <div className="text-xs font-bold mt-0.5 text-slate-600 dark:text-sky-200/75">
              {isAllDone
                ? 'All scheduled units completed today!'
                : `${totalTasks - completedTasks} study units remaining today`}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 dark:text-sky-200/70">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{scheduledHours.toFixed(1)}h planned</span>
            </span>
            <span>•</span>
            <span className="font-medium">
              {availableHours.toFixed(1)}h daily target
            </span>
          </div>

          {/* Linear sub-progress bar */}
          <div className="w-full h-2 rounded-full overflow-hidden bg-sky-50/70 border border-sky-200/60 dark:bg-[#07131D]/80 dark:border-sky-500/20">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-sky-400 to-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.4)]"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Glowing CTA Button */}
      <div>
        <button
          type="button"
          onClick={onContinueStudying}
          className="w-full px-6 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 active:scale-[0.98] bg-gradient-to-r from-sky-400 to-cyan-400 text-slate-950 shadow-[0_4px_14px_rgba(14,165,233,0.35)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.5)] transition-all"
        >
          {isAllDone ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>All Tasks Done • Review Schedule</span>
            </>
          ) : (
            <>
              <span>Continue Studying Next Unit</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
