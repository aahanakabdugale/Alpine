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

const RATING_LABELS: Record<number, { label: string; desc: string; color: string }> = {
  1: { label: '1', desc: 'Forgot / Hard', color: 'hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-800 dark:hover:text-rose-200' },
  2: { label: '2', desc: 'Hesitant', color: 'hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-800 dark:hover:text-amber-200' },
  3: { label: '3', desc: 'Fair Recall', color: 'hover:bg-teal-100/60 dark:hover:bg-teal-900/40 hover:text-teal-800 dark:hover:text-teal-200' },
  4: { label: '4', desc: 'Good', color: 'hover:bg-emerald-100 dark:hover:bg-emerald-950/60 hover:text-emerald-800 dark:hover:text-emerald-200' },
  5: { label: '5', desc: 'Mastered', color: 'hover:bg-[#14BBA6]/20 dark:hover:bg-[#2DD4BF]/20 hover:text-teal-900 dark:hover:text-[#2DD4BF]' },
};

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

    const payload: CheckInRequest = {
      unit_id: unitId,
      status: 'done',
      confidence_rating: rating,
    };

    try {
      const response = await apiClient.post<CheckInResponse>('/schedule/check-in', payload);
      const data = response.data;
      setIsCompleted(true);

      toast.success('Study session checked in!', {
        description: `Confidence: ${rating}/5 • Stability: ${data.stability_days.toFixed(1)} days • Adapted ${data.recalculated_units_count} remaining units`,
      });

      if (onCheckInSuccess) {
        onCheckInSuccess(unitId, rating, data);
      }
    } catch (err: unknown) {
      console.error('Check-in error:', err);
      toast.error('Failed to log check-in', {
        description: err instanceof Error ? err.message : 'Please check backend connectivity',
      });
      setSelectedRating(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-3xl bg-[#E6FFED] dark:bg-[#123B35] shadow-clay-card dark:shadow-clay-dark-card border border-white/80 dark:border-teal-900/40 text-[#1F2937] dark:text-[#E6FFED] hover:shadow-clay-hover dark:hover:shadow-clay-dark-hover transition-all duration-300 p-5 sm:p-6 relative flex flex-col justify-between group ${
        isCompleted
          ? 'bg-gradient-to-br from-[#E6FFED] to-emerald-100/40 dark:from-[#123B35] dark:to-emerald-950/30 border-emerald-300/50 dark:border-emerald-800/40'
          : ''
      }`}
    >
      {/* Top Meta Row */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Subject pill */}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/80 dark:bg-[#16423C] text-teal-900 dark:text-[#E6FFED] shadow-clay-pill dark:shadow-clay-dark-pill border border-white/90 dark:border-teal-700/30">
              {task.subject_name || 'Syllabus Task'}
            </span>

            {/* Phase pill (UT1 / UT2) */}
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shadow-clay-pill dark:shadow-clay-dark-pill bg-teal-100/70 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200/50 dark:border-teal-800/40">
              {phase}
            </span>

            {/* Review pill */}
            {task.is_review && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100/70 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-200/50 dark:border-amber-800/40 shadow-clay-pill dark:shadow-clay-dark-pill flex items-center gap-1 animate-pulse">
                <RotateCcw className="w-3 h-3" />
                Spaced Review
              </span>
            )}
          </div>

          {/* Status badge with spring pop */}
          <AnimatePresence>
            {isCompleted && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.15, 1], opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 450, damping: 16 }}
                className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200/50 dark:border-emerald-800/40 shadow-clay-pill dark:shadow-clay-dark-pill flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Topic Title */}
        <h3 className="text-lg font-bold text-[#1F2937] dark:text-[#E6FFED] group-hover:text-teal-800 dark:group-hover:text-[#2DD4BF] transition-colors leading-snug">
          {topicName}
        </h3>

        {/* Subtopic description if present */}
        {task.subtopic_name && task.subtopic_name !== topicName && (
          <p className="text-xs font-medium text-teal-900/70 dark:text-[#99F6E4]/70 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#14BBA6] dark:bg-[#2DD4BF]" />
            <span>Subtopic: {task.subtopic_name}</span>
          </p>
        )}

        {/* Module Name */}
        <div className="flex items-center gap-1.5 text-xs text-teal-900/70 dark:text-[#99F6E4]/70 mt-2 font-medium">
          <BookMarked className="w-3.5 h-3.5 opacity-70" />
          <span className="truncate">{moduleName}</span>
        </div>

        {/* Stats Row: Hours + Difficulty */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-teal-900/10 dark:border-teal-900/30 text-xs text-teal-900/70 dark:text-[#99F6E4]/70">
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-[#14BBA6] dark:text-[#2DD4BF]" />
            <span>{hours} {hours === 1 ? 'hour' : 'hours'}</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <Flame
              className={`w-3.5 h-3.5 ${
                difficulty >= 4
                  ? 'text-rose-600 dark:text-rose-400'
                  : difficulty >= 3
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            />
            <span>Difficulty {difficulty}/5</span>
          </div>
        </div>
      </div>

      {/* Interactive 1–5 Rating Bar */}
      <div className="mt-5 pt-4 border-t border-teal-900/10 dark:border-teal-900/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#1F2937] dark:text-[#E6FFED] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#14BBA6] dark:text-[#2DD4BF]" />
            {isCompleted ? 'Completion Logged' : 'Rate Confidence to Check In:'}
          </span>
          <span className="text-[11px] text-teal-900/70 dark:text-[#99F6E4]/70 font-medium">
            {hoverRating ? RATING_LABELS[hoverRating]?.desc : (selectedRating ? RATING_LABELS[selectedRating]?.desc : (isCompleted ? 'Marked Done' : '1 (Forgot) to 5 (Mastered)'))}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((rating) => {
            const isSelected = selectedRating === rating;
            const ratingStyle = RATING_LABELS[rating];

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
                title={ratingStyle.desc}
                className={`py-2 px-1 rounded-2xl text-xs font-bold transition-colors duration-150 flex flex-col items-center justify-center border ${
                  isSelected
                    ? 'bg-[#14BBA6] dark:bg-[#2DD4BF] text-white dark:text-[#0E2A26] border-teal-600 dark:border-teal-500 shadow-clay-pressed dark:shadow-clay-dark-pressed scale-95'
                    : isCompleted
                    ? 'bg-white/40 dark:bg-white/5 text-teal-900/40 dark:text-teal-300/30 border-white/60 dark:border-teal-900/20 cursor-default'
                    : `bg-[#E6FFED] dark:bg-[#123B35] shadow-clay-pill dark:shadow-clay-dark-pill border border-white/80 dark:border-teal-700/30 text-[#1F2937] dark:text-[#E6FFED] hover:shadow-clay-hover dark:hover:shadow-clay-dark-hover active:shadow-clay-pressed dark:active:shadow-clay-dark-pressed ${ratingStyle.color}`
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
