import { useState } from 'react';
import { Clock, BookMarked, RotateCcw, CheckCircle2, Flame, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import type { ScheduleEntryOut, CheckInRequest, CheckInResponse } from '@/types';

interface ClayStudyCardProps {
  task: ScheduleEntryOut;
  onCheckInSuccess?: (unitId: string, rating: number, response: CheckInResponse) => void;
}

const RATING_LABELS: Record<number, { label: string; desc: string; color: string }> = {
  1: { label: '1', desc: 'Forgot / Hard', color: 'hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300' },
  2: { label: '2', desc: 'Hesitant', color: 'hover:bg-amber-100 hover:text-amber-700 hover:border-amber-300' },
  3: { label: '3', desc: 'Fair Recall', color: 'hover:bg-yellow-100 hover:text-yellow-700 hover:border-yellow-300' },
  4: { label: '4', desc: 'Good', color: 'hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-300' },
  5: { label: '5', desc: 'Mastered', color: 'hover:bg-indigo-100 hover:text-indigo-700 hover:border-indigo-300' },
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
      className={`rounded-3xl bg-[#f0f4f9] border border-white/80 shadow-clay-card hover:shadow-clay-hover transition-all duration-300 p-5 sm:p-6 relative flex flex-col justify-between group ${
        isCompleted ? 'bg-gradient-to-br from-[#f0f4f9] to-emerald-50/40 border-emerald-200/50' : ''
      }`}
    >
      {/* Top Meta Row */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Subject pill */}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/70 text-slate-700 shadow-clay-pill border border-white/90">
              {task.subject_name || 'Syllabus Task'}
            </span>

            {/* Phase pill (UT1 / UT2) */}
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full shadow-clay-pill border border-white/90 ${
                phase === 'UT2'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {phase}
            </span>

            {/* Review pill */}
            {task.is_review && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 shadow-clay-pill border border-white/90 flex items-center gap-1 animate-pulse">
                <RotateCcw className="w-3 h-3" />
                Spaced Review
              </span>
            )}
          </div>

          {/* Status badge */}
          {isCompleted && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 shadow-clay-pill border border-white/90 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </span>
          )}
        </div>

        {/* Topic Title */}
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-900 transition-colors leading-snug">
          {topicName}
        </h3>

        {/* Subtopic description if present */}
        {task.subtopic_name && task.subtopic_name !== topicName && (
          <p className="text-xs font-medium text-slate-600 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Subtopic: {task.subtopic_name}</span>
          </p>
        )}

        {/* Module Name */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 font-medium">
          <BookMarked className="w-3.5 h-3.5 text-slate-400" />
          <span className="truncate">{moduleName}</span>
        </div>

        {/* Stats Row: Hours + Difficulty */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>{hours} {hours === 1 ? 'hour' : 'hours'}</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <Flame
              className={`w-3.5 h-3.5 ${
                difficulty >= 4
                  ? 'text-rose-500'
                  : difficulty >= 3
                  ? 'text-amber-500'
                  : 'text-emerald-500'
              }`}
            />
            <span>Difficulty {difficulty}/5</span>
          </div>
        </div>
      </div>

      {/* Interactive 1–5 Rating Bar */}
      <div className="mt-5 pt-4 border-t border-slate-200/70">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            {isCompleted ? 'Completion Logged' : 'Rate Confidence to Check In:'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {hoverRating ? RATING_LABELS[hoverRating]?.desc : (selectedRating ? RATING_LABELS[selectedRating]?.desc : (isCompleted ? 'Marked Done' : '1 (Forgot) to 5 (Mastered)'))}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((rating) => {
            const isSelected = selectedRating === rating;
            const ratingStyle = RATING_LABELS[rating];

            return (
              <button
                key={rating}
                type="button"
                onClick={() => handleRate(rating)}
                onMouseEnter={() => setHoverRating(rating)}
                onMouseLeave={() => setHoverRating(null)}
                disabled={isSubmitting}
                title={ratingStyle.desc}
                className={`py-2 px-1 rounded-2xl text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-clay-pressed scale-95'
                    : isCompleted
                    ? 'bg-white/40 text-slate-400 border-white/60 cursor-default'
                    : `bg-white/80 text-slate-700 border-white/80 shadow-clay-pill hover:shadow-clay-hover active:shadow-clay-pressed active:scale-95 ${ratingStyle.color}`
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
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

