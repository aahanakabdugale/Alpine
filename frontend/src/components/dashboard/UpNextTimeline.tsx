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

export function UpNextTimeline({ tasks, onCheckInSuccess }: UpNextTimelineProps) {
  const [activeCheckInTaskId, setActiveCheckInTaskId] = useState<string | null>(null);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);

  // Find the first non-completed task index
  const nextPendingIndex = tasks.findIndex((t) => t.status !== 'done');

  const handleRate = async (task: ScheduleEntryOut, rating: number) => {
    if (submittingTaskId) return;
    setSubmittingTaskId(task.id);

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
      setActiveCheckInTaskId(null);
      onCheckInSuccess();
    } catch (err: unknown) {
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
      <div className="rounded-3xl bg-surface border border-border shadow-clay-card dark:shadow-clay-dark-card p-6 text-center">
        <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2 opacity-80" />
        <h3 className="text-sm font-bold text-text-primary">No tasks remaining for today</h3>
        <p className="text-xs text-text-secondary mt-1">
          You are completely caught up with your study horizon for today.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-surface border border-border shadow-clay-card dark:shadow-clay-dark-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-text-primary">
            Up Next Today
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Sequential study path prioritized by syllabus prerequisites.
          </p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-soft text-primary border border-border shadow-clay-pill dark:shadow-clay-dark-pill">
          {tasks.length} {tasks.length === 1 ? 'Unit' : 'Units'}
        </span>
      </div>

      {/* Sequential Vertical Timeline */}
      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
        {tasks.map((task, index) => {
          const isDone = task.status === 'done';
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
                    ? 'bg-status-fresh border-status-fresh text-white'
                    : isCurrent
                    ? 'bg-primary border-primary text-canvas ring-4 ring-primary/25 scale-125 shadow-sm'
                    : 'bg-surface border-border text-text-muted'
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
                    ? 'bg-surface-soft border border-primary/50 shadow-clay-pill dark:shadow-clay-dark-pill'
                    : isDone
                    ? 'bg-surface/30 border border-border/40 opacity-60 hover:opacity-100 shadow-none'
                    : 'bg-surface border border-border/60 hover:bg-surface-hover/50 hover:border-border shadow-none'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    {/* Tags row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status Tag */}
                      <span
                        className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${
                          isCurrent
                            ? 'bg-primary text-canvas border-primary font-black shadow-sm'
                            : isDone
                            ? 'bg-status-fresh/15 text-status-fresh border-status-fresh/30 font-bold'
                            : 'bg-surface-soft text-text-muted border-border font-semibold'
                        }`}
                      >
                        {isCurrent ? 'Current' : isDone ? 'Completed' : 'Planned'}
                      </span>

                      {/* Subject Name */}
                      <span className="text-[11px] font-semibold text-text-muted">
                        {task.subject_name || 'Subject'}
                      </span>

                      {/* Spaced Review Tag */}
                      {task.is_review && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-status-fading/15 text-status-fading border border-status-fading/30 flex items-center gap-1">
                          <RotateCcw className="w-2.5 h-2.5" />
                          Spaced Review
                        </span>
                      )}
                    </div>

                    {/* Topic Title */}
                    <div className="text-sm font-bold text-text-primary leading-snug">
                      {task.topic_name || task.title}
                    </div>

                    {/* Module info */}
                    <div className="flex items-center gap-3 text-[11px] text-text-muted">
                      {task.module_name && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <BookMarked className="w-3 h-3" />
                          {task.module_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-primary" />
                        {hours}h
                      </span>
                      {task.est_difficulty && (
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-status-fading" />
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
                            ? 'bg-primary hover:bg-primary-hover text-canvas shadow-clay-pill dark:shadow-clay-dark-pill'
                            : 'bg-surface-soft hover:bg-surface-hover text-text-primary border border-border'
                        }`}
                      >
                        <span>{isExpanded ? 'Cancel' : 'Check In'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline 1–5 Confidence Rating Dropdown */}
                <AnimatePresence>
                  {isExpanded && !isDone && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-bold text-text-primary flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-primary" />
                            Select Recall Confidence Rating:
                          </span>
                          <span className="text-[10px] text-text-muted">
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
                              className="py-2 px-1 rounded-xl text-xs font-bold bg-surface hover:bg-surface-soft border border-border text-text-primary hover:text-primary transition-all flex items-center justify-center shadow-sm hover:shadow-clay-pill"
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
