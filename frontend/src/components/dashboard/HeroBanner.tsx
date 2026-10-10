import { Sparkles, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ExamCountdownItem } from '@/types';

interface HeroBannerProps {
  displayName: string;
  upcomingExam?: ExamCountdownItem | null;
}

export function HeroBanner({ displayName, upcomingExam }: HeroBannerProps) {
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="relative overflow-hidden rounded-3xl bg-surface border border-border shadow-clay-card dark:shadow-clay-dark-card p-6 sm:p-8 transition-all duration-300">
      {/* Soft Ambient SVG / CSS Gradients */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-primary/15 via-accent/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-gradient-to-tr from-surface-soft via-primary/5 to-transparent blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          {/* Badge & Date */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-soft text-primary border border-border shadow-clay-pill dark:shadow-clay-dark-pill">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Welcome back, {displayName}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted">
              <Calendar className="w-3.5 h-3.5" />
              <span>{todayFormatted}</span>
            </span>
          </div>

          {/* Main Slogan Headlines */}
          <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight font-sans">
            Your learning, in flow.
          </h1>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            A calmer way to make progress every day. Alpine balances your university exam milestones with spaced retrieval practice.
          </p>
        </div>

        {/* Milestone Callout or Direct Action */}
        <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-3">
          {upcomingExam && (
            <div className="rounded-2xl p-4 bg-surface-soft border border-border shadow-clay-pill dark:shadow-clay-dark-pill">
              <div className="flex items-center justify-between gap-3 text-xs mb-1">
                <span className="font-extrabold uppercase tracking-wider text-text-muted">
                  Next Milestone Gateway
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-status-milestone/10 text-status-milestone">
                  {upcomingExam.exam_type}
                </span>
              </div>
              <div className="font-bold text-sm text-text-primary truncate max-w-[220px]">
                {upcomingExam.subject_name}
              </div>
              <div className="text-xs text-text-secondary font-medium mt-0.5">
                Target Date: <span className="font-bold text-text-primary">{upcomingExam.exam_date}</span> ({upcomingExam.days_remaining}d left)
              </div>
            </div>
          )}

          <Link
            to="/schedule"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-surface-soft hover:bg-surface-hover text-text-primary border border-border shadow-clay-pill dark:shadow-clay-dark-pill text-xs font-bold transition-all group"
          >
            <span>Explore Full Schedule Horizon</span>
            <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

