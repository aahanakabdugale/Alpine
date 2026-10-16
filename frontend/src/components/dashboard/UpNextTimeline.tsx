import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  BookMarked,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Flame,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import type { ScheduleEntryOut, CheckInRequest, CheckInResponse } from '@/types';

interface UpNextTimelineProps {
  tasks: ScheduleEntryOut[];
  onCheckInSuccess: () => void;
}

const cardTheme = "transition-all duration-300 bg-white/85 text-slate-800 border border-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.06)] backdrop-blur-md dark:bg-[#06201c]/80 dark:text-emerald-50 dark:border-emerald-500/15 dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] dark:backdrop-blur-md";

export function UpNextTimeline({ tasks, onCheckInSuccess }: UpNextTimelineProps) {
  const [activeCheckInTaskId, setActiveCheckInTaskId] = useState<string | null>(null);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [optimisticDoneIds, setOptimisticDoneIds] = useState<Set<string>>(new Set());

  const nextPendingIndex = tasks.findIndex(
    (t) => t.status !== 'done' && !optimisticDoneIds.has(t.id)
  );

  const handleRate = async (task: ScheduleEntryOut, rating: number) => {
    if (submittingTaskId) return;
    setSubmittingTaskId(task.id);

    // Optimistic UI update: instantly close popover and mark task completed
    setOptimisticDoneIds((prev) => new Set(prev).add(task.id));
    setActiveCheckInTaskId(null);

    const unitId = task.subtopic_id ? `subtopic:${task.subtopic_id}` : `topic:${task.topic_id}`;
    const payload: CheckInRequest = {
      unit_id: unitId,
      status: 'done',
      confidence_rating: rating,
    };

    try {
      const response = await apiClient.post<CheckInResponse>('/schedule/check-in', payload);
      toast.success('Study session checked in!', {
        description: `Confidence: ${rating}/5 • Adapted ${response.data.recalculated_units_count} remaining units`,
      });
      onCheckInSuccess();
      window.dispatchEvent(new CustomEvent('alpine:schedule-updated'));
    } catch (err: unknown) {
      // Revert optimistic update on error
      setOptimisticDoneIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      console.error('Check-in error:', err);
      toast.error('Failed to log check-in', {
        description: err instanceof Error ? err.message : 'Please check connection',
      });
    } finally {
      setSubmittingTaskId(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className={`rounded-3xl p-6 text-center ${cardTheme}`}>
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 dark:text-[#35E0BE]" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">No tasks remaining for today</h3>
        <p className="text-xs mt-1 text-slate-600 dark:text-emerald-200/80">
          You are completely caught up with your study horizon for today.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl p-6 space-y-4 ${cardTheme}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
            Up Next Today
          </h3>
          <p className="text-xs mt-0.5 text-slate-600 dark:text-emerald-200/80">
            Sequential study path prioritized by syllabus prerequisites.
          </p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-[#35E0BE] dark:border-emerald-500/20">
          {tasks.length} {tasks.length === 1 ? 'Unit' : 'Units'}
        </span>
      </div>

      {/* Sequential Vertical Timeline */}
      <div className="relative pl-6 space-y-4">
        {/* Line connecting nodes */}
        <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-slate-200 dark:bg-emerald-500/15" />

        {tasks.map((task, index) => {
          const isDone = task.status === 'done' || optimisticDoneIds.has(task.id);
          const isCurrent = index === nextPendingIndex;
          const isExpanded = activeCheckInTaskId === task.id;
          const hours = task.est_hours ?? 1.0;
          const isSubmitting = submittingTaskId === task.id;

          return (
            <div key={task.id} className="relative group">
              {/* Timeline Node Dot */}
              <div
                className={`absolute -left-6 top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isDone
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isCurrent
                    ? 'ring-4 ring-emerald-400/25 scale-125 shadow-sm bg-gradient-to-r from-emerald-400 to-teal-400 border-teal-300 text-slate-950 font-black'
                    : 'bg-white border-slate-300 text-slate-400 dark:bg-[#06201c] dark:border-emerald-500/20 dark:text-emerald-200/60'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                ) : (
                  <span className="text-[9px] font-black">{index + 1}</span>
                )}
              </div>

              {/* Task Row Card */}
              <div
                className={`rounded-2xl p-4 transition-all duration-200 ${
                  isCurrent
                    ? 'bg-emerald-50/80 border border-emerald-300/80 shadow-sm dark:bg-emerald-500/10 dark:border-emerald-500/25 dark:shadow-[0_0_20px_rgba(45,212,191,0.08)]'
                    : isDone
                    ? 'bg-slate-50/60 border border-slate-200/50 opacity-60 dark:bg-[#06201c]/30 dark:border-emerald-500/10'
                    : 'bg-white/70 border border-slate-200/60 hover:bg-white dark:bg-[#06201c]/50 dark:border-emerald-500/10 dark:hover:bg-[#06201c]/70'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    {/* Tags row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status Tag */}
                      <span
                        className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${
                          isCurrent
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black shadow-sm'
                            : isDone
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-emerald-500/10 dark:text-emerald-200/60'
                        }`}
                      >
                        {isCurrent ? 'Current' : isDone ? 'Completed' : 'Planned'}
                      </span>

                      {/* Subject Name */}
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-emerald-200/70">
                        {task.subject_name || 'Subject'}
                      </span>

                      {/* Spaced Review Tag */}
                      {task.is_review && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25 flex items-center gap-1">
                          <RotateCcw className="w-2.5 h-2.5" />
                          Spaced Review
                        </span>
                      )}
                    </div>

                    {/* Topic Title */}
                    <div className="text-sm font-bold leading-snug text-slate-800 dark:text-white">
                      {task.topic_name || task.title}
                    </div>

                    {/* Module info row */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-emerald-200/60">
                      {task.module_name && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <BookMarked className="w-3 h-3 text-emerald-600 dark:text-teal-400" />
                          {task.module_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-emerald-600 dark:text-teal-400" />
                        {hours}h
                      </span>
                      {task.est_difficulty && (
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-500" />
                          {task.est_difficulty}/5
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action / Check In Trigger */}
                  <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
                    {!isDone && (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveCheckInTaskId((prev) => (prev === task.id ? null : task.id))
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isCurrent
                            ? 'btn-glow'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-[#A0F3DF] dark:border-emerald-500/15'
                        }`}
                      >
                        <span>{isExpanded ? 'Cancel' : isCurrent ? 'Continue' : 'Start'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Confidence Rating */}
                <AnimatePresence>
                  {isExpanded && !isDone && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-emerald-500/15">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-bold flex items-center gap-1 text-slate-800 dark:text-white">
                            <Sparkles className="w-3 h-3 text-emerald-600 dark:text-teal-400" />
                            Select Recall Confidence:
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-emerald-200/60">
                            1 (Hard) to 5 (Mastered)
                          </span>
                        </div>

                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleRate(task, rating)}
                              className="py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/60 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-[#A0F3DF] dark:border-emerald-500/15"
                            >
                              {isSubmitting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <span>★ {rating}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
