import { useState } from 'react';
import {
  Clock,
  BookMarked,
  RotateCcw,
  CheckCircle2,
  Flame,
  Sparkles,
  Play,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import type { ScheduleEntryOut, CheckInRequest, CheckInResponse } from '@/types';

interface TodayFocusCardProps {
  task: ScheduleEntryOut | null;
  onCheckInSuccess: () => void;
}

export function TodayFocusCard({ task, onCheckInSuccess }: TodayFocusCardProps) {
  const [showRatingBar, setShowRatingBar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!task) {
    return (
      <div className="rounded-3xl bg-surface border border-border shadow-clay-card dark:shadow-clay-dark-card p-6 sm:p-7 flex flex-col justify-between h-full text-center space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-text-primary">
            Today's Focus
          </h2>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-surface-soft text-primary">
            Standby
          </span>
        </div>
        <div className="my-auto py-8">
          <div className="w-14 h-14 rounded-3xl bg-surface-soft text-primary flex items-center justify-center mx-auto mb-3 shadow-clay-pill dark:shadow-clay-dark-pill">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-text-primary">All Caught Up!</h3>
          <p className="text-xs text-text-secondary max-w-xs mx-auto mt-1">
            No pending study units remaining for today. Great job staying ahead of your academic horizon.
          </p>
        </div>
      </div>
    );
  }

  const topicName = task.topic_name || task.title;
  const moduleName = task.module_name || 'Curriculum Module';
  const phase = task.assessment_phase || 'UT1';
  const hours = task.est_hours ?? 1.0;
  const difficulty = task.est_difficulty ?? 3;

  const handleRate = async (rating: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const unitId = task.subtopic_id ? `subtopic:${task.subtopic_id}` : `topic:${task.topic_id}`;
    const payload: CheckInRequest = {
      unit_id: unitId,
      status: 'done',
      confidence_rating: rating,
    };

    try {
      const response = await apiClient.post<CheckInResponse>('/schedule/check-in', payload);
      toast.success('Study session checked in!', {
        description: `Confidence: ${rating}/5 • Stability: ${response.data.stability_days.toFixed(1)} days`,
      });
      setShowRatingBar(false);
      onCheckInSuccess();
    } catch (err: unknown) {
      console.error('Check-in error:', err);
      toast.error('Failed to log check-in', {
        description: err instanceof Error ? err.message : 'Please check connection',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl bg-surface border border-border shadow-clay-card dark:shadow-clay-dark-card p-6 sm:p-7 flex flex-col justify-between h-full space-y-5 transition-all">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-text-muted">
              Next Priority Unit
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* UT Phase pill */}
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-surface-soft dark:bg-surface text-primary border border-border shadow-sm">
              {phase}
            </span>

            {/* Review pill */}
            {task.is_review && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-status-fading/15 text-status-fading border border-status-fading/30 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                Review
              </span>
            )}
          </div>
        </div>

        {/* Module Label */}
        <div className="flex items-center gap-1.5 text-xs text-text-secondary font-semibold mb-1 flex-wrap">
          <BookMarked className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            {task.subject_name ? `${task.subject_name} • ` : ''}
            {moduleName}
          </span>
        </div>

        {/* Topic Title - Clean wrapping without clipping */}
        <h3 className="text-xl sm:text-2xl font-black text-text-primary leading-tight mt-1 break-words">
          {topicName}
        </h3>

        {/* Subtopic name if present */}
        {task.subtopic_name && task.subtopic_name !== topicName && (
          <p className="text-xs text-text-secondary mt-1">
            Unit: <span className="font-semibold text-text-primary">{task.subtopic_name}</span>
          </p>
        )}

        {/* Compact Taxonomy / Pill Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-soft dark:bg-surface text-xs font-semibold text-text-primary border border-border/70">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{hours} {hours === 1 ? 'Hour' : 'Hours'}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-soft dark:bg-surface text-xs font-semibold text-text-primary border border-border/70">
            <Flame
              className={`w-3.5 h-3.5 ${
                difficulty >= 4
                  ? 'text-status-danger'
                  : difficulty >= 3
                  ? 'text-status-fading'
                  : 'text-status-fresh'
              }`}
            />
            <span>Difficulty {difficulty}/5</span>
          </span>
        </div>
      </div>

      {/* Action / Study Session Trigger */}
      <div className="pt-2 border-t border-border">
        {!showRatingBar ? (
          <button
            type="button"
            onClick={() => setShowRatingBar(true)}
            className="w-full px-6 py-3 rounded-full bg-[#12BFA5] text-white shadow-md hover:bg-[#0DAE96] dark:bg-[#35E0BE] dark:text-[#071F1C] font-semibold dark:hover:bg-[#5EEAD4] dark:shadow-clay-dark-btn active:scale-[0.98] text-sm transition-all flex items-center justify-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
            <span>Start Study Session</span>
          </button>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Rate Recall to Complete:
                </span>
                <button
                  type="button"
                  onClick={() => setShowRatingBar(false)}
                  className="text-text-muted hover:text-text-primary text-[11px] font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleRate(rating)}
                    className="py-2.5 rounded-xl text-xs font-bold bg-surface hover:bg-surface-soft border border-border/80 text-text-primary hover:text-primary transition-all flex flex-col items-center justify-center shadow-clay-pill dark:shadow-clay-dark-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span className="text-sm font-black">{rating}</span>
                        <span className="text-[9px] text-text-muted font-normal">
                          {rating === 1 ? 'Hard' : rating === 5 ? 'Master' : `★${rating}`}
                        </span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

