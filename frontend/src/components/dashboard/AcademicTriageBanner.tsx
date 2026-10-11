import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowRight, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

interface AcademicTriageBannerProps {
  overrunUnitsCount: number;
  message?: string | null;
}

export function AcademicTriageBanner({
  overrunUnitsCount,
  message,
}: AcademicTriageBannerProps) {
  if (overrunUnitsCount <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6 shadow-clay-card dark:shadow-clay-dark-card backdrop-blur-md relative overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm animate-pulse">
            <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                <AlertTriangle className="w-3 h-3" />
                Academic Triage Active
              </span>
              <span className="text-xs font-bold text-amber-700/80 dark:text-amber-300/80">
                End-Semester Soft Slack Limit Reached
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-extrabold text-text-primary leading-snug">
              {overrunUnitsCount} syllabus {overrunUnitsCount === 1 ? 'unit has' : 'units have'} spilled past the End-Semester exam date!
            </h3>

            <p className="text-xs text-text-secondary max-w-2xl leading-relaxed">
              {message ||
                `At your current study pace, time has run out before the end semester. Alpine has triaged and prioritized high-difficulty units before your exam, but you must increase your daily study availability to finish the full syllabus on time.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <Link
            to="/schedule"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface-soft hover:bg-surface-hover border border-border text-xs font-bold text-text-primary shadow-clay-pill dark:shadow-clay-dark-pill transition-all"
          >
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>View Timeline</span>
          </Link>

          <Link
            to="/onboarding"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-canvas text-xs font-extrabold shadow-clay-pill dark:shadow-clay-dark-pill hover:shadow-clay-hover transition-all"
          >
            <span>Boost Hours</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
