import { useState, useEffect } from 'react';
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
  const [optimisticDone, setOptimisticDone] = useState(false);

  useEffect(() => {
    setOptimisticDone(false);
  }, [task?.id]);

  if (!task || optimisticDone) {
    return (
      <div className="rounded-3xl p-6 sm:p-7 flex flex-col justify-between h-full text-center space-y-4 transition-all duration-300 bg-white/85 text-slate-800 border border-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.06)] backdrop-blur-md dark:bg-[#06201c]/80 dark:text-emerald-50 dark:border-emerald-500/15 dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] dark:backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
            Today's Focus
          </h2>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/15 dark:text-teal-300 dark:border-emerald-500/20">
            {optimisticDone ? 'Checked In' : 'Standby'}
          </span>
        </div>
        <div className="my-auto py-8">
          <div className="w-14 h-14 rounded-3xl flex items-center justify-center mx-auto mb-3 bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-500/15 dark:text-teal-300 dark:border-emerald-500/20">
            <CheckCircle2 className="w-7 h-7 text-primary animate-bounce" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {optimisticDone ? 'Session Checked In!' : 'All Caught Up!'}
          </h3>
          <p className="text-xs max-w-xs mx-auto mt-1 text-slate-600 dark:text-emerald-200/80">
            {optimisticDone
              ? 'Great job! Your retention stability has been refreshed and schedule adapted.'
              : 'No pending study units remaining for today. Great job staying ahead of your academic horizon.'}
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
    setOptimisticDone(true);
    setShowRatingBar(false);

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
      onCheckInSuccess();
    } catch (err: unknown) {
      console.error('Check-in error:', err);
      setOptimisticDone(false);
      toast.error('Failed to log check-in', {
        description: err instanceof Error ? err.message : 'Please check connection',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl p-6 sm:p-7 flex flex-col justify-between h-full space-y-5 transition-all duration-300 bg-white/85 text-slate-800 border border-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.06)] backdrop-blur-md dark:bg-[#06201c]/80 dark:text-emerald-50 dark:border-emerald-500/15 dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] dark:backdrop-blur-md">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-ping bg-emerald-500 dark:bg-[#35E0BE]" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-emerald-300/80">
              Today's Focus
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* UT Phase pill */}
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/15 dark:text-teal-300 dark:border-emerald-500/20">
              {phase}
            </span>

            {/* Review pill */}
            {task.is_review && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                Review
              </span>
            )}
          </div>
        </div>

        {/* Module Label */}
        <div className="flex items-center gap-1.5 text-xs font-semibold mb-1 flex-wrap text-slate-500 dark:text-emerald-200/70">
          <BookMarked className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400 shrink-0" />
          <span>
            {task.subject_name ? `${task.subject_name} • ` : ''}
            {moduleName}
          </span>
        </div>

        {/* Topic Title */}
        <h3 className="text-xl sm:text-2xl font-black leading-tight mt-1 break-words text-slate-800 dark:text-white">
          {topicName}
        </h3>

        {task.subtopic_name && task.subtopic_name !== topicName && (
          <p className="text-xs mt-1 text-slate-600 dark:text-emerald-200/80">
            Unit: <span className="font-semibold text-slate-800 dark:text-white">{task.subtopic_name}</span>
          </p>
        )}

        {/* Metadata chips */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-[#A0F3DF] dark:border-emerald-500/15">
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
            <span>{hours} {hours === 1 ? 'Hour' : 'Hours'}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-[#A0F3DF] dark:border-emerald-500/15">
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
      <div className="pt-2 border-t border-slate-200/60 dark:border-emerald-500/15">
        {!showRatingBar ? (
          <button
            type="button"
            onClick={() => setShowRatingBar(true)}
            className="btn-glow w-full px-6 py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 active:scale-[0.98]"
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
                <span className="font-bold flex items-center gap-1 text-slate-800 dark:text-white">
                  <Sparkles className="w-3 h-3 text-emerald-600 dark:text-teal-400" />
                  Rate Recall to Complete:
                </span>
                <button
                  type="button"
                  onClick={() => setShowRatingBar(false)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-emerald-200/60 dark:hover:text-emerald-200"
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
                    className="py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-[#A0F3DF] dark:border-emerald-500/15"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span className="text-sm font-black">{rating}</span>
                        <span className="text-[9px] font-normal opacity-70">
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
