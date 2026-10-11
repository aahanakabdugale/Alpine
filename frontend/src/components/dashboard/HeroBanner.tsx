import type { ExamCountdownItem } from '@/types';
import heroCloud from '@/assets/hero-cloud.png';

interface HeroBannerProps {
  displayName?: string;
  upcomingExam?: ExamCountdownItem | null;
}

export function HeroBanner({ displayName, upcomingExam }: HeroBannerProps) {
  void upcomingExam;

  return (
    <div className="relative w-full flex flex-col md:flex-row items-center justify-between gap-8 py-4 sm:py-6 overflow-visible min-h-[190px] -mb-6 md:-mb-10">
      {/* Left: Text */}
      <div className="relative z-10 max-w-lg">
        {displayName && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-primary/10 text-primary border border-primary/20 mb-3 shadow-sm">
            <span>Learner:</span>
            <span className="text-text-primary">{displayName}</span>
          </div>
        )}
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Your learning, in flow.
        </h1>
        <p className="text-slate-600 dark:text-emerald-200/75 text-base mt-2">
          A calmer way to make steady progress every day.
        </p>
      </div>

      {/* Right: Floating 3D study platform with angled note */}
      <div className="relative flex items-center justify-center shrink-0 overflow-visible">

        <img
          src={heroCloud}
          alt="Alpine Cloud"
          className="w-80 md:w-[420px] lg:w-[460px] object-contain pointer-events-none select-none animate-float-slow drop-shadow-[0_20px_35px_rgba(16,185,129,0.18)]"
        />
      </div>
    </div>
  );
}
