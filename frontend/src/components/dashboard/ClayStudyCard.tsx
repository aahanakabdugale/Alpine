import { useState } from 'react';
import { Clock, BookMarked, RotateCcw, CheckCircle2, Flame, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import type { ScheduleEntryOut, CheckInRequest, CheckInResponse } from '@/types';

interface ClayStudyCardProps {
  task: ScheduleEntryOut;
  onCheckInSuccess?: (unitId: string, rating: number, response: CheckInResponse) => void;
}

const RATING_LABELS: Record<number, { label: string; desc: string }> = {
  1: { label: '1', desc: 'Forgot / Hard' },
  2: { label: '2', desc: 'Hesitant' },
  3: { label: '3', desc: 'Fair Recall' },
  4: { label: '4', desc: 'Good' },
  5: { label: '5', desc: 'Mastered' },
};

const cardTheme = "transition-all duration-300 bg-white/85 text-slate-800 border border-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.06)] backdrop-blur-md dark:bg-[#06201c]/80 dark:text-emerald-50 dark:border-emerald-500/15 dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] dark:backdrop-blur-md";

export function ClayStudyCard({ task, onCheckInSuccess }: ClayStudyCardProps) {
  const isDoneInitially = task.status === 'done';
  const [isCompleted, setIsCompleted] = useState<boolean>(isDoneInitially);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const unitId = task.subtopic_id ? `subtopic:${task.subtopic_id}` : `topic:${task.topic_id}`;
  const topicName = task.topic_name || task.title;
  const moduleName = task.module_name || 'Core Module';
  const phase = task.assessment_phase || 'UT1';
  const hours = task.est_hours !== null && task.est_hours !== undefined ? task.est_hours : 1.0;
  const difficulty = task.est_difficulty ?? 3;

  const handleRate = async (rating: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSelectedRating(rating);
    setIsCompleted(true); // Optimistic immediate completion

    const payload: CheckInRequest = {
      unit_id: unitId,
      status: 'done',
      confidence_rating: rating,
    };

    try {
      const response = await apiClient.post<CheckInResponse>('/schedule/check-in', payload);
      const data = response.data;

      toast.success('Study session checked in!', {
        description: `Confidence: ${rating}/5 • Stability: ${data.stability_days.toFixed(1)} days • Adapted ${data.recalculated_units_count} remaining units`,
      });

      if (onCheckInSuccess) {
        onCheckInSuccess(unitId, rating, data);
      }
    } catch (err: unknown) {
      console.error('Check-in error:', err);
      setIsCompleted(false); // Rollback on failure
      setSelectedRating(null);
      toast.error('Failed to log check-in', {
        description: err instanceof Error ? err.message : 'Please check backend connectivity',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 relative flex flex-col justify-between group ${cardTheme} ${
        isCompleted ? 'border-emerald-200 dark:border-emerald-500/25' : ''
      }`}
    >
      {/* Top Meta Row */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Subject pill */}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-[#A0F3DF] dark:border-emerald-500/15">
              {task.subject_name || 'Syllabus Task'}
            </span>

            {/* Phase pill */}
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/15 dark:text-teal-300 dark:border-emerald-500/20">
              {phase}
            </span>

            {/* Review pill */}
            {task.is_review && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25 flex items-center gap-1 animate-pulse">
                <RotateCcw className="w-3 h-3" />
                Spaced Review
              </span>
            )}
          </div>

          {/* Completed badge */}
          <AnimatePresence>
            {isCompleted && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.15, 1], opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 450, damping: 16 }}
                className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Topic Title */}
        <h3 className="text-lg font-bold leading-snug text-slate-800 dark:text-white">
          {topicName}
        </h3>

        {/* Subtopic */}
        {task.subtopic_name && task.subtopic_name !== topicName && (
          <p className="text-xs font-medium mt-1 flex items-center gap-1.5 text-slate-600 dark:text-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-teal-400" />
            <span>Subtopic: {task.subtopic_name}</span>
          </p>
        )}

        {/* Module Name */}
        <div className="flex items-center gap-1.5 text-xs mt-2 font-medium text-slate-500 dark:text-emerald-200/60">
          <BookMarked className="w-3.5 h-3.5 opacity-70" />
          <span className="truncate">{moduleName}</span>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mt-3 pt-3 text-xs border-t border-slate-200/60 dark:border-emerald-500/10 text-slate-600 dark:text-emerald-200/70">
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
            <span>{hours} {hours === 1 ? 'hour' : 'hours'}</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
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
          </div>
        </div>
      </div>

      {/* Interactive 1–5 Rating Bar */}
      <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-emerald-500/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold flex items-center gap-1 text-slate-800 dark:text-white">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
            {isCompleted ? 'Completion Logged' : 'Rate Confidence to Check In:'}
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-emerald-200/70">
            {hoverRating
              ? RATING_LABELS[hoverRating]?.desc
              : selectedRating
              ? RATING_LABELS[selectedRating]?.desc
              : isCompleted
              ? 'Marked Done'
              : '1 (Forgot) to 5 (Mastered)'}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((rating) => {
            const isSelected = selectedRating === rating;

            return (
              <motion.button
                key={rating}
                type="button"
                onClick={() => handleRate(rating)}
                onMouseEnter={() => setHoverRating(rating)}
                onMouseLeave={() => setHoverRating(null)}
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.94 }}
                animate={isSelected ? { scale: [0.8, 1.15, 1] } : {}}
                transition={{ type: 'spring', stiffness: 450, damping: 16 }}
                disabled={isSubmitting}
                className={`py-2 px-1 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? 'btn-glow'
                    : isCompleted
                    ? 'bg-slate-100/50 text-slate-400 border border-slate-200/40 dark:bg-[#06201c]/40 dark:text-emerald-200/40 dark:border-emerald-500/10 cursor-default'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-[#A0F3DF] dark:border-emerald-500/15'
                }`}
              >
                {isSubmitting && isSelected ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span className="text-sm">{rating}</span>
                    <span className="text-[9px] font-normal hidden sm:inline opacity-75 truncate max-w-full">
                      {rating === 1 ? 'Hard' : rating === 5 ? 'Easy' : `★${rating}`}
                    </span>
                  </>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
