import { Link } from 'react-router-dom';
import { Mountain, Sparkles } from 'lucide-react';
import { ProfileSwitcher } from '@/components/layout/ProfileSwitcher';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export function Navbar() {
  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-border/60 shadow-sm transition-colors duration-300 h-16 flex items-center"
      style={{ backgroundColor: 'var(--canvas)' }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Alpine Brand */}
        <Link to="/dashboard" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-surface p-1 shadow-clay-pill dark:shadow-clay-dark-pill border border-border group-hover:shadow-clay-hover dark:group-hover:shadow-clay-dark-hover transition-all duration-200">
            <div className="w-full h-full bg-primary text-canvas rounded-xl flex items-center justify-center shadow-inner">
              <Mountain className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-text-primary font-sans">
              Alpine
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-surface-soft text-primary border border-border uppercase tracking-wider shadow-clay-pill dark:shadow-clay-dark-pill">
              <Sparkles className="w-2.5 h-2.5" />
              Adaptive AI
            </span>
          </div>
        </Link>

        {/* Right: Theme Toggle + Profile Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle />
          <ProfileSwitcher />
        </div>
      </div>
    </header>
  );
}
