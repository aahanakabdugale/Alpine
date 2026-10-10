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
    <div className="rounded-3xl bg-surface border border-border shadow-clay-card dark:shadow-clay-dark-card p-6 sm:p-7 flex flex-col justify-between h-full space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-text-primary">
            Daily Study Progress
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Calibrated daily pacing towards exam mastery.
          </p>
        </div>

        {/* Streak Pill - Secondary */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-soft border border-border/70 text-xs font-semibold text-text-secondary">
          <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
          <span>{dayStreak} Day Streak</span>
        </div>
      </div>

      {/* Main Gauge & Metrics Content */}
      <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 my-auto">
        {/* SVG Circular Progress Gauge - Framed in tactile recessed well */}
        <div className="relative flex items-center justify-center p-2.5 rounded-full bg-surface-inset border border-border/70 shadow-clay-inset dark:shadow-clay-dark-inset shrink-0">
          <CircularProgressGauge percentage={completionPercentage} size={136} strokeWidth={11} />
        </div>

        {/* Metric Details */}
        <div className="space-y-3.5 flex-1 min-w-0 text-center sm:text-left">
          <div>
            <div className="text-2xl font-black text-text-primary tracking-tight">
              {completedTasks} of {totalTasks} Tasks
            </div>
            <div className="text-xs font-bold text-text-secondary mt-0.5">
              {isAllDone
                ? 'All scheduled units completed today!'
                : `${totalTasks - completedTasks} study units remaining today`}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>{scheduledHours.toFixed(1)}h planned</span>
            </span>
            <span>•</span>
            <span className="font-medium">
              {availableHours.toFixed(1)}h daily budget
            </span>
          </div>

          {/* Recessed Linear Sub-Progress Indicator */}
          <div className="w-full bg-surface-inset h-2 rounded-full overflow-hidden shadow-clay-inset dark:shadow-clay-dark-inset">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Prominent Primary Button */}
      <div>
        <button
          type="button"
          onClick={onContinueStudying}
          className="w-full px-6 py-3 rounded-full bg-[#12BFA5] text-white shadow-md hover:bg-[#0DAE96] dark:bg-[#35E0BE] dark:text-[#071F1C] font-semibold dark:hover:bg-[#5EEAD4] dark:shadow-clay-dark-btn active:scale-[0.98] text-sm transition-all flex items-center justify-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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

