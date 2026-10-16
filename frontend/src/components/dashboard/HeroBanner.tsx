import type { ExamCountdownItem } from '@/types';
import heroCloud from '@/assets/hero-cloud.png';

interface HeroBannerProps {
  displayName?: string;
  upcomingExam?: ExamCountdownItem | null;
}

export function HeroBanner({ displayName, upcomingExam }: HeroBannerProps) {
  void displayName;
  void upcomingExam;

  return (
    <div className="relative w-full flex flex-col md:flex-row items-center justify-between py-4 min-h-[190px] overflow-visible">
      {/* Left: Headline & Subtitle */}
      <div className="relative z-10 max-w-lg">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Your learning, in flow.
        </h1>
        <p className="text-base text-slate-600 dark:text-sky-200/75 mt-2">
          A calmer way to make steady progress every day.
        </p>
      </div>

      {/* Right: 3D Study Graphic with Angled Note */}
      <div className="relative flex items-center justify-center shrink-0 overflow-visible mt-4 md:mt-0">
        <span className="text-sky-600 dark:text-sky-400 -rotate-6 mr-3 select-none text-xs font-semibold whitespace-nowrap hidden lg:inline-block">
          Progress today brighter tomorrow ➔
        </span>
        <img
          src={heroCloud}
          alt="Alpine Study Haven"
          className="w-72 md:w-96 lg:w-[420px] object-contain pointer-events-none select-none drop-shadow-[0_20px_35px_rgba(56,189,248,0.22)] animate-float-slow"
        />
      </div>
    </div>
  );
}
