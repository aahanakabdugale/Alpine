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
    <div className="rounded-3xl p-6 sm:p-7 flex flex-col justify-between h-full space-y-6 transition-all duration-300 bg-white/85 text-slate-800 border border-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.06)] backdrop-blur-md dark:bg-[#06201c]/80 dark:text-emerald-50 dark:border-emerald-500/15 dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] dark:backdrop-blur-md">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
            Daily Study Progress
          </h2>
          <p className="text-xs mt-0.5 text-slate-600 dark:text-emerald-200/80">
            Your daily targets tailored to your exam dates.
          </p>
        </div>

        {/* Streak Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-[#A0F3DF] dark:border-emerald-500/20">
          <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
          <span>{dayStreak} Day Streak</span>
        </div>
      </div>

      {/* Main Gauge & Metrics */}
      <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 my-auto">
        {/* SVG Circular Progress Gauge */}
        <div className="relative flex items-center justify-center p-2.5 rounded-full shrink-0 bg-slate-100/70 border border-slate-200/60 shadow-inner dark:bg-[#031210]/60 dark:border-emerald-500/15 dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
          <CircularProgressGauge percentage={completionPercentage} size={136} strokeWidth={11} />
        </div>

        {/* Metric Details */}
        <div className="space-y-3.5 flex-1 min-w-0 text-center sm:text-left">
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
              {completedTasks} of {totalTasks} Tasks
            </div>
            <div className="text-xs font-bold mt-0.5 text-slate-600 dark:text-emerald-200/80">
              {isAllDone
                ? 'All scheduled units completed today!'
                : `${totalTasks - completedTasks} study units remaining today`}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 dark:text-emerald-200/60">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
              <span>{scheduledHours.toFixed(1)}h planned</span>
            </span>
            <span>•</span>
            <span className="font-medium">
              {availableHours.toFixed(1)}h daily target
            </span>
          </div>

          {/* Linear sub-progress bar */}
          <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 border border-slate-200/60 dark:bg-[#031210]/60 dark:border-emerald-500/15">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.4)]"
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
          className="btn-glow w-full px-6 py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 active:scale-[0.98]"
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
